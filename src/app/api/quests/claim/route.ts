import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ITEMS } from '@/lib/game-data';
import { validateTelegramRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  const { questId } = await req.json();

  const quest = await db.playerQuest.findFirst({
    where: { id: questId, player: { telegramId } },
  });

  if (!quest) return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
  if (!quest.completed) return NextResponse.json({ error: 'Quest not completed' }, { status: 400 });
  if (quest.claimed) return NextResponse.json({ error: 'Already claimed' }, { status: 400 });

  const reward = JSON.parse(quest.reward);

  const player = await db.player.findUnique({
    where: { telegramId },
  });

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  // Give rewards
  const updateData: Record<string, unknown> = {
    xp: { increment: reward.xp || 0 },
    gold: { increment: reward.gold || 0 },
  };

  await db.player.update({ where: { telegramId }, data: updateData });

  // Give item rewards
  if (reward.items) {
    for (const rewardItemId of reward.items) {
      const itemData = ITEMS.find(i => i.id === rewardItemId);
      if (itemData) {
        await db.inventory.create({
          data: {
            playerId: player.id,
            itemId: itemData.id,
            name: itemData.nameRu,
            type: itemData.type,
            rarity: itemData.rarity,
            stats: JSON.stringify(itemData.stats),
            icon: itemData.icon,
            quantity: 1,
          },
        });
      }
    }
  }

  await db.playerQuest.update({ where: { id: questId }, data: { claimed: true } });

  return NextResponse.json({ message: 'Награда получена!', reward });
}
