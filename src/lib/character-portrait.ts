import type { PlayerData } from '@/lib/game-types';
import { stageUnlockLevel } from '@/lib/combat/combat-engine';
import { CLASS_PORTRAIT_IMAGES, CLASS_STAGE_PORTRAIT_IMAGES } from '@/lib/asset-icons';

/** Наивысшая открытая стадия эволюции класса игрока (1, если эволюций ещё нет) — та же логика,
 * что в GameHeader.getEvolvedStageName, но возвращает номер стадии, а не lore-название. */
export function getEvolvedStage(player: PlayerData): number {
  const abilities = player.class.abilities || [];
  let best = 1;
  for (const a of abilities) {
    if (a.stage > best && player.level >= stageUnlockLevel(a.stage)) {
      best = a.stage;
    }
  }
  return best;
}

/** Портрет персонажа под его текущую открытую эволюцию класса — эволюционная форма (стадия 2/3),
 * если она уже открыта и для неё есть картинка, иначе базовый портрет класса (стадия 1). */
export function currentClassPortrait(player: PlayerData): string | undefined {
  const stage = getEvolvedStage(player);
  const slug = player.class.slug;
  if (stage > 1) {
    const staged = CLASS_STAGE_PORTRAIT_IMAGES[`${slug}:${stage}`];
    if (staged) return staged;
  }
  return CLASS_PORTRAIT_IMAGES[slug];
}
