import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { findExpeditionTier } from '@/lib/premium/expeditions';
import { isPremiumActive } from '@/lib/premium/premium-shop';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }

  try {
    const { tierId } = await req.json();
    const tier = tierId ? findExpeditionTier(tierId) : null;
    if (!tier) return NextResponse.json({ error: 'Неверная экспедиция' }, { status: 400 });

    const player = await db.player.findUnique({ where: { telegramId: auth.telegramId } });
    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    // Реально премиум-эксклюзивная механика — без активного премиума нельзя начать экспедицию
    // вообще, не только "получить лучшую награду".
    if (!isPremiumActive(player.premiumUntil)) {
      return NextResponse.json({ error: 'Экспедиции доступны только с активным премиум-статусом' }, { status: 403 });
    }
    if (player.expeditionTierId && player.expeditionEndsAt) {
      return NextResponse.json({ error: 'Герой уже в экспедиции' }, { status: 400 });
    }

    const endsAt = new Date(Date.now() + tier.hours * 60 * 60 * 1000);
    const updated = await db.player.update({
      where: { telegramId: auth.telegramId },
      data: { expeditionTierId: tier.id, expeditionEndsAt: endsAt },
      include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
    });

    return NextResponse.json({ message: `Герой отправлен: ${tier.nameRu}`, endsAt, player: updated });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
