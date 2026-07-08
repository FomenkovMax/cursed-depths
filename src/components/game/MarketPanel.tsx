import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getShopBuyableItems, getSellPrice, isSellableItem } from '@/lib/shop';
import { RARITY_COLORS, RARITY_NAMES_RU } from '@/lib/game-data';
import { PlayerData, ITEM_TYPE_RU } from '@/lib/game-types';

interface MarketPanelProps {
  player: PlayerData;
  loading: boolean;
  onBuy: (itemId: string) => void;
  onSell: (inventoryId: string) => void;
}

export function MarketPanel({ player, loading, onBuy, onSell }: MarketPanelProps) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const buyable = getShopBuyableItems();
  const sellableInventory = player.inventory.filter(i => !i.equipped && isSellableItem(i.itemId));

  return (
    <Card className="border-border">
      <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">🏪 Торговый двор</CardTitle>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={mode === 'buy' ? 'default' : 'outline'}
            className="h-6 text-[10px] px-2 border-border"
            onClick={() => setMode('buy')}
          >
            Купить
          </Button>
          <Button
            size="sm"
            variant={mode === 'sell' ? 'default' : 'outline'}
            className="h-6 text-[10px] px-2 border-border"
            onClick={() => setMode('sell')}
          >
            Продать
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <ScrollArea className="h-80">
          <div className="space-y-2 pr-2">
            {mode === 'buy' ? (
              buyable.map(itemData => {
                const canAfford = player.gold >= itemData.value;
                return (
                  <div
                    key={itemData.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-secondary/20 border"
                    style={{ borderColor: RARITY_COLORS[itemData.rarity] + '30' }}
                  >
                    <span className="text-lg">{itemData.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate" style={{ color: RARITY_COLORS[itemData.rarity] }}>
                        {itemData.nameRu}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {ITEM_TYPE_RU[itemData.type]} • {RARITY_NAMES_RU[itemData.rarity]}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="h-7 text-[10px] px-2 shrink-0"
                      disabled={loading || !canAfford}
                      onClick={() => onBuy(itemData.id)}
                    >
                      💰 {itemData.value}
                    </Button>
                  </div>
                );
              })
            ) : sellableInventory.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">Нечего продать</p>
            ) : (
              sellableInventory.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-secondary/20 border"
                  style={{ borderColor: RARITY_COLORS[item.rarity] + '30' }}
                >
                  <span className="text-lg">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate" style={{ color: RARITY_COLORS[item.rarity] }}>
                      {item.name} {item.quantity > 1 ? `x${item.quantity}` : ''}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{ITEM_TYPE_RU[item.type]}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] px-2 border-border shrink-0"
                    disabled={loading}
                    onClick={() => onSell(item.id)}
                  >
                    💰 {getSellPrice(item.itemId)}
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
