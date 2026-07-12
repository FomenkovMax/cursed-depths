import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { RESPEC_COST_SHARDS } from '@/lib/premium-shop';
import { RESPEC_STAT_FIELDS, totalRespecBudget, validateRespecAllocations, type RespecStatField } from '@/lib/respec';

const RACE_BASE_FIELD: Record<RespecStatField, 'baseStrength' | 'baseDexterity' | 'baseVitality' | 'baseIntellect' | 'baseWillpower' | 'baseInstinct'> = {
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

  try {
    const { allocations } = await req.json();
    if (!allocations || typeof allocations !== 'object') {
      return NextResponse.json({ error: 'Укажите распределение очков' }, { status: 400 });
    }

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId }, include: { race: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (player.inCombat) return NextResponse.json({ error: 'Нельзя делать respec во время боя' }, { status: 400 });

    const raceBase = {} as Record<RespecStatField, number>;
    const currentStats = {} as Record<RespecStatField, number>;
    const parsedAllocations = {} as Record<RespecStatField, number>;
    for (const field of RESPEC_STAT_FIELDS) {
      raceBase[field] = player.race[RACE_BASE_FIELD[field]];
      currentStats[field] = player[field];
      parsedAllocations[field] = Number(allocations[field]);
    }

    const totalBudget = totalRespecBudget(player.statPoints, currentStats, raceBase);
    const validationError = validateRespecAllocations(parsedAllocations, totalBudget);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    let shardsCost = 0;
    if (!player.respecAvailable) {
      if (player.crownShards < RESPEC_COST_SHARDS) {
        return NextResponse.json(
          { error: `Бесплатный respec уже использован. Повторный стоит ${RESPEC_COST_SHARDS} Осколков Короны — у вас ${player.crownShards}.` },
          { status: 400 },
        );
      }
      shardsCost = RESPEC_COST_SHARDS;
    }

    const spentSum = RESPEC_STAT_FIELDS.reduce((sum, field) => sum + parsedAllocations[field], 0);

    // maxHp/maxMp считаются от Стойкости/Воли инкрементально (см. allocate-stat/route.ts) —
    // пересчитываем их так же из новой суммы расовая база + вложенные очки, а не с нуля.
    const newMaxHp = 50 + (raceBase.vitality + parsedAllocations.vitality) * 5;
    const newMaxMp = 100 + (raceBase.willpower + parsedAllocations.willpower) * 2;

    const statUpdate: Record<string, number> = {};
    for (const field of RESPEC_STAT_FIELDS) {
      statUpdate[field] = raceBase[field] + parsedAllocations[field];
    }

    const updated = await db.player.update({
      where: { telegramId: auth.telegramId },
      data: {
        ...statUpdate,
        statPoints: totalBudget - spentSum,
        maxHp: newMaxHp,
        hp: Math.max(1, Math.min(player.hp, newMaxHp)),
        maxMp: newMaxMp,
        mp: Math.max(0, Math.min(player.mp, newMaxMp)),
        respecAvailable: false,
        ...(shardsCost > 0 ? { crownShards: { decrement: shardsCost } } : {}),
      },
      include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
    });

    return NextResponse.json({ message: 'Характеристики перераспределены', player: updated });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
