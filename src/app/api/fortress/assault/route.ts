import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { computeEquipmentBonuses } from '@/lib/equipment-stats';
import type { PlayerCombatStats } from '@/lib/combat-engine';
import { resolveFortressCycleIfNeeded, assaultPoints, ASSAULT_DAILY_CAP } from '@/lib/fortress';
import { findPet } from '@/lib/pets';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({
      where: { telegramId: auth.telegramId },
      include: { inventory: true, class: true, guildMember: true },
    });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (!player.guildMember) return NextResponse.json({ error: 'Штурмовать Крепость может только член гильдии' }, { status: 400 });

    const today = new Date().toISOString().split('T')[0];
    const assaultsSoFar = player.fortressAssaultDate === today ? player.fortressAssaultsToday : 0;
    if (assaultsSoFar >= ASSAULT_DAILY_CAP) {
      return NextResponse.json({ error: `Вы уже штурмовали Крепость ${ASSAULT_DAILY_CAP} раз сегодня` }, { status: 400 });
    }

    const fortress = await resolveFortressCycleIfNeeded(db);

    const activePet = player.activePetId ? findPet(player.activePetId) : null;
    const equipBonuses = computeEquipmentBonuses(player.inventory, activePet);
    const stats: PlayerCombatStats = {
      strength: player.strength + equipBonuses.strength,
      dexterity: player.dexterity + equipBonuses.dexterity,
      vitality: player.vitality + equipBonuses.vitality,
      intellect: player.intellect + equipBonuses.intellect,
      willpower: player.willpower + equipBonuses.willpower,
      instinct: player.instinct + equipBonuses.instinct,
      level: player.level,
      primaryStat: player.class.primaryStat,
    };
    const points = assaultPoints(stats, equipBonuses.attack);

    await db.$transaction(async (tx) => {
      await tx.fortressContribution.create({
        data: { fortressId: fortress.id, cycleId: fortress.cycleId, guildId: player.guildMember!.guildId, playerId: player.id, points },
      });
      await tx.player.update({
        where: { id: player.id },
        data: { fortressAssaultsToday: assaultsSoFar + 1, fortressAssaultDate: today },
      });
    });

    return NextResponse.json({
      pointsDealt: points,
      attacksLeftToday: Math.max(0, ASSAULT_DAILY_CAP - (assaultsSoFar + 1)),
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
