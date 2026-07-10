import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CRAFTING_RECIPES, ITEMS, RARITY_COLORS } from '@/lib/game-data';
import { PlayerData } from '@/lib/game-types';

interface CraftTabProps {
  player: PlayerData | null;
  loading: boolean;
  canCraftRecipe: (recipe: typeof CRAFTING_RECIPES[0]) => boolean;
  learnedRecipeIds: Set<string>;
  onCraft: (recipeId: string) => void;
}

const TIER_LABELS: Record<number, string> = { 1: 'Тир I', 2: 'Тир II', 3: 'Тир III' };
const TIER_COLORS: Record<number, string> = { 1: '#9ca3af', 2: '#3b82f6', 3: '#f59e0b' };

export function CraftTab({ player, loading, canCraftRecipe, learnedRecipeIds, onCraft }: CraftTabProps) {
  const playerInventory = player?.inventory || [];

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
            <div className="flex gap-2 flex-wrap">
              {playerInventory.filter(i => i.type === 'material').map(item => (
                <div key={item.id} className="flex items-center gap-1 bg-secondary/30 rounded px-2 py-1">
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-xs" style={{ color: RARITY_COLORS[item.rarity] }}>
                    {item.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">x{item.quantity}</span>
                </div>
              ))}
            </div>
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
