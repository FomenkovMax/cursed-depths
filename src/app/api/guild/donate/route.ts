import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';

class InsufficientGoldError extends Error {
  constructor() { super('INSUFFICIENT_GOLD'); }
}

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const amount = Math.floor(Number(body.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Некорректная сумма' }, { status: 400 });
    }

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId }, include: { guildMember: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (!player.guildMember) return NextResponse.json({ error: 'Вы не состоите в гильдии' }, { status: 400 });

    const guildId = player.guildMember.guildId;
    // player.gold выше — снимок ДО транзакции; атомарность обеспечивает updateMany с gte
    // ниже (тот же приём, что shop/buy) — параллельный дубль запроса не уведёт баланс в минус.
    const { updatedPlayer, updatedGuild } = await db.$transaction(async (tx) => {
      const result = await tx.player.updateMany({
        where: { telegramId: auth.telegramId, gold: { gte: amount } },
        data: { gold: { decrement: amount } },
      });
      if (result.count === 0) throw new InsufficientGoldError();

      const guild = await tx.guild.update({
        where: { id: guildId },
        data: { treasury: { increment: amount } },
        include: {
          members: { include: { player: { include: { class: true } } }, orderBy: { joinedAt: 'asc' } },
          upgrades: { select: { upgradeId: true } },
        },
      });
      const updated = await tx.player.findUnique({
        where: { telegramId: auth.telegramId },
        include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
      });
      return { updatedPlayer: updated, updatedGuild: guild };
    });

    return NextResponse.json({ message: `Пожертвовано ${amount} золота в казну гильдии`, player: updatedPlayer, guild: updatedGuild });
  } catch (error) {
    if (error instanceof InsufficientGoldError) {
      return NextResponse.json({ error: 'Недостаточно золота' }, { status: 400 });
    }
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
