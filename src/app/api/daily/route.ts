import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { rollDice } from '@/lib/dice';
import { validateTelegramRequest } from '@/lib/auth';
import { addItemToInventory } from '@/lib/economy/inventory-utils';
import { issueDailyQuests } from '@/lib/economy/quests';
import { isDeathDebuffActive, DEATH_DEBUFF_XP_MULT } from '@/lib/premium/premium-shop';
import { computeNextStreak, streakDayInCycle, STREAK_MULTIPLIERS, STREAK_CYCLE_LENGTH, shouldConsumeStreakFreeze, MAX_STREAK_FREEZES } from '@/lib/economy/daily-streak';

/** Брошено внутри транзакции, если ежедневная награда уже забрана СЕГОДНЯ В МОМЕНТ фактической
 * записи (см. комментарий у updateMany ниже) — напр. параллельный дубликат того же запроса. */
class AlreadyClaimedTodayError extends Error {
  constructor() { super('ALREADY_CLAIMED_TODAY'); }
}

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

    // Стрик за подряд идущие дни (аудит #2, топ-10 #2) — считается от снимка ДО транзакции, как
    // и lastDailyReward ниже: при гонке двух параллельных запросов обе ветки посчитают одно и то
    // же значение, но только одна реально запишется благодаря updateMany-guard в транзакции.
    // Заморозка (Wave 2A, п.46) — если пропущен ровно один день и есть запас, стрик растёт как
    // при обычном клейме "вчера", а не обнуляется.
    const freezeConsumed = shouldConsumeStreakFreeze(player.lastDailyReward, today, player.streakFreezeCount);
    const nextStreak = freezeConsumed
      ? player.dailyStreak + 1
      : computeNextStreak(player.lastDailyReward, player.dailyStreak, today);
    const streakDay = streakDayInCycle(nextStreak);
    const streakMult = STREAK_MULTIPLIERS[streakDay];
    // Одна новая заморозка за каждый завершённый 7-дневный цикл — не покупка, чистая награда за
    // лояльность, капается, чтобы не превращать механику в неограниченный иммунитет к пропускам.
    const earnsFreeze = streakDay === STREAK_CYCLE_LENGTH;
    const nextFreezeCount = Math.max(0, Math.min(
      MAX_STREAK_FREEZES,
      player.streakFreezeCount - (freezeConsumed ? 1 : 0) + (earnsFreeze ? 1 : 0),
    ));

    const goldReward = Math.round(rollDice('2d6') * player.level * streakMult);
    const xpDebuffMult = isDeathDebuffActive(player.deathDebuffUntil, player.premiumUntil) ? DEATH_DEBUFF_XP_MULT : 1;
    const xpReward = Math.round(10 * player.level * xpDebuffMult * streakMult);
    // День 7 цикла — дополнительное зелье здоровья поверх обычного.
    const potionQuantity = streakDay === STREAK_CYCLE_LENGTH ? 3 : 1;

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

    // Wrap gold/XP giving + potion giving + quest reset in a transaction. player.lastDailyReward
    // выше — снимок ДО транзакции; параллельный дубликат того же запроса (двойной тап) прочёл
    // бы тот же снимок и тоже прошёл бы проверку — награда выдалась бы дважды за день. Поэтому
    // отметка "награда за today забрана" — само условие (lastDailyReward !== today), проверяемое
    // атомарно в момент записи через updateMany, и идёт ПЕРВОЙ операцией в транзакции.
    const updateData: Prisma.PlayerUpdateInput = {
      gold: { increment: goldReward },
      xp: newXp,
      lastDailyReward: today,
      dailyStreak: nextStreak,
      streakFreezeCount: nextFreezeCount,
    };
    if (leveledUp) {
      updateData.level = newLevel;
      updateData.xpToNext = newXpToNext;
      updateData.statPoints = newStatPoints;
      const newMaxHp = player.maxHp + 10 * (newLevel - player.level);
      updateData.maxHp = newMaxHp;
      updateData.hp = newMaxHp; // Full heal on level up
    }

    const updated = await db.$transaction(async (tx) => {
      // { not: today } в SQL по трёхзначной логике NULL не совпадает со строками, где
      // lastDailyReward ещё NULL (игрок ни разу не забирал награду) — "NULL <> 'today'" даёт
      // NULL, а не TRUE, так что такие строки WHERE не находил бы вовсе. Явный OR с null нужен,
      // иначе самая первая в жизни игрока попытка получить награду ложно считалась бы "уже забрана".
      const claimResult = await tx.player.updateMany({
        where: { telegramId, OR: [{ lastDailyReward: null }, { lastDailyReward: { not: today } }] },
        data: updateData,
      });
      if (claimResult.count === 0) throw new AlreadyClaimedTodayError();

      // Свежий набор ежедневных квестов на новый день (до итогового запроса с include: quests)
      await issueDailyQuests(tx, player.id, player.level);

      // Give health potions (stacks with existing) — x3 на день 7 стрик-цикла.
      await addItemToInventory({
        playerId: player.id,
        itemId: 'health_potion',
        name: 'Зелье здоровья',
        type: 'consumable',
        rarity: 'common',
        stats: '{"healHp":15}',
        icon: '🧪',
        quantity: potionQuantity,
      }, tx);

      return tx.player.findUniqueOrThrow({
        where: { telegramId },
        include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
      });
    });

    let streakSuffix = streakDay === STREAK_CYCLE_LENGTH
      ? ` 🔥 День ${streakDay}/${STREAK_CYCLE_LENGTH} стрика — тройная награда зельями!`
      : ` 🔥 Стрик: день ${streakDay}/${STREAK_CYCLE_LENGTH}.`;
    if (freezeConsumed) streakSuffix += ' 🧊 Пропущенный день закрыт заморозкой стрика!';
    if (earnsFreeze) streakSuffix += ' 🧊 Заработана заморозка стрика на будущее!';

    return NextResponse.json({
      message: `Ежедневная награда! +${goldReward} золота, +${xpReward} XP, Зелье здоровья x${potionQuantity}!${streakSuffix}`,
      goldReward,
      xpReward,
      leveledUp,
      streak: nextStreak,
      streakDay,
      freezeConsumed,
      earnsFreeze,
      player: updated,
    });
  } catch (error) {
    if (error instanceof AlreadyClaimedTodayError) {
      return NextResponse.json({ error: 'Вы уже получили ежедневную награду сегодня' }, { status: 400 });
    }
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
