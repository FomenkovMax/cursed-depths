/** Стрик за подряд идущие дни ежедневной награды (аудит #2, топ-10 #2) — классический
 * day1..7 retention-хук, которого раньше не было вовсе. 7-дневный повторяющийся цикл: множитель
 * гэйна растёт до дня 7 (с бонус-предметом), затем цикл начинается заново — стрик НЕ обнуляется
 * сам по себе по достижении 7, обнуляет только пропущенный день (см. computeNextStreak). */
export const STREAK_CYCLE_LENGTH = 7;

export const STREAK_MULTIPLIERS: Record<number, number> = {
  1: 1,
  2: 1.15,
  3: 1.3,
  4: 1.5,
  5: 1.75,
  6: 2,
  7: 2.5,
};

/** День 7-дневного цикла (1-7) для текущей длины стрика — 8-й день подряд снова считается как
 * «день 1» цикла, а не безостановочно растущий множитель. */
export function streakDayInCycle(streak: number): number {
  return ((streak - 1) % STREAK_CYCLE_LENGTH) + 1;
}

/** Новая длина стрика по факту клейма today, зная дату и длину стрика ПРЕДЫДУЩЕГО клейма.
 * Подряд (клейм был вчера) — стрик растёт на 1; пропуск (клейм был позавчера или раньше) или
 * первый клейм в жизни (null) — стрик начинается заново с 1 (today — уже день 1, не 0). */
export function computeNextStreak(lastClaimDate: string | null, currentStreak: number, today: string): number {
  if (!lastClaimDate) return 1;
  const yesterday = new Date(new Date(`${today}T00:00:00Z`).getTime() - 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  return lastClaimDate === yesterday ? currentStreak + 1 : 1;
}
