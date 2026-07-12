import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { ACHIEVEMENTS, checkNewlyUnlocked, type AchievementContext } from '@/lib/social/achievements';

const LEGENDARY_OR_BETTER = new Set(['legendary', 'artifact', 'mythic']);

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({
      where: { telegramId: auth.telegramId },
      include: { inventory: true, achievements: true },
    });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const questsCompleted = await db.playerQuest.count({ where: { playerId: player.id, completed: true } });

    const ctx: AchievementContext = {
      level: player.level,
      gold: player.gold,
      totalKills: player.totalKills,
      totalExplores: player.totalExplores,
      totalCrafts: player.totalCrafts,
      questsCompleted,
      partyWins: player.partyWins,
      inventoryCount: player.inventory.length,
      hasLegendaryOrBetter: player.inventory.some(i => LEGENDARY_OR_BETTER.has(i.rarity)),
    };

    const alreadyUnlockedIds = new Set(player.achievements.map(a => a.achievementId));
    const newlyUnlocked = checkNewlyUnlocked(ctx, alreadyUnlockedIds);

    if (newlyUnlocked.length > 0) {
      // createMany({ skipDuplicates: true }) не поддерживается для SQLite/libsql — используем
      // upsert по каждой ачивке, он же и защищает от гонки при параллельных запросах.
      for (const a of newlyUnlocked) {
        await db.playerAchievement.upsert({
          where: { playerId_achievementId: { playerId: player.id, achievementId: a.id } },
          create: { playerId: player.id, achievementId: a.id },
          update: {},
        });
        alreadyUnlockedIds.add(a.id);
      }
    }

    const unlockedMap = new Map(player.achievements.map(a => [a.achievementId, a.unlockedAt]));
    for (const a of newlyUnlocked) unlockedMap.set(a.id, new Date());

    const achievements = ACHIEVEMENTS.map(a => ({
      id: a.id,
      nameRu: a.nameRu,
      descriptionRu: a.descriptionRu,
      icon: a.icon,
      target: a.target ?? null,
      progress: a.getProgress ? Math.min(a.getProgress(ctx), a.target ?? Infinity) : null,
      unlocked: alreadyUnlockedIds.has(a.id),
      unlockedAt: unlockedMap.get(a.id) ?? null,
    }));

    return NextResponse.json({
      achievements,
      newlyUnlocked: newlyUnlocked.map(a => ({ id: a.id, nameRu: a.nameRu, icon: a.icon })),
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
