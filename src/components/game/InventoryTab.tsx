import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ItemIconTile } from '@/components/game/ItemIconTile';
import { RARITY_COLORS, RARITY_NAMES_RU } from '@/lib/game-data';
import { PlayerData, InventoryItem, StashItemView, SLOT_RU, ITEM_TYPE_RU, AFFIX_TIER_RU, AFFIX_TIER_COLORS, parseStats, parseAffixes } from '@/lib/game-types';

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

type GridItem = InventoryItem | StashItemView;

function statLabel(k: string): string {
  return k === 'attack' ? 'АТК' : k === 'defense' ? 'ЗАЩ' : k === 'healHp' ? 'ЛечHP' : k === 'healMp' ? 'ЛечMP' : k === 'damage' ? 'Урон' : k;
}

export function InventoryTab({
  player, loading, onEquip, onUseItem, onLearnBlueprint,
  stashItems, stashCapacity, stashLoading, onStoreItem, onRetrieveItem,
}: InventoryTabProps) {
  const playerInventory = player?.inventory || [];
  const [view, setView] = useState<'inventory' | 'stash'>('inventory');
  const [detail, setDetail] = useState<{ item: GridItem; source: 'inventory' | 'stash' } | null>(null);

  const equipped = playerInventory.filter(i => i.equipped);
  const unequipped = playerInventory.filter(i => !i.equipped);

  const detailStats = detail ? parseStats(detail.item.stats) : {};
  const detailAffixes = detail ? parseAffixes(detail.item.affixes) : [];
  const canEquip = detail ? ['weapon', 'armor', 'accessory'].includes(detail.item.type) : false;
  const canUse = detail?.item.type === 'consumable';
  const canLearn = detail?.item.type === 'blueprint';

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
              <div className="grid grid-cols-5 gap-2">
                {stashItems.map(item => (
                  <ItemIconTile key={item.id} item={item} onClick={() => setDetail({ item, source: 'stash' })} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Экипировано */}
          <Card className="border-border">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm">Экипировано</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {equipped.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Ничего не экипировано</p>
              ) : (
                <div className="grid grid-cols-5 gap-2">
                  {equipped.map(item => (
                    <ItemIconTile key={item.id} item={item} equipped onClick={() => setDetail({ item, source: 'inventory' })} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Инвентарь — сетка иконок вместо текстовых строк, деталь по тапу (как в Подземельях Колодца) */}
          <Card className="border-border">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm">
                Инвентарь ({unequipped.length} предметов)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {unequipped.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Инвентарь пуст</p>
              ) : (
                <div className="grid grid-cols-5 gap-2">
                  {unequipped.map(item => (
                    <ItemIconTile key={item.id} item={item} onClick={() => setDetail({ item, source: 'inventory' })} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={!!detail} onOpenChange={open => !open && setDetail(null)}>
        <DialogContent className="max-w-xs">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-sm" style={{ color: RARITY_COLORS[detail.item.rarity] }}>
                  <span className="text-2xl">{detail.item.icon}</span>
                  <span>
                    {detail.item.name}
                    {detail.item.enhancementLevel > 0 && <span className="ml-1 text-gold">+{detail.item.enhancementLevel}</span>}
                  </span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  {('slot' in detail.item && detail.item.slot && SLOT_RU[detail.item.slot]) || ITEM_TYPE_RU[detail.item.type]} • {RARITY_NAMES_RU[detail.item.rarity]}
                  {detail.item.quantity > 1 && ` • x${detail.item.quantity}`}
                </div>
                {detail.item.affixTier && AFFIX_TIER_RU[detail.item.affixTier] && (
                  <Badge className="text-[10px]" style={{ backgroundColor: AFFIX_TIER_COLORS[detail.item.affixTier] + '20', color: AFFIX_TIER_COLORS[detail.item.affixTier] }}>
                    {AFFIX_TIER_RU[detail.item.affixTier]}
                  </Badge>
                )}
                {Object.keys(detailStats).length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {Object.entries(detailStats).map(([k, v]) => (
                      <Badge key={k} variant="outline" className="text-[10px] h-5 px-1.5">{statLabel(k)} +{v}</Badge>
                    ))}
                  </div>
                )}
                {detailAffixes.length > 0 && (
                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    {detailAffixes.map((a, i) => <div key={i}>• {a.labelRu} +{a.value}</div>)}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5 pt-1">
                {detail.source === 'stash' ? (
                  <Button size="sm" onClick={() => { onRetrieveItem(detail.item.id); setDetail(null); }} disabled={loading}>
                    Достать в инвентарь
                  </Button>
                ) : (
                  <>
                    {(detail.item as InventoryItem).equipped ? (
                      <Button size="sm" variant="outline" className="border-border" onClick={() => { onEquip(detail.item.id); setDetail(null); }} disabled={loading}>
                        Снять
                      </Button>
                    ) : (
                      <>
                        {canEquip && (
                          <Button size="sm" onClick={() => { onEquip(detail.item.id); setDetail(null); }} disabled={loading}>
                            Надеть
                          </Button>
                        )}
                        {canUse && (
                          <Button size="sm" variant="outline" className="border-border" onClick={() => { onUseItem(detail.item.id); setDetail(null); }} disabled={loading}>
                            Использовать
                          </Button>
                        )}
                        {canLearn && (
                          <Button size="sm" variant="outline" className="border-gold/50 text-gold" onClick={() => { onLearnBlueprint(detail.item.id); setDetail(null); }} disabled={loading}>
                            📜 Изучить
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-border"
                          onClick={() => { onStoreItem(detail.item.id); setDetail(null); }}
                          disabled={loading || stashItems.length >= stashCapacity}
                        >
                          🗄️ В хранилище
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}
