import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { resolveGuildRaidBossIfNeeded, RAID_BOSS_NAME, RAID_BOSS_LORE, RAID_BOSS_DAILY_ATTACK_CAP } from '@/lib/social/guild-raid-boss';
import { isPremiumActive } from '@/lib/premium/premium-shop';

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({
      where: { telegramId: auth.telegramId },
      include: { guildMember: { include: { guild: { include: { members: true } } } }, dailyLimits: true },
    });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const premiumActive = isPremiumActive(player.premiumUntil);

    if (!player.guildMember) {
      return NextResponse.json({ inGuild: false, premiumActive, boss: null, topContributors: [], myContribution: 0, attacksLeftToday: 0 });
    }

    const guild = player.guildMember.guild;
    const boss = await resolveGuildRaidBossIfNeeded(db, guild.id, guild.members.length);

    const contributions = await db.guildRaidContribution.findMany({
      where: { bossId: boss.id, cycleId: boss.cycleId },
      include: { player: { select: { name: true } } },
    });
    const byPlayer = new Map<string, { name: string; damage: number }>();
    for (const c of contributions) {
      const existing = byPlayer.get(c.playerId);
      if (existing) existing.damage += c.damage;
      else byPlayer.set(c.playerId, { name: c.player.name, damage: c.damage });
    }
    const topContributors = Array.from(byPlayer.entries())
      .map(([playerId, v]) => ({ playerId, ...v }))
      .sort((a, b) => b.damage - a.damage)
      .slice(0, 10);

    const today = new Date().toISOString().split('T')[0];
    const attacksToday = player.dailyLimits?.raidBossAttackDate === today ? player.dailyLimits.raidBossAttacksToday : 0;

    return NextResponse.json({
      inGuild: true,
      premiumActive,
      boss: {
        name: RAID_BOSS_NAME,
        lore: RAID_BOSS_LORE,
        cycleId: boss.cycleId,
        hp: boss.hp,
        maxHp: boss.maxHp,
        defeated: boss.hp <= 0,
      },
      topContributors,
      // Эфемерная "валюта" этого недельного цикла (аудит 3, roguelite-референс) — сумма урона
      // игрока за cycleId, сгорает при убийстве босса вместе со всеми GuildRaidContribution.
      myContribution: byPlayer.get(player.id)?.damage ?? 0,
      attacksLeftToday: Math.max(0, RAID_BOSS_DAILY_ATTACK_CAP - attacksToday),
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
