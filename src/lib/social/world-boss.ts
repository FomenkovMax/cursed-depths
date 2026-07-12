/**
 * Мировой босс — общая цель для всех игроков разом (фаза 8, последний пункт из
 * конкурентного анализа: "Зов Теней" — еженедельный ритуал-босс, у нас гильдии до сих пор
 * были декоративны). Не полноценный синхронный рейд-бой (нет инфры для этого, см.
 * обоснование в party-combat/pvp) — разовый вклад урона в общий пул HP, без ответного урона
 * игроку. Респавнится сразу после убийства, каждое следующее воплощение чуть крепче.
 */

import { basicAttackDamage, type PlayerCombatStats } from '@/lib/combat/combat-engine';
import { db } from '@/lib/db';

type PrismaClientLike = { worldBoss: typeof db.worldBoss };

export const WORLD_BOSS_ID = 'current';
export const WORLD_BOSS_NAME = 'Пробуждённый Исполин Пепла';
/** Объясняет игроку саму механику "incarnation" — не просто респавн, а нарастающее
 * пробуждение одного и того же существа, каждый раз чуть крепче прошлого. */
export const WORLD_BOSS_LORE = 'Когда-то он охранял первый Разлом и не смог его удержать. Голос Карсуса поднимает пепел его тела снова и снова — каждое воплощение чуть крепче и чуть голоднее прошлого.';
export const DAILY_ATTACK_CAP = 5;
/** Премиум даёт вдвое больше попыток в день — чем больше атак, тем больше суммарный урон и,
 * значит, доля в rewardForShare (см. ниже): это ощутимое, а не косметическое преимущество. */
export const PREMIUM_DAILY_ATTACK_CAP = 10;

export function dailyAttackCapFor(isPremium: boolean): number {
  return isPremium ? PREMIUM_DAILY_ATTACK_CAP : DAILY_ATTACK_CAP;
}

const BASE_MAX_HP = 8000;
const MAX_HP_GROWTH = 1.12; // на 12% крепче с каждым следующим воплощением

export function maxHpForIncarnation(incarnation: number): number {
  return Math.round(BASE_MAX_HP * Math.pow(MAX_HP_GROWTH, incarnation - 1));
}

/** Лениво создаёт синглтон-строку мирового босса при первом обращении (тот же паттерн, что
 * бэкфилл квестовых цепочек/ачивок в этой сессии — никакой cron-инфраструктуры не нужно). */
export async function ensureWorldBossSpawned(client: PrismaClientLike) {
  const existing = await client.worldBoss.findUnique({ where: { id: WORLD_BOSS_ID } });
  if (existing) return existing;
  const maxHp = maxHpForIncarnation(1);
  try {
    return await client.worldBoss.create({ data: { id: WORLD_BOSS_ID, incarnation: 1, name: WORLD_BOSS_NAME, hp: maxHp, maxHp } });
  } catch {
    // Гонка: параллельный запрос успел создать синглтон первым — просто читаем то, что есть.
    const created = await client.worldBoss.findUnique({ where: { id: WORLD_BOSS_ID } });
    if (!created) throw new Error('WORLD_BOSS_SPAWN_RACE');
    return created;
  }
}

/** Урон одного удара по мировому боссу — без смягчения защитой (у него нет "Стойкости",
 * это общая цель, а не полноценный противник), но с тем же бонусом оружия, что и обычная атака. */
export function worldBossAttackDamage(stats: PlayerCombatStats, weaponBonus: number): number {
  return basicAttackDamage(stats) + weaponBonus;
}

// Награда за убийство делится пропорционально урону, но с полом — даже минимальный вклад
// что-то даёт, чтобы участие никогда не ощущалось бесплатным.
const KILL_REWARD_GOLD = 2000;
const KILL_REWARD_XP = 1500;
const MIN_SHARE_GOLD = 10;
const MIN_SHARE_XP = 5;

export function rewardForShare(damageShare: number): { gold: number; xp: number } {
  return {
    gold: Math.max(MIN_SHARE_GOLD, Math.round(KILL_REWARD_GOLD * damageShare)),
    xp: Math.max(MIN_SHARE_XP, Math.round(KILL_REWARD_XP * damageShare)),
  };
}
