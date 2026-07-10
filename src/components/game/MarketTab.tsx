import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RARITY_COLORS } from '@/lib/game-data';
import { PlayerData, MarketListingView, AFFIX_TIER_RU, AFFIX_TIER_COLORS, parseStats } from '@/lib/game-types';

interface MarketTabProps {
  player: PlayerData | null;
  listings: MarketListingView[];
  loading: boolean;
  onListItem: (inventoryId: string, price: number) => void;
  onBuyItem: (listingId: string) => void;
  onCancelListing: (listingId: string) => void;
}

export function MarketTab({ player, listings, loading, onListItem, onBuyItem, onCancelListing }: MarketTabProps) {
  const playerInventory = player?.inventory || [];
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const sellableItems = playerInventory.filter(i => !i.equipped && i.type !== 'quest');

  const handleList = () => {
    const priceNum = parseInt(price, 10);
    if (!selectedItemId || !priceNum || priceNum < 1) return;
    onListItem(selectedItemId, priceNum);
    setSelectedItemId(null);
    setPrice('');
  };

  return (
    <TabsContent value="market" className="flex-1 overflow-y-auto p-4 space-y-3 m-0">
      <div className="text-center mb-2">
        <h3 className="font-bold text-sm">🏛️ Аукцион</h3>
        <p className="text-xs text-muted-foreground">Торговля между игроками — комиссия 10% при продаже</p>
      </div>

      {/* Выставить предмет на продажу */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">Выставить предмет</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          {sellableItems.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center">Нечего продавать (снимите экипированное)</p>
          ) : (
            <>
              <div className="max-h-28 overflow-y-auto pr-1">
                <div className="flex gap-1 flex-wrap">
                  {sellableItems.map(item => (
                    <Button
                      key={item.id}
                      variant="outline"
                      size="sm"
                      className={`h-8 text-xs border-border ${selectedItemId === item.id ? 'border-gold text-gold' : ''}`}
                      onClick={() => setSelectedItemId(item.id === selectedItemId ? null : item.id)}
                    >
                      {item.icon} {item.name} {item.quantity > 1 ? `x${item.quantity}` : ''}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  placeholder="Цена в золоте"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button size="sm" className="h-8 text-xs shrink-0" disabled={!selectedItemId || !price || loading} onClick={handleList}>
                  Выставить
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Активные лоты */}
      <div className="space-y-2">
        {listings.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">На аукционе пока пусто</p>
            </CardContent>
          </Card>
        ) : (
          listings.map(l => {
            const stats = parseStats(l.stats);
            return (
              <Card key={l.id} className={`border-border ${l.isOwn ? 'border-primary/40' : ''}`}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xl shrink-0">{l.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium" style={{ color: RARITY_COLORS[l.rarity] }}>
                        {l.name} {l.quantity > 1 ? `x${l.quantity}` : ''}
                        {l.enhancementLevel > 0 && <span className="ml-1 text-gold">+{l.enhancementLevel}</span>}
                        {l.affixTier && AFFIX_TIER_RU[l.affixTier] && (
                          <span className="ml-1 text-[9px]" style={{ color: AFFIX_TIER_COLORS[l.affixTier] }}>
                            [{AFFIX_TIER_RU[l.affixTier]}]
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Продавец: {l.isOwn ? 'вы' : l.sellerName}</div>
                      {Object.keys(stats).length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {Object.entries(stats).map(([k, v]) => (
                            <Badge key={k} variant="outline" className="text-[9px] h-4 px-1">{k} +{v}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs text-gold font-bold">💰 {l.price}</span>
                      {l.isOwn ? (
                        <Button variant="outline" size="sm" className="h-7 text-xs border-destructive/50 text-destructive" disabled={loading} onClick={() => onCancelListing(l.id)}>
                          Снять
                        </Button>
                      ) : (
                        <Button size="sm" className="h-7 text-xs" disabled={loading || (player?.gold ?? 0) < l.price} onClick={() => onBuyItem(l.id)}>
                          Купить
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </TabsContent>
  );
}
