import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { computeEquipmentBonuses } from '@/lib/combat/equipment-stats';
import type { PlayerCombatStats } from '@/lib/combat/combat-engine';
import { resolveGuildRaidBossIfNeeded, raidBossAttackDamage, rewardForRaidShare, RAID_BOSS_DAILY_ATTACK_CAP } from '@/lib/social/guild-raid-boss';
import { isPremiumActive, isDeathDebuffActive, DEATH_DEBUFF_XP_MULT } from '@/lib/premium/premium-shop';
import { findPet } from '@/lib/economy/pets';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({
      where: { telegramId: auth.telegramId },
      include: { inventory: true, class: true, guildMember: { include: { guild: { include: { members: true } } } }, dailyLimits: true },
    });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (!isPremiumActive(player.premiumUntil)) {
      return NextResponse.json({ error: 'Гильд-рейд-босс доступен только с активным премиум-статусом' }, { status: 403 });
    }
    if (!player.guildMember) {
      return NextResponse.json({ error: 'Атаковать гильд-рейд-босса может только член гильдии' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const attacksSoFar = player.dailyLimits?.raidBossAttackDate === today ? player.dailyLimits.raidBossAttacksToday : 0;
    if (attacksSoFar >= RAID_BOSS_DAILY_ATTACK_CAP) {
      return NextResponse.json({ error: `Вы уже атаковали гильд-рейд-босса ${RAID_BOSS_DAILY_ATTACK_CAP} раз сегодня` }, { status: 400 });
    }

    const guild = player.guildMember.guild;
    const boss = await resolveGuildRaidBossIfNeeded(db, guild.id, guild.members.length);
    if (boss.hp <= 0) return NextResponse.json({ error: 'На этой неделе босс уже повержен — возвращайтесь на следующей' }, { status: 409 });

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
    const damage = raidBossAttackDamage(stats, equipBonuses.attack);

    const result = await db.$transaction(async (tx) => {
      const fresh = await tx.guildRaidBoss.findUnique({ where: { id: boss.id } });
      if (!fresh || fresh.hp <= 0) throw new Error('BOSS_ALREADY_DEAD');

      const newHp = Math.max(0, fresh.hp - damage);
      await tx.guildRaidBoss.update({ where: { id: fresh.id }, data: { hp: newHp } });
      await tx.guildRaidContribution.create({
        data: { bossId: fresh.id, cycleId: fresh.cycleId, playerId: player.id, damage },
      });
      await tx.player.update({
        where: { id: player.id },
        data: {
          dailyLimits: {
            upsert: {
              create: { raidBossAttacksToday: attacksSoFar + 1, raidBossAttackDate: today },
              update: { raidBossAttacksToday: attacksSoFar + 1, raidBossAttackDate: today },
            },
          },
        },
      });

      let killed = false;
      let myReward: { gold: number; xp: number } | null = null;

      if (newHp <= 0) {
        killed = true;
        const contributions = await tx.guildRaidContribution.findMany({
          where: { bossId: fresh.id, cycleId: fresh.cycleId },
        });
        const byPlayer = new Map<string, number>();
        for (const c of contributions) byPlayer.set(c.playerId, (byPlayer.get(c.playerId) ?? 0) + c.damage);
        const totalDamage = Array.from(byPlayer.values()).reduce((s, d) => s + d, 0);

        const contributorIds = Array.from(byPlayer.keys());
        const contributorPlayers = await tx.player.findMany({ where: { id: { in: contributorIds } } });
        const contributorById = new Map(contributorPlayers.map(p => [p.id, p]));

        for (const [pid, dmg] of byPlayer) {
          const p = contributorById.get(pid);
          if (!p) continue;
          const share = totalDamage > 0 ? dmg / totalDamage : 0;
          const reward = rewardForRaidShare(share);
          if (pid === player.id) myReward = reward;

          const xpDebuffMult = isDeathDebuffActive(p.deathDebuffUntil, p.premiumUntil) ? DEATH_DEBUFF_XP_MULT : 1;
          let newXp = p.xp + Math.round(reward.xp * xpDebuffMult);
          let newLevel = p.level;
          let newXpToNext = p.xpToNext;
          let newStatPoints = p.statPoints;
          let newMaxHp = p.maxHp;
          let leveledUp = false;
          while (newXp >= newXpToNext) {
            newXp -= newXpToNext;
            newLevel++;
            newXpToNext = newLevel * 100;
            newStatPoints += 2;
            newMaxHp += 10;
            leveledUp = true;
          }

          await tx.player.update({
            where: { id: pid },
            data: {
              gold: { increment: reward.gold },
              xp: newXp,
              ...(leveledUp ? { level: newLevel, xpToNext: newXpToNext, statPoints: newStatPoints, maxHp: newMaxHp, hp: newMaxHp } : {}),
            },
          });
        }
      }

      return { newHp, killed, myReward, maxHp: fresh.maxHp };
    });

    return NextResponse.json({
      damageDealt: damage,
      bossHp: result.newHp,
      bossMaxHp: result.maxHp,
      killed: result.killed,
      reward: result.myReward,
      attacksLeftToday: Math.max(0, RAID_BOSS_DAILY_ATTACK_CAP - (attacksSoFar + 1)),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'BOSS_ALREADY_DEAD') {
      return NextResponse.json({ error: 'На этой неделе босс уже повержен — возвращайтесь на следующей' }, { status: 409 });
    }
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
