import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { computeEquipmentBonuses } from '@/lib/combat/equipment-stats';
import { stageUnlockLevel, type PlayerCombatStats } from '@/lib/combat/combat-engine';
import { simulateWeeklyChallenge, pickWeeklyEnemy, type WeeklyChallengeCombatant } from '@/lib/social/weekly-challenge';
import { currentWeekId } from '@/lib/social/fortress';
import { LEAGUE_POINTS } from '@/lib/social/pvp-season';
import { isDeathDebuffActive, DEATH_DEBUFF_XP_MULT } from '@/lib/premium/premium-shop';
import { findPet } from '@/lib/economy/pets';
import { addItemToInventory } from '@/lib/economy/inventory-utils';
import { ITEMS } from '@/lib/game-data';
import { incrementQuestProgress } from '@/lib/economy/quests';

const WIN_GOLD_BASE = 40;
const WIN_XP_BASE = 30;

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({
      where: { telegramId: auth.telegramId },
      include: { inventory: true, class: { include: { abilities: true } } },
    });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const weekId = currentWeekId();
    const existing = await db.weeklyChallengeResult.findUnique({ where: { weekId_playerId: { weekId, playerId: player.id } } });
    if (existing) {
      return NextResponse.json({ error: 'Попытка на эту неделю уже потрачена — новый вызов на следующей' }, { status: 400 });
    }

    const enemy = pickWeeklyEnemy(weekId);

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

    const combatant: WeeklyChallengeCombatant = {
      playerId: player.id,
      name: player.name,
      stats,
      maxHp: player.maxHp + equipBonuses.hp,
      maxMp: player.maxMp + equipBonuses.mp,
      weaponBonus: equipBonuses.attack,
      armorBonus: equipBonuses.defense,
      abilities,
    };

    const fight = simulateWeeklyChallenge(combatant, enemy);

    let itemWon: string | null = null;
    let goldGained = 0;
    let xpGained = 0;
    let leveledUp = false;
    let newXp = player.xp;
    let newLevel = player.level;
    let newXpToNext = player.xpToNext;
    let newStatPoints = player.statPoints;
    let newMaxHp = player.maxHp;

    if (fight.won) {
      const xpDebuffMult = isDeathDebuffActive(player.deathDebuffUntil, player.premiumUntil) ? DEATH_DEBUFF_XP_MULT : 1;
      goldGained = Math.round((WIN_GOLD_BASE + player.level * 3) * 1);
      xpGained = Math.round((WIN_XP_BASE + player.level * 2) * xpDebuffMult);

      newXp = player.xp + xpGained;
      while (newXp >= newXpToNext) {
        newXp -= newXpToNext;
        newLevel++;
        newXpToNext = newLevel * 100;
        newStatPoints += 2;
        newMaxHp += 10;
        leveledUp = true;
      }

      if (enemy.lootTable.length > 0) {
        const guaranteed = enemy.lootTable[Math.floor(Math.random() * enemy.lootTable.length)];
        const itemData = ITEMS.find(i => i.id === guaranteed.itemId);
        if (itemData) {
          itemWon = itemData.nameRu;
          await addItemToInventory({
            playerId: player.id, itemId: itemData.id, name: itemData.nameRu, type: itemData.type,
            rarity: itemData.rarity, stats: JSON.stringify(itemData.stats), icon: itemData.icon, quantity: 1,
          });
        }
      }
    }

    await db.$transaction(async (tx) => {
      await tx.weeklyChallengeResult.create({
        data: {
          weekId,
          playerId: player.id,
          enemyId: enemy.id,
          won: fight.won,
          turnsTaken: fight.turnsTaken,
          hpPercentRemaining: fight.hpPercentRemaining,
        },
      });
      await tx.player.update({
        where: { id: player.id },
        data: {
          gold: { increment: goldGained },
          xp: newXp,
          ...(leveledUp ? { level: newLevel, xpToNext: newXpToNext, statPoints: newStatPoints, maxHp: newMaxHp, hp: newMaxHp } : {}),
          ...(fight.won ? { leagueBonusScore: { increment: LEAGUE_POINTS.weeklyChallengeWon } } : {}),
        },
      });
      if (fight.won) {
        await incrementQuestProgress(tx, player.id, 'kill');
      }
    });

    return NextResponse.json({
      won: fight.won,
      log: fight.log,
      turnsTaken: fight.turnsTaken,
      hpPercentRemaining: fight.hpPercentRemaining,
      goldGained,
      xpGained,
      leveledUp,
      itemWon,
      target: { nameRu: enemy.nameRu, icon: enemy.icon },
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
