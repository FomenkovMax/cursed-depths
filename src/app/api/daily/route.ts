import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rollDice } from '@/lib/dice';
import { validateTelegramRequest } from '@/lib/auth';
import { addItemToInventory } from '@/lib/inventory-utils';
import { issueDailyQuests } from '@/lib/quests';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  try {
    const player = await db.player.findUnique({ where: { telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const today = new Date().toISOString().split('T')[0];
    if (player.lastDailyReward === today) {
      return NextResponse.json({ error: 'Вы уже получили ежедневную награду сегодня' }, { status: 400 });
    }

    const goldReward = rollDice('2d6') * player.level;
    const xpReward = 10 * player.level;

    // Левел-ап при пересечении порога XP — как в combat/action и quests/claim. Раньше это поле
    // просто инкрементировалось без проверки порога, и уровень/statPoints/maxHp не росли, пока
    // игрок не победит в бою хотя бы раз (комментарий "как в daily" в quests/claim был неверен).
    let newXp = player.xp + xpReward;
    let newLevel = player.level;
    let newXpToNext = player.xpToNext;
    let newStatPoints = player.statPoints;
    let leveledUp = false;
    while (newXp >= newXpToNext) {
      newXp -= newXpToNext;
      newLevel++;
      newXpToNext = newLevel * 100;
      newStatPoints += 2;
      leveledUp = true;
    }

    // Wrap gold/XP giving + potion giving + quest reset in a transaction
    const updated = await db.$transaction(async (tx) => {
      // Свежий набор ежедневных квестов на новый день (до итогового запроса с include: quests)
      await issueDailyQuests(tx, player.id, player.level);

      const updateData: Record<string, unknown> = {
        gold: { increment: goldReward },
        xp: newXp,
        lastDailyReward: today,
      };
      if (leveledUp) {
        updateData.level = newLevel;
        updateData.xpToNext = newXpToNext;
        updateData.statPoints = newStatPoints;
        const newMaxHp = player.maxHp + 10 * (newLevel - player.level);
        updateData.maxHp = newMaxHp;
        updateData.hp = newMaxHp; // Full heal on level up
      }

      const result = await tx.player.update({
        where: { telegramId },
        data: updateData,
        include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
      });

      // Give a health potion (stacks with existing)
      await addItemToInventory({
        playerId: player.id,
        itemId: 'health_potion',
        name: 'Зелье здоровья',
        type: 'consumable',
        rarity: 'common',
        stats: '{"healHp":15}',
        icon: '🧪',
        quantity: 1,
      }, tx);

      return result;
    });

    return NextResponse.json({
      message: `Ежедневная награда! +${goldReward} золота, +${xpReward} XP, Зелье здоровья!`,
      goldReward,
      xpReward,
      leveledUp,
      player: updated,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
