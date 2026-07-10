import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { isGearType } from '@/lib/item-affixes';
import { applyTemper } from '@/lib/item-enhancement';
import { incrementQuestProgress } from '@/lib/quests';

const TEMPER_SCROLL_ITEM_ID = 'tempering_scroll';

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

    const target = player.inventory.find(i => i.id === inventoryId);
    if (!target) return NextResponse.json({ error: 'Предмет не найден' }, { status: 404 });
    if (!isGearType(target.type)) {
      return NextResponse.json({ error: 'Закалять можно только оружие, броню или аксессуары' }, { status: 400 });
    }
    if (target.equipped) {
      return NextResponse.json({ error: 'Сначала снимите предмет' }, { status: 400 });
    }

    const scroll = player.inventory.find(i => i.itemId === TEMPER_SCROLL_ITEM_ID && i.type === 'currency');
    if (!scroll || scroll.quantity < 1) {
      return NextResponse.json({ error: 'Недостаточно свитков закалки' }, { status: 400 });
    }

    let currentStats: Record<string, number> = {};
    if (target.stats) {
      try { currentStats = JSON.parse(target.stats); } catch { currentStats = {}; }
    }

    const result = applyTemper(target.enhancementLevel, currentStats);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      if (scroll.quantity <= 1) {
        await tx.inventory.delete({ where: { id: scroll.id } });
      } else {
        await tx.inventory.update({ where: { id: scroll.id }, data: { quantity: { decrement: 1 } } });
      }
      if (result.success) {
        await tx.inventory.update({
          where: { id: target.id },
          data: { enhancementLevel: result.newLevel, stats: JSON.stringify(result.stats) },
        });
        await incrementQuestProgress(tx, player.id, 'temper');
      }
    });

    return NextResponse.json({
      message: result.success
        ? `Удача! ${target.name} закалён до +${result.newLevel}!`
        : `Заточка не удалась. Свиток потрачен впустую, ${target.name} не пострадал.`,
      success: result.success,
      newLevel: result.success ? result.newLevel : target.enhancementLevel,
      stats: result.success ? result.stats : currentStats,
    });
  } catch (error) {
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
