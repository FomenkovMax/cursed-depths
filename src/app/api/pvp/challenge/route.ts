import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { computeEquipmentBonuses } from '@/lib/equipment-stats';
import { stageUnlockLevel, type PlayerCombatStats } from '@/lib/combat-engine';
import { simulatePvpFight, eloDelta, clampRating, leagueForRating, type PvpCombatant } from '@/lib/pvp';
import { incrementQuestProgress } from '@/lib/quests';
import { isDeathDebuffActive, DEATH_DEBUFF_XP_MULT } from '@/lib/premium-shop';
import { findPet } from '@/lib/pets';

async function buildCombatant(playerId: string) {
  const player = await db.player.findUnique({
    where: { id: playerId },
    include: { inventory: true, class: { include: { abilities: true } } },
  });
  if (!player) return null;

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

  const abilities = player.class.abilities
    .filter(a => a.type === 'active' && player.level >= stageUnlockLevel(a.stage))
    .map(a => ({ description: a.description, stage: a.stage }));

  const combatant: PvpCombatant = {
    playerId: player.id,
    name: player.name,
    stats,
    maxHp: player.maxHp + equipBonuses.hp,
    maxMp: player.maxMp + equipBonuses.mp,
    weaponBonus: equipBonuses.attack,
    armorBonus: equipBonuses.defense,
    abilities,
  };

  return { player, combatant };
}

const WIN_GOLD = 25;
const WIN_XP = 20;

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const { opponentId } = await req.json();
    if (!opponentId) return NextResponse.json({ error: 'Укажите opponentId' }, { status: 400 });

    const attackerPlayer = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!attackerPlayer) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (attackerPlayer.id === opponentId) return NextResponse.json({ error: 'Нельзя вызвать самого себя' }, { status: 400 });

    const attackerBuild = await buildCombatant(attackerPlayer.id);
    const defenderBuild = await buildCombatant(opponentId);
    if (!attackerBuild || !defenderBuild) return NextResponse.json({ error: 'Противник не найден' }, { status: 404 });

    const fight = simulatePvpFight(attackerBuild.combatant, defenderBuild.combatant);
    const attackerWon = fight.winnerId === attackerBuild.combatant.playerId;

    const winnerRating = attackerWon ? attackerBuild.player.pvpRating : defenderBuild.player.pvpRating;
    const loserRating = attackerWon ? defenderBuild.player.pvpRating : attackerBuild.player.pvpRating;
    const delta = eloDelta(winnerRating, loserRating);

    const newAttackerRating = clampRating(attackerBuild.player.pvpRating + (attackerWon ? delta : -delta));
    const newDefenderRating = clampRating(defenderBuild.player.pvpRating + (attackerWon ? -delta : delta));

    let xpGained = 0;
    let goldGained = 0;
    let leveledUp = false;
    let newXp = attackerBuild.player.xp;
    let newLevel = attackerBuild.player.level;
    let newXpToNext = attackerBuild.player.xpToNext;
    let newStatPoints = attackerBuild.player.statPoints;
    let newMaxHp = attackerBuild.player.maxHp;

    if (attackerWon) {
      const xpDebuffMult = isDeathDebuffActive(attackerBuild.player.deathDebuffUntil, attackerBuild.player.premiumUntil) ? DEATH_DEBUFF_XP_MULT : 1;
      xpGained = Math.round(WIN_XP * xpDebuffMult);
      goldGained = WIN_GOLD;
      newXp = attackerBuild.player.xp + xpGained;
      while (newXp >= newXpToNext) {
        newXp -= newXpToNext;
        newLevel++;
        newXpToNext = newLevel * 100;
        newStatPoints += 2;
        newMaxHp += 10;
        leveledUp = true;
      }
    }

    await db.$transaction(async (tx) => {
      await tx.player.update({
        where: { id: attackerBuild.player.id },
        data: {
          pvpRating: newAttackerRating,
          pvpWins: { increment: attackerWon ? 1 : 0 },
          pvpLosses: { increment: attackerWon ? 0 : 1 },
          gold: { increment: goldGained },
          xp: newXp,
          ...(leveledUp ? { level: newLevel, xpToNext: newXpToNext, statPoints: newStatPoints, maxHp: newMaxHp, hp: newMaxHp } : {}),
        },
      });
      await tx.player.update({
        where: { id: defenderBuild.player.id },
        data: {
          pvpRating: newDefenderRating,
          pvpWins: { increment: attackerWon ? 0 : 1 },
          pvpLosses: { increment: attackerWon ? 1 : 0 },
        },
      });
      if (attackerWon) {
        await incrementQuestProgress(tx, attackerBuild.player.id, 'pvp_win');
      }
    });

    return NextResponse.json({
      won: attackerWon,
      log: fight.log,
      ratingDelta: attackerWon ? delta : -delta,
      newRating: newAttackerRating,
      league: leagueForRating(newAttackerRating),
      goldGained,
      xpGained,
      leveledUp,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
