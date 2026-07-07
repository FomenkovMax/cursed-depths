import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RARITY_COLORS, RARITY_NAMES_RU } from '@/lib/game-data';
import { PlayerData, SLOT_RU, ITEM_TYPE_RU, parseStats } from '@/lib/game-types';

interface InventoryTabProps {
  player: PlayerData | null;
  loading: boolean;
  onEquip: (inventoryId: string) => void;
  onUseItem: (inventoryId: string) => void;
}

export function InventoryTab({ player, loading, onEquip, onUseItem }: InventoryTabProps) {
  const playerInventory = player?.inventory || [];

  return (
    <TabsContent value="inventory" className="flex-1 overflow-y-auto p-4 space-y-3 m-0">
      {/* Equipped section */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">Экипировано</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {playerInventory.filter(i => i.equipped).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">Ничего не экипировано</p>
          ) : (
            <div className="space-y-2">
              {playerInventory.filter(i => i.equipped).map(item => {
                const stats = parseStats(item.stats);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 border animate-pulse-border"
                    style={{ borderColor: RARITY_COLORS[item.rarity] + '50' }}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate" style={{ color: RARITY_COLORS[item.rarity] }}>
                        {item.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {SLOT_RU[item.slot || ''] || ITEM_TYPE_RU[item.type]} • {RARITY_NAMES_RU[item.rarity]}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {Object.entries(stats).map(([k, v]) => (
                        <span key={k} className="text-[10px] text-uncommon">+{v} {k === 'attack' ? '⚔️' : k === 'defense' ? '🛡️' : k === 'hp' ? '❤️' : k === 'mp' ? '💧' : ''}</span>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] px-2 border-border ml-1"
                        onClick={() => onEquip(item.id)}
                        disabled={loading}
                      >
                        Снять
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All items section */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">
            Инвентарь ({playerInventory.filter(i => !i.equipped).length || 0} предметов)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {playerInventory.filter(i => !i.equipped).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">Инвентарь пуст</p>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-2 pr-2">
                {playerInventory.filter(i => !i.equipped).map(item => {
                  const stats = parseStats(item.stats);
                  const canEquip = ['weapon', 'armor', 'accessory'].includes(item.type);
                  const canUse = item.type === 'consumable';
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-secondary/20 border transition-all hover:bg-secondary/40"
                      style={{ borderColor: RARITY_COLORS[item.rarity] + '30' }}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate" style={{ color: RARITY_COLORS[item.rarity] }}>
                          {item.name} {item.quantity > 1 ? `x${item.quantity}` : ''}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">
                            {ITEM_TYPE_RU[item.type]} • {RARITY_NAMES_RU[item.rarity]}
                          </span>
                        </div>
                        {Object.keys(stats).length > 0 && (
                          <div className="flex gap-1 mt-0.5 flex-wrap">
                            {Object.entries(stats).map(([k, v]) => (
                              <Badge key={k} variant="outline" className="text-[9px] h-4 px-1">
                                {k === 'attack' ? 'АТК' : k === 'defense' ? 'ЗАЩ' : k === 'healHp' ? 'ЛечHP' : k === 'healMp' ? 'ЛечMP' : k === 'damage' ? 'Урон' : k} +{v}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {canEquip && (
                          <Button
                            size="sm"
                            className="h-6 text-[10px] px-2"
                            onClick={() => onEquip(item.id)}
                            disabled={loading}
                          >
                            Надеть
                          </Button>
                        )}
                        {canUse && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] px-2 border-border"
                            onClick={() => onUseItem(item.id)}
                            disabled={loading}
                          >
                            Исп.
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
