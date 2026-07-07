import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { issueDailyQuests } from '@/lib/quests';

export async function POST(req: NextRequest) {
  try {
    const auth = validateTelegramRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
    }
    const telegramId = auth.telegramId;

    const body = await req.json();
    const { name, race, className } = body;

    if (!name || !race || !className) {
      return NextResponse.json({ error: 'Укажите все обязательные поля' }, { status: 400 });
    }

    // Check if player already exists
    const existing = await db.player.findUnique({ where: { telegramId } });
    if (existing) {
      return NextResponse.json({ error: 'Персонаж уже существует' }, { status: 400 });
    }

    const raceData = await db.race.findUnique({ where: { slug: race } });
    const classData = await db.gameClass.findUnique({ where: { slug: className } });

    if (!raceData || !classData) {
      return NextResponse.json({ error: 'Неверная раса или класс' }, { status: 400 });
    }
    if (classData.raceId !== raceData.id) {
      return NextResponse.json({ error: 'Этот класс недоступен для выбранной расы' }, { status: 400 });
    }

    const strength = raceData.baseStrength;
    const dexterity = raceData.baseDexterity;
    const vitality = raceData.baseVitality;
    const intellect = raceData.baseIntellect;
    const willpower = raceData.baseWillpower;
    const instinct = raceData.baseInstinct;

    const maxHp = 50 + vitality * 5;
    const maxMp = 100 + willpower * 2;

    // Wrap player creation + starting inventory in a transaction
    const player = await db.$transaction(async (tx) => {
      const created = await tx.player.create({
        data: {
          telegramId,
          name,
          raceId: raceData.id,
          classId: classData.id,
          strength,
          dexterity,
          vitality,
          intellect,
          willpower,
          instinct,
          hp: maxHp,
          maxHp,
          mp: maxMp,
          maxMp,
        },
      });

      // Give starting items
      await tx.inventory.createMany({
        data: [
          { playerId: created.id, itemId: 'rusty_sword', name: 'Ржавый меч', type: 'weapon', rarity: 'common', equipped: true, slot: 'weapon', stats: '{"attack":2}', icon: '🗡️' },
          { playerId: created.id, itemId: 'leather_armor', name: 'Кожаная броня', type: 'armor', rarity: 'common', equipped: true, slot: 'chest', stats: '{"defense":2}', icon: '🦺' },
          { playerId: created.id, itemId: 'health_potion', name: 'Зелье здоровья', type: 'consumable', rarity: 'common', stats: '{"healHp":15}', icon: '🧪', quantity: 3 },
        ],
      });

      // Выдаём стартовый набор ежедневных квестов, чтобы вкладка "Квесты" не была пустой с первого входа
      await issueDailyQuests(tx, created.id, created.level);

      // Re-fetch player with inventory, quests, race and class included
      return tx.player.findUnique({
        where: { id: created.id },
        include: {
          inventory: true,
          quests: true,
          race: true,
          class: { include: { abilities: true } },
        },
      });
    });

    return NextResponse.json({ success: true, player });
  } catch (error) {
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
