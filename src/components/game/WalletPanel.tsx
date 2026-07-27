import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CURRENCY_ICON_IMAGES } from '@/lib/asset-icons';
import { AssetIcon } from '@/components/game/AssetIcon';

export interface WalletCurrency {
  id: string;
  icon: string;
  nameRu: string;
  quantity: number;
  /** Короткая функциональная подпись (PoE2-стиль "валюта = сам крафт-инструмент", аудит 3/C4) —
   * что именно делает эта валюта, не просто "редкий материал". Показывается только у крафтовых
   * валют, где сам кошелёк — единственное место в игре, откуда не видно назначение (в Кузнице
   * уже есть полное descriptionRu при выборе валюты). */
  functionHint?: string;
}

interface WalletPanelProps {
  gold: number;
  crownShards: number;
  currencies: WalletCurrency[];
  battlePassXp: number | null;
}

function WalletCell({ icon, image, label, value, hint }: { icon: string; image?: string; label: string; value: number; hint?: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/20 border border-border/60 min-w-0">
      <AssetIcon src={image} emoji={icon} size={22} className="text-lg" />
      <div className="min-w-0">
        <div className="text-sm font-bold tabular-nums leading-tight">{value}</div>
        <div className="text-[9px] text-muted-foreground truncate">{label}</div>
        {hint && <div className="text-[8px] text-accent/80 truncate">{hint}</div>}
      </div>
    </div>
  );
}

/** Единая витрина всех "чисел, которые растут" в игре на одном экране — раньше золото было в
 * шапке, Осколки Короны в шапке и на вкладке "Премиум", 4 крафт-валюты видны только внутри
 * инвентаря/Кузницы, а очки Боевого пропуска — только на самой вкладке пропуска. Ничего новое
 * здесь не считается и не хранится — чистая витрина уже существующих значений. */
export function WalletPanel({ gold, crownShards, currencies, battlePassXp }: WalletPanelProps) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm">💰 Кошелёк</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="grid grid-cols-3 gap-1.5">
          <WalletCell icon="💰" image={CURRENCY_ICON_IMAGES.gold} label="Золото" value={gold} />
          <WalletCell icon="👑" image={CURRENCY_ICON_IMAGES.crownShards} label="Осколки Короны" value={crownShards} />
          {battlePassXp !== null && <WalletCell icon="🎫" label="Очки пропуска" value={battlePassXp} />}
          {currencies.map(c => (
            <WalletCell key={c.id} icon={c.icon} image={CURRENCY_ICON_IMAGES[c.id]} label={c.nameRu} value={c.quantity} hint={c.functionHint} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
