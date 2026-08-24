import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { ensureWorldBossSpawned, dailyAttackCapFor, WORLD_BOSS_LORE } from '@/lib/social/world-boss';
import { isPremiumActive } from '@/lib/premium/premium-shop';

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({
      where: { telegramId: auth.telegramId },
      include: { guildMember: { include: { guild: { include: { members: { select: { playerId: true } } } } } } },
    });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const boss = await ensureWorldBossSpawned(db);

    const contributions = await db.worldBossContribution.findMany({
      where: { bossId: boss.id, incarnation: boss.incarnation },
      include: { player: { select: { name: true } } },
    });

    const byPlayer = new Map<string, { name: string; damage: number }>();
    for (const c of contributions) {
      const existing = byPlayer.get(c.playerId);
      if (existing) existing.damage += c.damage;
      else byPlayer.set(c.playerId, { name: c.player.name, damage: c.damage });
    }
    const topContributors = Array.from(byPlayer.entries())
      .map(([playerId, v]) => ({ playerId, name: v.name, damage: v.damage }))
      .sort((a, b) => b.damage - a.damage)
      .slice(0, 10);

    // Мини-рейтинг внутри своей гильдии — глобальный топ-10 выше почти никогда не содержит
    // сокомандников не-топовой гильдии, так что "кто из наших бьёт босса" был не виден.
    // null, если игрок не состоит в гильдии.
    const guildMemberIds = player.guildMember?.guild.members.map(m => m.playerId) ?? null;
    const guildContributors = guildMemberIds
      ? Array.from(byPlayer.entries())
          .filter(([playerId]) => guildMemberIds.includes(playerId))
          .map(([playerId, v]) => ({ playerId, name: v.name, damage: v.damage }))
          .sort((a, b) => b.damage - a.damage)
      : null;

    const today = new Date().toISOString().split('T')[0];
    const attacksToday = player.worldBossAttackDate === today ? player.worldBossAttacksToday : 0;
    const attackCap = dailyAttackCapFor(isPremiumActive(player.premiumUntil));

    return NextResponse.json({
      boss: { incarnation: boss.incarnation, name: boss.name, hp: boss.hp, maxHp: boss.maxHp, lore: WORLD_BOSS_LORE },
      topContributors,
      guildContributors,
      // Эфемерная "валюта" этого воплощения босса (аудит 3, roguelite-референс) — сумма урона
      // игрока за incarnation, сгорает при убийстве босса вместе со всеми WorldBossContribution.
      myContribution: byPlayer.get(player.id)?.damage ?? 0,
      attacksLeftToday: Math.max(0, attackCap - attacksToday),
      attackCap,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
