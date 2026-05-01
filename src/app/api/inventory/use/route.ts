import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  try {
    const { inventoryId } = await req.json();
    if (!inventoryId) return NextResponse.json({ error: 'Укажите inventoryId' }, { status: 400 });

    const player = await db.player.findUnique({
      where: { telegramId },
      include: { inventory: true },
    });

    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    const item = player.inventory.find(i => i.id === inventoryId);
    if (!item) return NextResponse.json({ error: 'Предмет не найден' }, { status: 404 });
    if (item.type !== 'consumable') return NextResponse.json({ error: 'Это не расходуемый предмет' }, { status: 400 });

    const stats = item.stats ? JSON.parse(item.stats) : {};
    const updateData: Record<string, unknown> = {};

    if (stats.healHp) {
      updateData.hp = Math.min(player.maxHp, player.hp + stats.healHp);
    }
    if (stats.healMp) {
      updateData.mp = Math.min(player.maxMp, player.mp + stats.healMp);
    }

    if (Object.keys(updateData).length > 0) {
      await db.player.update({ where: { telegramId }, data: updateData });
    }

    // Remove or reduce item
    if (item.quantity > 1) {
      await db.inventory.update({ where: { id: inventoryId }, data: { quantity: { decrement: 1 } } });
    } else {
      await db.inventory.delete({ where: { id: inventoryId } });
    }

    return NextResponse.json({ message: `Вы использовали ${item.name}`, effect: stats });
  } catch (error) {
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
