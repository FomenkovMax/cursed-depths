import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface WalletCurrency {
  id: string;
  icon: string;
  nameRu: string;
  quantity: number;
}

interface WalletPanelProps {
  gold: number;
  crownShards: number;
  currencies: WalletCurrency[];
  battlePassXp: number | null;
}

function WalletCell({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/20 border border-border/60 min-w-0">
      <span className="text-lg shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-sm font-bold tabular-nums leading-tight">{value}</div>
        <div className="text-[9px] text-muted-foreground truncate">{label}</div>
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
          <WalletCell icon="💰" label="Золото" value={gold} />
          <WalletCell icon="👑" label="Осколки Короны" value={crownShards} />
          {battlePassXp !== null && <WalletCell icon="🎫" label="Очки пропуска" value={battlePassXp} />}
          {currencies.map(c => (
            <WalletCell key={c.id} icon={c.icon} label={c.nameRu} value={c.quantity} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
