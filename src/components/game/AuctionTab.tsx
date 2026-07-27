import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ItemIconTile } from '@/components/game/ItemIconTile';
import { RARITY_COLORS } from '@/lib/game-data';
import { PlayerData, AuctionStateView, AFFIX_TIER_RU, AFFIX_TIER_COLORS, parseStats } from '@/lib/game-types';
import { ITEM_ICON_IMAGES, CURRENCY_ICON_IMAGES } from '@/lib/asset-icons';
import { AssetIcon } from '@/components/game/AssetIcon';

interface AuctionTabProps {
  player: PlayerData | null;
  state: AuctionStateView | null;
  loading: boolean;
  onListItem: (inventoryId: string, startingPrice: number, durationHours: number) => void;
  onBid: (auctionId: string, amount: number) => void;
  onCancelAuction: (auctionId: string) => void;
}

function formatTimeLeft(expiresAtIso: string): string {
  const ms = new Date(expiresAtIso).getTime() - Date.now();
  if (ms <= 0) return 'закрывается...';
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 24) return `${Math.floor(hours / 24)} д. ${hours % 24} ч.`;
  if (hours > 0) return `${hours} ч. ${minutes} мин.`;
  return `${minutes} мин.`;
}

export function AuctionTab({ player, state, loading, onListItem, onBid, onCancelAuction }: AuctionTabProps) {
  const playerInventory = player?.inventory || [];
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [startingPrice, setStartingPrice] = useState('');
  const [durationHours, setDurationHours] = useState<number | null>(null);
  const [bidDrafts, setBidDrafts] = useState<Record<string, string>>({});
  const sellableItems = playerInventory.filter(i => !i.equipped && i.type !== 'quest');

  if (!state?.premiumActive) {
    return (
      <TabsContent value="auction" className="flex-1 overflow-y-auto p-4 space-y-3 m-0">
        <div className="text-center mb-2">
          <h3 className="font-bold text-sm">🔨 Аукционный дом</h3>
        </div>
        <Card className="border-border">
          <CardContent className="p-6 text-center space-y-2">
            <div className="text-3xl">🔨</div>
            <p className="text-sm text-muted-foreground">Аукционный дом доступен только с активным премиум-статусом.</p>
            <p className="text-[10px] text-muted-foreground">
              Отложенные ставки вместо мгновенной покупки — выставьте лот на несколько часов или дней и заберите лучшую цену, а не первую.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    );
  }

  const handleList = () => {
    const priceNum = parseInt(startingPrice, 10);
    if (!selectedItemId || !priceNum || priceNum < 1 || !durationHours) return;
    onListItem(selectedItemId, priceNum, durationHours);
    setSelectedItemId(null);
    setStartingPrice('');
    setDurationHours(null);
  };

  return (
    <TabsContent value="auction" className="flex-1 overflow-y-auto p-4 space-y-3 m-0">
      <div className="text-center mb-2">
        <h3 className="font-bold text-sm">🔨 Аукционный дом</h3>
        <p className="text-xs text-muted-foreground">
          Отложенные ставки — комиссия {Math.round(state.feePercent * 100)}% при закрытии лота с победителем
        </p>
      </div>

      {/* Выставить предмет на аукцион */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">Выставить лот</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          {sellableItems.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center">Нечего продавать (снимите экипированное)</p>
          ) : (
            <>
              <div className="max-h-40 overflow-y-auto pr-1">
                <div className="grid grid-cols-6 gap-2">
                  {sellableItems.map(item => (
                    <ItemIconTile
                      key={item.id}
                      item={item}
                      selected={selectedItemId === item.id}
                      onClick={() => setSelectedItemId(item.id === selectedItemId ? null : item.id)}
                    />
                  ))}
                </div>
              </div>
              {selectedItemId && (
                <p className="text-[10px] text-muted-foreground">
                  {sellableItems.find(i => i.id === selectedItemId)?.name}
                </p>
              )}
              <div className="flex gap-1.5">
                {state.durations.map(d => (
                  <Button
                    key={d.hours}
                    size="sm"
                    variant={durationHours === d.hours ? 'default' : 'outline'}
                    className="h-7 text-[10px] flex-1 border-border"
                    onClick={() => setDurationHours(d.hours)}
                  >
                    {d.labelRu}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  placeholder="Стартовая цена"
                  value={startingPrice}
                  onChange={e => setStartingPrice(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  className="h-8 text-xs shrink-0"
                  disabled={!selectedItemId || !startingPrice || !durationHours || loading}
                  onClick={handleList}
                >
                  Выставить
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Активные лоты */}
      <div className="space-y-2">
        {state.auctions.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">На аукционе пока пусто</p>
            </CardContent>
          </Card>
        ) : (
          state.auctions.map(a => {
            const stats = parseStats(a.stats);
            const draft = bidDrafts[a.id] ?? '';
            return (
              <Card key={a.id} className={`border-border ${a.isOwn ? 'border-primary/40' : a.isMyBid ? 'border-uncommon/40' : ''}`}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <AssetIcon src={ITEM_ICON_IMAGES[a.itemId]} emoji={a.icon ?? ''} size={26} className="text-xl shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium" style={{ color: RARITY_COLORS[a.rarity] }}>
                        {a.name} {a.quantity > 1 ? `x${a.quantity}` : ''}
                        {a.enhancementLevel > 0 && <span className="ml-1 text-gold">+{a.enhancementLevel}</span>}
                        {a.affixTier && AFFIX_TIER_RU[a.affixTier] && (
                          <span className="ml-1 text-[9px]" style={{ color: AFFIX_TIER_COLORS[a.affixTier] }}>
                            [{AFFIX_TIER_RU[a.affixTier]}]
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Продавец: {a.isOwn ? 'вы' : a.sellerName} • ⏳ {formatTimeLeft(a.expiresAt)}
                      </div>
                      {Object.keys(stats).length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {Object.entries(stats).map(([k, v]) => (
                            <Badge key={k} variant="outline" className="text-[9px] h-4 px-1">{k} +{v}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-gold font-bold inline-flex items-center gap-1"><AssetIcon src={CURRENCY_ICON_IMAGES.gold} emoji="💰" size={12} /> {a.currentBid ?? a.startingPrice}</div>
                      <div className="text-[9px] text-muted-foreground">
                        {a.currentBid ? `лидер: ${a.isMyBid ? 'вы' : a.currentBidderName}` : 'ставок нет'}
                      </div>
                    </div>
                  </div>

                  {a.isOwn ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs w-full border-destructive/50 text-destructive"
                      disabled={loading || !!a.currentBid}
                      onClick={() => onCancelAuction(a.id)}
                    >
                      {a.currentBid ? 'Уже есть ставка — снять нельзя' : 'Снять лот'}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={a.minNextBid}
                        placeholder={`от ${a.minNextBid}`}
                        value={draft}
                        onChange={e => setBidDrafts(prev => ({ ...prev, [a.id]: e.target.value }))}
                        className="h-7 text-xs"
                      />
                      <Button
                        size="sm"
                        className="h-7 text-xs shrink-0"
                        disabled={loading || a.isMyBid || !draft || parseInt(draft, 10) < a.minNextBid || (player?.gold ?? 0) < parseInt(draft || '0', 10)}
                        onClick={() => {
                          const amount = parseInt(draft, 10);
                          if (!amount) return;
                          onBid(a.id, amount);
                          setBidDrafts(prev => ({ ...prev, [a.id]: '' }));
                        }}
                      >
                        {a.isMyBid ? 'Перебить себя нельзя' : 'Сделать ставку'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </TabsContent>
  );
}
