import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { ensureWorldBossSpawned, DAILY_ATTACK_CAP } from '@/lib/world-boss';

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
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

    const today = new Date().toISOString().split('T')[0];
    const attacksToday = player.worldBossAttackDate === today ? player.worldBossAttacksToday : 0;

    return NextResponse.json({
      boss: { incarnation: boss.incarnation, name: boss.name, hp: boss.hp, maxHp: boss.maxHp },
      topContributors,
      attacksLeftToday: Math.max(0, DAILY_ATTACK_CAP - attacksToday),
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
