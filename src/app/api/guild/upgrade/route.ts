import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { findGuildUpgrade, canUnlockGuildUpgrade } from '@/lib/guild-upgrades';

class CannotUnlockError extends Error {
  constructor() { super('CANNOT_UNLOCK'); }
}

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const { upgradeId } = await req.json();
    const def = findGuildUpgrade(upgradeId);
    if (!def) return NextResponse.json({ error: 'Неизвестная постройка' }, { status: 400 });

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId }, include: { guildMember: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (!player.guildMember) return NextResponse.json({ error: 'Вы не состоите в гильдии' }, { status: 400 });

    const guild = await db.guild.findUnique({ where: { id: player.guildMember.guildId }, include: { upgrades: { select: { upgradeId: true } } } });
    if (!guild) return NextResponse.json({ error: 'Гильдия не найдена' }, { status: 404 });
    // Разблокировку строит только лидер — коллективная казна, но решение о трате не должно
    // приниматься любым участником в одиночку (тот же принцип governance, что у Party
    // combat/start, где начинать бой может только лидер пати).
    if (guild.leaderId !== player.id) return NextResponse.json({ error: 'Разблокировать постройки может только лидер гильдии' }, { status: 403 });

    const unlockedIds = new Set(guild.upgrades.map(u => u.upgradeId));
    if (!canUnlockGuildUpgrade(def, unlockedIds, guild.treasury)) {
      return NextResponse.json({ error: 'Нельзя разблокировать: не хватает золота в казне или не открыт предыдущий тир' }, { status: 400 });
    }

    // guild.treasury выше — снимок ДО транзакции; атомарность обеспечивает updateMany с gte
    // ниже (тот же приём, что guild/donate и shop/buy).
    const updatedGuild = await db.$transaction(async (tx) => {
      const result = await tx.guild.updateMany({
        where: { id: guild.id, treasury: { gte: def.cost } },
        data: { treasury: { decrement: def.cost } },
      });
      if (result.count === 0) throw new CannotUnlockError();

      await tx.guildUpgrade.create({ data: { guildId: guild.id, upgradeId: def.id } });

      return tx.guild.findUnique({
        where: { id: guild.id },
        include: {
          members: { include: { player: { include: { class: true } } }, orderBy: { joinedAt: 'asc' } },
          upgrades: { select: { upgradeId: true } },
        },
      });
    });

    return NextResponse.json({ message: `Построено: ${def.nameRu}`, guild: updatedGuild });
  } catch (error) {
    if (error instanceof CannotUnlockError) {
      return NextResponse.json({ error: 'Не хватает золота в казне' }, { status: 400 });
    }
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
