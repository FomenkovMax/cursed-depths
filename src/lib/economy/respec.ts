/**
 * Respec — перераспределение уже вложенных очков характеристик. Первый respec бесплатный
 * (Player.respecAvailable), каждый следующий стоит RESPEC_COST_SHARDS Осколков Короны — та же
 * "первый раз бесплатно, дальше платно" модель, что у Смены расы (lib/premium-shop.ts).
 *
 * В отличие от обычной траты очка по одному (api/player/allocate-stat/route.ts), respec
 * принимает ПОЛНОЕ желаемое распределение сразу и валидируется целиком тем же правилом
 * "не более 60% очков в одну характеристику".
 */

export const RESPEC_STAT_FIELDS = ['strength', 'dexterity', 'vitality', 'intellect', 'willpower', 'instinct'] as const;
export type RespecStatField = typeof RESPEC_STAT_FIELDS[number];

/** Сколько очков характеристик игрок когда-либо получил: неизрасходованные (statPoints) плюс
 * уже вложенные (текущий стат минус расовая база) по каждой из 6 характеристик. */
export function totalRespecBudget(
  statPoints: number,
  currentStats: Record<RespecStatField, number>,
  raceBase: Record<RespecStatField, number>,
): number {
  const spent = RESPEC_STAT_FIELDS.reduce((sum, f) => sum + Math.max(0, currentStats[f] - raceBase[f]), 0);
  return statPoints + spent;
}

/** Валидирует предложенное игроком распределение очков respec: неотрицательные целые, в сумме
 * не больше бюджета, и не более 60% ФАКТИЧЕСКИ вложенных (не всего бюджета) очков в одну
 * характеристику — то же правило, что у обычной траты очка по одному. Возвращает текст ошибки
 * или null, если распределение допустимо. */
export function validateRespecAllocations(
  allocations: Record<RespecStatField, number>,
  totalBudget: number,
): string | null {
  let sum = 0;
  for (const field of RESPEC_STAT_FIELDS) {
    const value = allocations[field];
    if (!Number.isInteger(value) || value < 0) return 'Некорректное распределение очков';
    sum += value;
  }
  if (sum > totalBudget) return 'Недостаточно очков для такого распределения';
  if (sum > 0) {
    for (const field of RESPEC_STAT_FIELDS) {
      if (allocations[field] > 0 && allocations[field] / sum > 0.6) {
        return 'Нельзя вложить более 60% очков в одну характеристику';
      }
    }
  }
  return null;
}
