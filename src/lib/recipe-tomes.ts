/**
 * Тома рецептов — премиум-эксклюзивный ИСТОЧНИК тех же 6 чертежей тира 3 (ITEMS type:
 * 'blueprint'/CRAFTING_RECIPES с requiresBlueprintId), что уже штучно капают с топ-боссов по
 * lootTable для ВСЕХ игроков (game-data.ts). F2P-шанс из lootTable НЕ меняется этой механикой —
 * премиум получает ДОПОЛНИТЕЛЬНЫЙ независимый ролл с любой победы в бою, пока не выучит все 6
 * рецептов (PlayerRecipe). Не создаём новый контент — расширяем ДОСТУП к уже существующему,
 * тот же принцип, что у премиум-множителя золота/опыта, но как источник дропа, а не число.
 */

import { ITEMS, CRAFTING_RECIPES, type Item } from './game-data';

export const TOME_DROP_CHANCE = 0.01; // 1% с любой победы в бою, только премиум

function tomeBlueprintItems(): Item[] {
  const blueprintIds = new Set(CRAFTING_RECIPES.filter(r => r.requiresBlueprintId).map(r => r.requiresBlueprintId));
  return ITEMS.filter(i => i.type === 'blueprint' && blueprintIds.has(i.id));
}

/** Равновероятный выбор среди чертежей, чьи рецепты игрок ЕЩЁ НЕ выучил — как только все 6
 * выучены, возвращает null (роллить больше нечего). */
export function pickUncollectedTome(learnedRecipeIds: Set<string>): Item | null {
  const candidates = tomeBlueprintItems().filter(item => {
    const recipe = CRAFTING_RECIPES.find(r => r.requiresBlueprintId === item.id);
    return recipe && !learnedRecipeIds.has(recipe.id);
  });
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
