import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateTelegramRequest } from '@/lib/auth';
import { findExpeditionTier, F2P_EXPEDITION_TIER_ID } from '@/lib/premium/expeditions';
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

    // Премиум — любой тир без ограничений. F2P (волна 2B, п.24) — только самый короткий тир,
    // раз в день (Player.expeditionFreeUsedDate, тот же lazy-reset паттерн, что у остальных
    // дневных лимитов) — "вкус" механики вместо полной невидимости.
    const premiumActive = isPremiumActive(player.premiumUntil);
    const today = new Date().toISOString().split('T')[0];
    if (!premiumActive) {
      if (tier.id !== F2P_EXPEDITION_TIER_ID) {
        return NextResponse.json({ error: 'Этот тир доступен только с активным премиум-статусом' }, { status: 403 });
      }
      if (player.expeditionFreeUsedDate === today) {
        return NextResponse.json({ error: 'Бесплатная вылазка на сегодня уже использована — premium снимает дневной лимит' }, { status: 403 });
      }
    }
    if (player.expeditionTierId && player.expeditionEndsAt) {
      return NextResponse.json({ error: 'Герой уже в экспедиции' }, { status: 400 });
    }

    const endsAt = new Date(Date.now() + tier.hours * 60 * 60 * 1000);
    const updated = await db.player.update({
      where: { telegramId: auth.telegramId },
      data: {
        expeditionTierId: tier.id,
        expeditionEndsAt: endsAt,
        ...(premiumActive ? {} : { expeditionFreeUsedDate: today }),
      },
      include: { inventory: true, quests: true, race: true, class: { include: { abilities: true } } },
    });

    return NextResponse.json({ message: `Герой отправлен: ${tier.nameRu}`, endsAt, player: updated });
  } catch (error) {
    console.error('[API] Route error:', error);
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
