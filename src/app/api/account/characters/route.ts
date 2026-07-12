import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { MAX_CHARACTER_SLOTS } from '@/lib/account-slots';

export async function GET(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const active = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!active) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    // Без accountId (обычный однослотовый аккаунт) — сиблингов не бывает, groupKey = его же id.
    const groupFilter = active.accountId ? { accountId: active.accountId } : { id: active.id };
    const rows = await db.player.findMany({
      where: groupFilter,
      include: { race: { select: { name: true, icon: true } }, class: { select: { name: true, icon: true } } },
      orderBy: { slotNumber: 'asc' },
    });

    const characters = rows.map(p => ({
      id: p.id,
      name: p.name,
      level: p.level,
      slotNumber: p.slotNumber,
      active: p.id === active.id,
      race: { nameRu: p.race.name, icon: p.race.icon },
      class: { name: p.class.name, icon: p.class.icon },
    }));

    return NextResponse.json({ characters, maxSlots: MAX_CHARACTER_SLOTS });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
