import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { switchActiveCharacter } from '@/lib/account-slots';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const { characterId } = await req.json();
    if (!characterId) return NextResponse.json({ error: 'Укажите персонажа' }, { status: 400 });

    const active = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!active) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });
    if (active.id === characterId) {
      return NextResponse.json({ error: 'Этот персонаж уже активен' }, { status: 400 });
    }
    if (!active.accountId) {
      return NextResponse.json({ error: 'У аккаунта нет второго слота' }, { status: 400 });
    }

    const target = await db.player.findUnique({ where: { id: characterId } });
    if (!target || target.accountId !== active.accountId) {
      return NextResponse.json({ error: 'Персонаж не найден в этом аккаунте' }, { status: 404 });
    }
    // Нельзя переключиться посреди боя — оставшееся в bossState/enemyId состояние текущего
    // слота осталось бы висеть неразрешённым (тот же принцип, что и уход из пати во время боя).
    if (active.inCombat) {
      return NextResponse.json({ error: 'Нельзя сменить персонажа во время боя' }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      await switchActiveCharacter(tx, active.accountId!, active.id, active.slotNumber, target.id);
    });

    return NextResponse.json({ message: `Активен персонаж «${target.name}»` });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
