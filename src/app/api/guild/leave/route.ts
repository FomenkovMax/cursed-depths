import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId }, include: { guildMember: true } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (!player.guildMember) return NextResponse.json({ error: 'Вы не состоите в гильдии' }, { status: 400 });

    const guild = await db.guild.findUnique({ where: { id: player.guildMember.guildId }, include: { members: true } });
    if (!guild) return NextResponse.json({ error: 'Гильдия не найдена' }, { status: 404 });

    await db.guildMember.delete({ where: { playerId: player.id } });

    const remaining = guild.members.filter(m => m.playerId !== player.id);
    if (remaining.length === 0) {
      // Гильдия не хранит боевой историю (в отличие от Party) — пустую просто удаляем,
      // освобождая название для повторного использования.
      await db.guild.delete({ where: { id: guild.id } });
    } else if (guild.leaderId === player.id) {
      // Лидер вышел — передаём лидерство самому давнему оставшемуся участнику.
      const next = remaining.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())[0];
      await db.guild.update({ where: { id: guild.id }, data: { leaderId: next.playerId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
