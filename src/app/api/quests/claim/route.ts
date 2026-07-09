import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ITEMS } from '@/lib/game-data';
import { validateTelegramRequest } from '@/lib/auth';
import { addItemToInventory } from '@/lib/inventory-utils';
import { collectQuestItemId } from '@/lib/quests';

/** Брошено внутри транзакции, если квест уже помечен полученным В МОМЕНТ фактической записи
 * (см. комментарий у updateMany ниже) — напр. параллельный дубликат того же запроса. */
class AlreadyClaimedError extends Error {
  constructor() { super('ALREADY_CLAIMED'); }
}

export async function POST(req: NextRequest) {
  const auth = validateTelegramRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Неверная авторизация' }, { status: 401 });
  }
  const telegramId = auth.telegramId;

  try {
    const { questId } = await req.json();

    const quest = await db.playerQuest.findFirst({
      where: { id: questId, player: { telegramId } },
    });

    if (!quest) return NextResponse.json({ error: 'Квест не найден' }, { status: 404 });
    if (!quest.completed) return NextResponse.json({ error: 'Квест не выполнен' }, { status: 400 });
    if (quest.claimed) return NextResponse.json({ error: 'Награда уже получена' }, { status: 400 });

    const reward = JSON.parse(quest.reward);

    const player = await db.player.findUnique({
      where: { telegramId },
    });

    if (!player) return NextResponse.json({ error: 'Персонаж не найден' }, { status: 404 });

    // "Принеси предмет"-квесты (см. lib/quests.ts collectQuestType) сдаются вместе с самим
    // предметом — иначе игрок получал бы награду и оставлял себе предмет, теряя смысл сдачи.
    const requiredItemId = collectQuestItemId(quest.type);
    let turnInInventoryId: string | null = null;
    if (requiredItemId) {
      const turnInItem = await db.inventory.findFirst({ where: { playerId: player.id, itemId: requiredItemId } });
      if (!turnInItem) {
        return NextResponse.json({ error: 'У вас больше нет предмета для сдачи этого квеста' }, { status: 400 });
      }
      turnInInventoryId = turnInItem.id;
    }

    // Level up if the XP reward pushes past the threshold (как в combat/action и daily)
    let newXp = player.xp + (reward.xp || 0);
    let newLevel = player.level;
    let newXpToNext = player.xpToNext;
    let newStatPoints = player.statPoints;
    let leveledUp = false;
    while (newXp >= newXpToNext) {
      newXp -= newXpToNext;
      newLevel++;
      newXpToNext = newLevel * 100;
      newStatPoints += 2;
      leveledUp = true;
    }

    // Wrap reward giving + item additions + quest claiming in a transaction. quest.claimed
    // выше — снимок ДО транзакции; параллельный дубликат того же запроса (двойной тап) прочёл
    // бы тот же снимок claimed:false и тоже прошёл бы проверку — награда выдалась бы дважды.
    // Поэтому пометка "получено" — САМО условие (claimed: false), проверяемое атомарно в
    // момент записи через updateMany, и идёт ПЕРВОЙ операцией в транзакции: если она не
    // применилась (count===0), значит кто-то другой уже забрал награду — откатываем всё,
    // ничего не выдав повторно.
    await db.$transaction(async (tx) => {
      const claimResult = await tx.playerQuest.updateMany({
        where: { id: questId, claimed: false },
        data: { claimed: true },
      });
      if (claimResult.count === 0) throw new AlreadyClaimedError();

      // Give gold/XP rewards
      const updateData: Record<string, unknown> = {
        xp: newXp,
        gold: { increment: reward.gold || 0 },
      };
      if (leveledUp) {
        updateData.level = newLevel;
        updateData.xpToNext = newXpToNext;
        updateData.statPoints = newStatPoints;
        const newMaxHp = player.maxHp + 10 * (newLevel - player.level);
        updateData.maxHp = newMaxHp;
        updateData.hp = newMaxHp; // Full heal on level up
      }

      await tx.player.update({ where: { telegramId }, data: updateData });

      // Give item rewards (stack consumables/materials)
      if (reward.items) {
        for (const rewardItemId of reward.items) {
          const itemData = ITEMS.find(i => i.id === rewardItemId);
          if (itemData) {
            await addItemToInventory({
              playerId: player.id,
              itemId: itemData.id,
              name: itemData.nameRu,
              type: itemData.type,
              rarity: itemData.rarity,
              stats: JSON.stringify(itemData.stats),
              icon: itemData.icon,
              quantity: 1,
            }, tx);
          }
        }
      }

      // Consume the turned-in quest item — атомарно (та же логика, что и claimResult выше):
      // два разных квеста, ссылающихся на один и тот же requiredItemId, могли бы параллельно
      // попытаться сдать последний экземпляр предмета.
      if (turnInInventoryId) {
        const consumeResult = await tx.inventory.updateMany({
          where: { id: turnInInventoryId, quantity: { gte: 1 } },
          data: { quantity: { decrement: 1 } },
        });
        if (consumeResult.count > 0) {
          await tx.inventory.deleteMany({ where: { id: turnInInventoryId, quantity: { lte: 0 } } });
        }
      }
    });

    return NextResponse.json({ message: 'Награда получена!', reward, leveledUp, newLevel });
  } catch (error) {
    if (error instanceof AlreadyClaimedError) {
      return NextResponse.json({ error: 'Награда уже получена' }, { status: 400 });
    }
    console.error('[API] Route error:', error);
    if (error instanceof Error && error.message?.includes('connection')) {
      return NextResponse.json({ error: 'Ошибка подключения к базе данных. Попробуйте позже.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Произошла внутренняя ошибка. Попробуйте позже.' }, { status: 500 });
  }
}
