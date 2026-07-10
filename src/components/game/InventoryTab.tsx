import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RARITY_COLORS, RARITY_NAMES_RU } from '@/lib/game-data';
import { PlayerData, StashItemView, SLOT_RU, ITEM_TYPE_RU, AFFIX_TIER_RU, AFFIX_TIER_COLORS, parseStats, parseAffixes } from '@/lib/game-types';

interface InventoryTabProps {
  player: PlayerData | null;
  loading: boolean;
  onEquip: (inventoryId: string) => void;
  onUseItem: (inventoryId: string) => void;
  onLearnBlueprint: (inventoryId: string) => void;
  stashItems: StashItemView[];
  stashCapacity: number;
  stashLoading: boolean;
  onStoreItem: (inventoryId: string) => void;
  onRetrieveItem: (stashItemId: string) => void;
}

export function InventoryTab({
  player, loading, onEquip, onUseItem, onLearnBlueprint,
  stashItems, stashCapacity, stashLoading, onStoreItem, onRetrieveItem,
}: InventoryTabProps) {
  const playerInventory = player?.inventory || [];
  const [view, setView] = useState<'inventory' | 'stash'>('inventory');

  return (
    <TabsContent value="inventory" className="flex-1 overflow-y-auto p-4 space-y-3 m-0">
      {/* Переключатель "Инвентарь"/"Хранилище" — сундук отдельный от боевого инвентаря (см.
          schema.prisma StashItem), для коллекционирования без расхода боевых слотов. */}
      <div className="flex gap-1 p-1 bg-secondary/30 rounded-lg">
        <Button
          size="sm"
          variant={view === 'inventory' ? 'default' : 'ghost'}
          className="flex-1 h-8 text-xs"
          onClick={() => setView('inventory')}
        >
          🎒 Инвентарь
        </Button>
        <Button
          size="sm"
          variant={view === 'stash' ? 'default' : 'ghost'}
          className="flex-1 h-8 text-xs"
          onClick={() => setView('stash')}
        >
          🗄️ Хранилище ({stashItems.length}/{stashCapacity})
        </Button>
      </div>

      {view === 'stash' ? (
        <Card className="border-border">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm">Хранилище</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {stashItems.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                {stashLoading ? 'Загрузка...' : 'Хранилище пусто — уберите сюда предметы из инвентаря, чтобы сохранить их'}
              </p>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-2 pr-2">
                  {stashItems.map(item => {
                    const stats = parseStats(item.stats);
                    const affixes = parseAffixes(item.affixes);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-secondary/20 border"
                        style={{ borderColor: RARITY_COLORS[item.rarity] + '30' }}
                      >
                        <span className="text-lg">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate" style={{ color: RARITY_COLORS[item.rarity] }}>
                            {item.name} {item.quantity > 1 ? `x${item.quantity}` : ''}
                            {item.enhancementLevel > 0 && <span className="ml-1 text-gold">+{item.enhancementLevel}</span>}
                            {item.affixTier && AFFIX_TIER_RU[item.affixTier] && (
                              <span className="ml-1 text-[9px]" style={{ color: AFFIX_TIER_COLORS[item.affixTier] }}>
                                [{AFFIX_TIER_RU[item.affixTier]}]
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {ITEM_TYPE_RU[item.type]} • {RARITY_NAMES_RU[item.rarity]}
                            {affixes.length > 0 && ` • ${affixes.map(a => a.labelRu).join(', ')}`}
                          </div>
                          {Object.keys(stats).length > 0 && (
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {Object.entries(stats).map(([k, v]) => (
                                <Badge key={k} variant="outline" className="text-[9px] h-4 px-1">{k} +{v}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] px-2 border-border shrink-0"
                          onClick={() => onRetrieveItem(item.id)}
                          disabled={loading}
                        >
                          Достать
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
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
                const affixes = parseAffixes(item.affixes);
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
                        {item.enhancementLevel > 0 && <span className="ml-1 text-gold">+{item.enhancementLevel}</span>}
                        {item.affixTier && AFFIX_TIER_RU[item.affixTier] && (
                          <span className="ml-1 text-[9px]" style={{ color: AFFIX_TIER_COLORS[item.affixTier] }}>
                            [{AFFIX_TIER_RU[item.affixTier]}]
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {SLOT_RU[item.slot || ''] || ITEM_TYPE_RU[item.type]} • {RARITY_NAMES_RU[item.rarity]}
                        {affixes.length > 0 && ` • ${affixes.map(a => a.labelRu).join(', ')}`}
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
            <ScrollArea className="h-96">
              <div className="space-y-2 pr-2">
                {playerInventory.filter(i => !i.equipped).map(item => {
                  const stats = parseStats(item.stats);
                  const affixes = parseAffixes(item.affixes);
                  const canEquip = ['weapon', 'armor', 'accessory'].includes(item.type);
                  const canUse = item.type === 'consumable';
                  const canLearn = item.type === 'blueprint';
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
                          {item.enhancementLevel > 0 && <span className="ml-1 text-gold">+{item.enhancementLevel}</span>}
                          {item.affixTier && AFFIX_TIER_RU[item.affixTier] && (
                            <span className="ml-1 text-[9px]" style={{ color: AFFIX_TIER_COLORS[item.affixTier] }}>
                              [{AFFIX_TIER_RU[item.affixTier]}]
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">
                            {ITEM_TYPE_RU[item.type]} • {RARITY_NAMES_RU[item.rarity]}
                            {affixes.length > 0 && ` • ${affixes.map(a => a.labelRu).join(', ')}`}
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
                        {canLearn && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] px-2 border-gold/50 text-gold"
                            onClick={() => onLearnBlueprint(item.id)}
                            disabled={loading}
                          >
                            📜 Изучить
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] px-2 border-border"
                          onClick={() => onStoreItem(item.id)}
                          disabled={loading || stashItems.length >= stashCapacity}
                        >
                          🗄️ В хранилище
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
        </>
      )}
    </TabsContent>
  );
}
