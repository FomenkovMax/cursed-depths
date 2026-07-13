/**
 * Общие хелперы для api/combat/action/route.ts (аудит #2, топ-10 #8: route разросся до 1150
 * строк, часть — буквально повторяющиеся блоки). Это НЕ движок и не оркестратор — только
 * механическое устранение дублирования, безопасное для самого горячего пути игры (каждый ход
 * боя). Порядок мутаций/транзакция/переходы комнат в route.ts не тронуты.
 */

import type { BossMechanics, BossFightState } from '@/lib/combat/boss-mechanics';
import { applyDamageToBoss } from '@/lib/combat/boss-mechanics';
import { ITEMS, type Item } from '@/lib/game-data';

/** Наносит урон врагу с учётом щита (applyDamageToBoss) и сразу клэмпит enemyHp — тот же
 * двухстрочник (`applyDamageToBoss` + `Math.max(0, enemyHp - hpDamage)`) повторялся 6 раз в
 * route.ts с разным rawDamage. Логи вокруг вызова (текст сообщения отличается на каждом месте:
 * атака/предмет/способность/отражение/контрудар) остаются на месте вызова — здесь только сама
 * механика урона + клэмп. */
export function dealDamageToEnemy(
  mechanics: BossMechanics | undefined,
  bossState: BossFightState,
  currentEnemyHp: number,
  rawDamage: number,
): { enemyHp: number; hpDamage: number; messages: string[] } {
  const { hpDamage, messages } = applyDamageToBoss(mechanics, bossState, rawDamage);
  return { enemyHp: Math.max(0, currentEnemyHp - hpDamage), hpDamage, messages };
}

/** Резолвит список itemId в данные ITEMS, отбрасывая неизвестные — общий первый шаг для трёх
 * циклов сбора добычи в route.ts (лут с убийства, бонус за прохождение данжа, бонус за
 * прохождение испытания). Что делать с результатом (в какие именно массивы push'ить —
 * droppedItems/lootItems/combatLog, с каким turn) отличается на каждом месте и остаётся там. */
export function resolveLootItems(itemIds: string[]): Item[] {
  return itemIds
    .map(id => ITEMS.find(i => i.id === id))
    .filter((item): item is Item => !!item);
}
