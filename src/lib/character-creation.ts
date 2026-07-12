import { Prisma, PrismaClient } from '@prisma/client';
import { issueDailyQuests, issueChainQuests } from '@/lib/economy/quests';
import { markLocationVisited } from '@/lib/economy/fast-travel';

type Tx = Prisma.TransactionClient | PrismaClient;

export interface CreateCharacterInput {
  telegramId: string;
  name: string;
  raceId: string;
  classId: string;
  baseStrength: number;
  baseDexterity: number;
  baseVitality: number;
  baseIntellect: number;
  baseWillpower: number;
  baseInstinct: number;
  /** Только для второго слота (аудит 4.1, D1/D3) — см. Player.accountId в schema.prisma. */
  accountId?: string;
  slotNumber?: number;
}

/** Общая логика создания персонажа — выдача стартового снаряжения/квестов/локации, единая для
 * первого слота (POST /api/player/create) и второго (POST /api/account/create-character), чтобы
 * не дублировать её между роутами. Вызывающий код сам оборачивает это в транзакцию и решает,
 * что делать с готовым Player.id (для второго слота — сразу передать в switchActiveCharacter). */
export async function createCharacter(tx: Tx, input: CreateCharacterInput) {
  const maxHp = 50 + input.baseVitality * 5;
  const maxMp = 100 + input.baseWillpower * 2;

  const created = await tx.player.create({
    data: {
      telegramId: input.telegramId,
      accountId: input.accountId,
      slotNumber: input.slotNumber ?? 1,
      name: input.name,
      raceId: input.raceId,
      classId: input.classId,
      strength: input.baseStrength,
      dexterity: input.baseDexterity,
      vitality: input.baseVitality,
      intellect: input.baseIntellect,
      willpower: input.baseWillpower,
      instinct: input.baseInstinct,
      hp: maxHp,
      maxHp,
      mp: maxMp,
      maxMp,
    },
  });

  await tx.inventory.createMany({
    data: [
      { playerId: created.id, itemId: 'rusty_sword', name: 'Ржавый меч', type: 'weapon', rarity: 'common', equipped: true, slot: 'weapon', stats: '{"attack":2}', icon: '🗡️' },
      { playerId: created.id, itemId: 'leather_armor', name: 'Кожаная броня', type: 'armor', rarity: 'common', equipped: true, slot: 'body', stats: '{"defense":2}', icon: '🦺' },
      { playerId: created.id, itemId: 'health_potion', name: 'Зелье здоровья', type: 'consumable', rarity: 'common', stats: '{"healHp":15}', icon: '🧪', quantity: 3 },
    ],
  });

  await issueDailyQuests(tx, created.id, created.level);
  await issueChainQuests(tx, created.id);
  await markLocationVisited(tx, created.id, created.locationId);

  return created;
}
