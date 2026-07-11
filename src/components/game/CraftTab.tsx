import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ItemIconTile } from '@/components/game/ItemIconTile';
import { CRAFTING_RECIPES, ITEMS, RARITY_COLORS } from '@/lib/game-data';
import { PlayerData, AFFIX_TIER_RU, AFFIX_TIER_COLORS, parseStats, parseAffixes } from '@/lib/game-types';
import { CURRENCY_IDS } from '@/lib/item-affixes';
import { MAX_ENHANCEMENT_LEVEL, temperSuccessChance } from '@/lib/item-enhancement';

interface CraftTabProps {
  player: PlayerData | null;
  loading: boolean;
  canCraftRecipe: (recipe: typeof CRAFTING_RECIPES[0]) => boolean;
  learnedRecipeIds: Set<string>;
  onCraft: (recipeId: string) => void;
  onApplyCurrency: (inventoryId: string, currencyItemId: string) => void;
  onTemper: (inventoryId: string) => void;
}

const TIER_LABELS: Record<number, string> = { 1: 'Тир I', 2: 'Тир II', 3: 'Тир III' };
const TIER_COLORS: Record<number, string> = { 1: '#9ca3af', 2: '#3b82f6', 3: '#f59e0b' };
const TEMPER_SCROLL_ITEM_ID = 'tempering_scroll';

export function CraftTab({ player, loading, canCraftRecipe, learnedRecipeIds, onCraft, onApplyCurrency, onTemper }: CraftTabProps) {
  const playerInventory = player?.inventory || [];
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const gearItems = playerInventory.filter(i => !i.equipped && ['weapon', 'armor', 'accessory'].includes(i.type));
  const currencyItems = playerInventory.filter(i => i.type === 'currency');
  const selectedTarget = gearItems.find(i => i.id === selectedTargetId) ?? null;

  return (
    <TabsContent value="craft" className="flex-1 overflow-y-auto p-4 space-y-3 m-0">
      <div className="text-center mb-2">
        <h3 className="font-bold text-sm">⚒️ Кузница</h3>
        <p className="text-xs text-muted-foreground">Создавайте предметы из материалов</p>
      </div>

      {/* Current materials */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">Ваши материалы</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {playerInventory.filter(i => i.type === 'material').length === 0 ? (
            <p className="text-xs text-muted-foreground text-center">Нет материалов</p>
          ) : (
            <div className="grid grid-cols-6 gap-2">
              {playerInventory.filter(i => i.type === 'material').map(item => (
                <ItemIconTile key={item.id} item={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Мастерская зачарования — крафт-валюта, катает случайные аффиксы на снаряжении.
          См. lib/item-affixes.ts: rarity предмета не трогается, affixTier — независимая ось. */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">🔮 Мастерская зачарования</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          {gearItems.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center">Нет снаряжения для переработки (снимите экипированное)</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Выберите предмет:</p>
              <div className="max-h-40 overflow-y-auto pr-1">
                <div className="grid grid-cols-6 gap-2">
                  {gearItems.map(item => (
                    <ItemIconTile
                      key={item.id}
                      item={item}
                      selected={selectedTargetId === item.id}
                      onClick={() => setSelectedTargetId(item.id === selectedTargetId ? null : item.id)}
                    />
                  ))}
                </div>
              </div>

              {selectedTarget && (
                <div className="rounded-md border border-border/60 p-2 bg-secondary/20">
                  <div className="text-xs font-medium" style={{ color: RARITY_COLORS[selectedTarget.rarity] }}>
                    {selectedTarget.name}
                    {selectedTarget.enhancementLevel > 0 && <span className="ml-1 text-gold">+{selectedTarget.enhancementLevel}</span>}
                    {selectedTarget.affixTier && AFFIX_TIER_RU[selectedTarget.affixTier] && (
                      <span className="ml-1 text-[9px]" style={{ color: AFFIX_TIER_COLORS[selectedTarget.affixTier] }}>
                        [{AFFIX_TIER_RU[selectedTarget.affixTier]}]
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {Object.entries(parseStats(selectedTarget.stats)).map(([k, v]) => (
                      <Badge key={k} variant="outline" className="text-[9px] h-4 px-1">{k} +{v}</Badge>
                    ))}
                  </div>
                  {parseAffixes(selectedTarget.affixes).length > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Свойства: {parseAffixes(selectedTarget.affixes).map(a => a.labelRu).join(', ')}
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground pt-1">Крафт-валюта:</p>
              {currencyItems.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center">Крафт-валюта пока не найдена — падает с врагов и в исследованиях</p>
              ) : (
                <div className="space-y-1.5">
                  {CURRENCY_IDS.map(currencyId => {
                    const currencyDef = ITEMS.find(i => i.id === currencyId);
                    const owned = currencyItems.find(i => i.itemId === currencyId);
                    if (!currencyDef) return null;
                    return (
                      <div key={currencyId} className="flex items-center gap-2 p-1.5 rounded bg-secondary/10">
                        <span className="text-lg shrink-0">{currencyDef.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium">{currencyDef.nameRu} {owned ? `x${owned.quantity}` : 'x0'}</div>
                          <div className="text-[10px] text-muted-foreground">{currencyDef.descriptionRu}</div>
                        </div>
                        <Button
                          size="sm"
                          className="h-7 text-xs shrink-0"
                          disabled={!selectedTarget || !owned || loading}
                          onClick={() => selectedTarget && onApplyCurrency(selectedTarget.id, currencyId)}
                        >
                          Применить
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Закалка — риск-система заточки, см. lib/item-enhancement.ts. Использует тот же
          selectedTarget, что и Мастерская зачарования выше — один и тот же предмет можно
          и перекатать, и закалить. */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">⚔️ Закалка</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          {!selectedTarget ? (
            <p className="text-xs text-muted-foreground text-center">Выберите предмет в Мастерской зачарования выше</p>
          ) : (
            (() => {
              const scroll = playerInventory.find(i => i.itemId === TEMPER_SCROLL_ITEM_ID && i.type === 'currency');
              const atMax = selectedTarget.enhancementLevel >= MAX_ENHANCEMENT_LEVEL;
              const chance = Math.round(temperSuccessChance(selectedTarget.enhancementLevel) * 100);
              return (
                <div className="flex items-center gap-2 p-1.5 rounded bg-secondary/10">
                  <span className="text-lg shrink-0">📯</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium">
                      Свиток Закалки {scroll ? `x${scroll.quantity}` : 'x0'}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {atMax
                        ? `Максимальный уровень (+${MAX_ENHANCEMENT_LEVEL}) уже достигнут`
                        : `Текущий уровень +${selectedTarget.enhancementLevel} → +${selectedTarget.enhancementLevel + 1}, шанс успеха ${chance}%. При неудаче предмет не пострадает.`}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 text-xs shrink-0"
                    disabled={!scroll || atMax || loading}
                    onClick={() => onTemper(selectedTarget.id)}
                  >
                    Закалить
                  </Button>
                </div>
              );
            })()
          )}
        </CardContent>
      </Card>

      {/* Recipes */}
      <ScrollArea className="max-h-[55vh]">
        <div className="space-y-2 pr-2">
          {CRAFTING_RECIPES.map(recipe => {
            const canCraft = canCraftRecipe(recipe);
            const resultItem = ITEMS.find(i => i.id === recipe.result.itemId);
            const levelLocked = (player?.level ?? 0) < recipe.minLevel;
            const blueprintLocked = !!recipe.requiresBlueprintId && !learnedRecipeIds.has(recipe.id);
            const blueprintItem = recipe.requiresBlueprintId ? ITEMS.find(i => i.id === recipe.requiresBlueprintId) : null;

            return (
              <Card key={recipe.id} className={`border-border ${canCraft ? '' : 'opacity-60'}`}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{recipe.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-sm">{recipe.nameRu}</h4>
                        <Badge
                          variant="outline"
                          className="text-[9px] h-4 px-1"
                          style={{ color: TIER_COLORS[recipe.tier], borderColor: TIER_COLORS[recipe.tier] + '50' }}
                        >
                          {TIER_LABELS[recipe.tier]}
                        </Badge>
                        {levelLocked && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 text-destructive border-destructive/30">
                            🔒 Ур. {recipe.minLevel}+
                          </Badge>
                        )}
                        {blueprintLocked && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 text-gold border-gold/30">
                            📜 Нужен чертёж: {blueprintItem?.nameRu ?? ''}
                          </Badge>
                        )}
                      </div>

                      {/* Materials needed */}
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {recipe.materials.map(mat => {
                          const matItem = ITEMS.find(i => i.id === mat.itemId);
                          const invItem = playerInventory.find(i => i.itemId === mat.itemId);
                          const hasEnough = (invItem?.quantity || 0) >= mat.quantity;
                          return (
                            <Badge
                              key={mat.itemId}
                              variant="outline"
                              className={`text-[10px] h-5 px-1 ${hasEnough ? 'text-uncommon border-uncommon/30' : 'text-destructive border-destructive/30'}`}
                            >
                              {matItem?.icon} {matItem?.nameRu} x{mat.quantity}
                              {!hasEnough && ` (${invItem?.quantity || 0})`}
                            </Badge>
                          );
                        })}
                      </div>

                      {/* Result */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-muted-foreground">Результат:</span>
                        {resultItem && (
                          <span className="text-xs font-medium" style={{ color: RARITY_COLORS[resultItem.rarity] }}>
                            {resultItem.icon} {resultItem.nameRu}
                            {recipe.result.quantity > 1 ? ` x${recipe.result.quantity}` : ''}
                          </span>
                        )}
                        {recipe.tier > 1 && (
                          <span className="text-[10px] text-gold">🍀 шанс бонуса</span>
                        )}
                      </div>

                      {/* Craft button */}
                      <Button
                        size="sm"
                        className="mt-2 h-7 text-xs"
                        disabled={!canCraft || loading}
                        onClick={() => onCraft(recipe.id)}
                      >
                        ⚒️ Создать
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </TabsContent>
  );
}
