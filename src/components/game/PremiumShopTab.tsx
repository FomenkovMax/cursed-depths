import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PremiumShopStateView } from '@/lib/game-types';

interface PremiumShopTabProps {
  state: PremiumShopStateView | null;
  loading: boolean;
  buyingPackId: string | null;
  onBuyPack: (packId: string) => void;
  onRedeemSku: (skuId: string) => void;
}

function formatPremiumUntil(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export function PremiumShopTab({ state, loading, buyingPackId, onBuyPack, onRedeemSku }: PremiumShopTabProps) {
  return (
    <TabsContent value="premium" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
      <div className="text-center mb-2">
        <h3 className="font-bold text-sm">👑 Осколки Короны</h3>
        <p className="text-xs text-muted-foreground">
          Осколки доспеха короля, отказавшегося умирать по правилам Столпов
        </p>
      </div>

      <Card className="border-gold/50 bg-gold/5">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-gold">👑 {state?.crownShards ?? 0}</div>
            <div className="text-[10px] text-muted-foreground">Осколков Короны</div>
          </div>
          <div className="text-right">
            {state?.premiumActive ? (
              <>
                <Badge className="bg-gold/20 text-gold text-[10px]">⭐ Премиум активен</Badge>
                <div className="text-[10px] text-muted-foreground mt-1">до {formatPremiumUntil(state.premiumUntil)}</div>
              </>
            ) : (
              <span className="text-[10px] text-muted-foreground">Премиум не активен</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Покупка Осколков за Telegram Stars — единственный разрешённый способ платить за
          цифровые товары внутри Telegram (см. lib/premium-shop.ts). Реальные деньги идут
          только здесь; каталог ниже тратит уже начисленные Осколки. */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">⭐ Купить Осколки</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          {state?.shardPacks.map(pack => (
            <div key={pack.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/20 border border-border/60">
              <span className="text-2xl">{pack.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{pack.nameRu}</div>
                <div className="text-[10px] text-gold">👑 {pack.shards} Осколков</div>
              </div>
              <Button
                size="sm"
                className="h-8 text-xs shrink-0"
                disabled={loading || buyingPackId === pack.id}
                onClick={() => onBuyPack(pack.id)}
              >
                {buyingPackId === pack.id ? '...' : `⭐ ${pack.stars}`}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Каталог за Осколки — премиум-статус/гарантированный крафт/расширение хранилища. */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">🛒 Магазин</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          {state?.catalog.map(sku => {
            const affordable = (state?.crownShards ?? 0) >= sku.costShards;
            return (
              <div key={sku.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/20 border border-border/60">
                <span className="text-2xl">{sku.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{sku.nameRu}</div>
                  <div className="text-[10px] text-muted-foreground">{sku.descriptionRu}</div>
                </div>
                <Button
                  size="sm"
                  variant={affordable ? 'default' : 'outline'}
                  className={`h-8 text-xs shrink-0 ${!affordable ? 'border-border text-muted-foreground' : ''}`}
                  disabled={loading || !affordable}
                  onClick={() => onRedeemSku(sku.id)}
                >
                  👑 {sku.costShards}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
