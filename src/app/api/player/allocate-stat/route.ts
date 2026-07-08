import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';

const STAT_FIELDS = ['strength', 'dexterity', 'vitality', 'intellect', 'willpower', 'instinct'] as const;
type StatField = typeof STAT_FIELDS[number];

const RACE_BASE_FIELD: Record<StatField, string> = {
  strength: 'baseStrength',
  dexterity: 'baseDexterity',
  vitality: 'baseVitality',
  intellect: 'baseIntellect',
  willpower: 'baseWillpower',
  instinct: 'baseInstinct',
};

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  try {
    const { stat } = await req.json();
    if (!STAT_FIELDS.includes(stat)) {
      return NextResponse.json({ error: 'Неверная характеристика' }, { status: 400 });
    }

    const player = await db.player.findUnique({ where: { telegramId }, include: { race: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (player.statPoints <= 0) return NextResponse.json({ error: 'Нет свободных очков' }, { status: 400 });

    // Фаза 1.2: не более 60% всех распределённых очков в одну характеристику
    const allocated = STAT_FIELDS.map(f => ({
      field: f,
      points: Math.max(0, player[f] - (player.race[RACE_BASE_FIELD[f] as keyof typeof player.race] as number)),
    }));
    const totalAllocated = allocated.reduce((sum, a) => sum + a.points, 0);
    const currentInStat = allocated.find(a => a.field === stat)!.points;

    // Проверяем долю ДО начисления нового очка: иначе самое первое вложенное
    // очко всегда даёт 100% и блокирует любое распределение с нуля.
    if (totalAllocated > 0 && currentInStat / totalAllocated >= 0.6) {
      return NextResponse.json({ error: 'Нельзя вложить более 60% очков в одну характеристику' }, { status: 400 });
    }

    // maxHp/maxMp считаются от Стойкости/Воли только один раз, при создании персонажа
    // (player/create/route.ts: maxHp = 50 + vitality*5, maxMp = 100 + willpower*2) — вложение
    // очка в эти статы должно давать тот же прирост пулов, иначе "выживаемость" через
    // распределение очков перестаёт работать, хотя сам стат продолжает считаться в бою.
    const updateData: Record<string, unknown> = {
      [stat as StatField]: { increment: 1 },
      statPoints: { decrement: 1 },
    };
    if (stat === 'vitality') {
      updateData.maxHp = { increment: 5 };
      updateData.hp = { increment: 5 };
    } else if (stat === 'willpower') {
      updateData.maxMp = { increment: 2 };
      updateData.mp = { increment: 2 };
    }

    const updated = await db.player.update({
      where: { telegramId },
      data: updateData,
      include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
    });

    return NextResponse.json({ message: `${stat} +1`, player: updated });
  } catch (error) {
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
