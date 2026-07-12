import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { CODEX_ENTRIES, checkNewlyUnlockedCodex, type CodexContext } from '@/lib/social/codex';

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({
      where: { telegramId: auth.telegramId },
      include: { race: true, codexEntries: true, recipes: true, guildMember: true },
    });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const ctx: CodexContext = {
      level: player.level,
      raceSlug: player.race.slug,
      totalKills: player.totalKills,
      bestAbyssDepth: player.bestAbyssDepth,
      recipesLearnedCount: player.recipes.length,
      totalCrafts: player.totalCrafts,
      partyWins: player.partyWins,
      pvpWins: player.pvpWins,
      inGuild: !!player.guildMember,
    };

    const alreadyUnlockedIds = new Set(player.codexEntries.map(e => e.entryId));
    const newlyUnlocked = checkNewlyUnlockedCodex(ctx, alreadyUnlockedIds);

    if (newlyUnlocked.length > 0) {
      // upsert по каждой записи — SQLite/libsql не поддерживает createMany({ skipDuplicates: true }),
      // тот же паттерн, что и у ачивок (см. POST /api/achievements).
      for (const e of newlyUnlocked) {
        await db.playerCodexEntry.upsert({
          where: { playerId_entryId: { playerId: player.id, entryId: e.id } },
          create: { playerId: player.id, entryId: e.id },
          update: {},
        });
        alreadyUnlockedIds.add(e.id);
      }
    }

    const unlockedMap = new Map(player.codexEntries.map(e => [e.entryId, e.unlockedAt]));
    for (const e of newlyUnlocked) unlockedMap.set(e.id, new Date());

    // Запертые записи отдаём БЕЗ текста — только заголовок/иконку, чтобы сохранить эффект
    // открытия. Текст появляется только когда условие реально выполнено.
    const entries = CODEX_ENTRIES.map(e => {
      const unlocked = alreadyUnlockedIds.has(e.id);
      return {
        id: e.id,
        category: e.category,
        titleRu: unlocked ? e.titleRu : '???',
        icon: e.icon,
        textRu: unlocked ? e.textRu : null,
        unlocked,
        unlockedAt: unlockedMap.get(e.id) ?? null,
      };
    });

    return NextResponse.json({
      entries,
      newlyUnlocked: newlyUnlocked.map(e => ({ id: e.id, titleRu: e.titleRu, icon: e.icon })),
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
