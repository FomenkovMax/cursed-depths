import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ItemIconTile } from '@/components/game/ItemIconTile';
import { RARITY_COLORS, RARITY_NAMES_RU, ITEMS } from '@/lib/game-data';
import { PlayerData, InventoryItem, StashItemView, AccountVaultItemView, SLOT_RU, ITEM_TYPE_RU, AFFIX_TIER_RU, AFFIX_TIER_COLORS, parseStats, parseAffixes } from '@/lib/game-types';

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
  vaultAvailable: boolean;
  vaultGold: number;
  vaultShards: number;
  vaultItems: AccountVaultItemView[];
  vaultCapacity: number;
  vaultLoading: boolean;
  vaultTransferring: boolean;
  playerGold: number;
  playerShards: number;
  onDepositGold: (amount: number) => void;
  onWithdrawGold: (amount: number) => void;
  onDepositShards: (amount: number) => void;
  onWithdrawShards: (amount: number) => void;
  onStoreToVault: (inventoryId: string) => void;
  onRetrieveFromVault: (vaultItemId: string) => void;
}

type GridItem = InventoryItem | StashItemView | AccountVaultItemView;

/** Ввод суммы + кнопки "положить"/"забрать" — переиспользуется для золота и Осколков Короны в
 * панели общего сейфа. */
function CurrencyTransferRow({ icon, label, playerAmount, vaultAmount, disabled, onDeposit, onWithdraw }: {
  icon: string; label: string; playerAmount: number; vaultAmount: number; disabled: boolean;
  onDeposit: (amount: number) => void; onWithdraw: (amount: number) => void;
}) {
  const [amount, setAmount] = useState('');
  const parsed = Math.floor(Number(amount));
  const valid = Number.isFinite(parsed) && parsed > 0;

  return (
    <div className="space-y-1.5 p-2 rounded-lg bg-secondary/20 border border-border/60">
      <div className="flex items-center justify-between text-xs">
        <span>{icon} {label}</span>
        <span className="text-muted-foreground">У вас: {playerAmount} • В сейфе: {vaultAmount}</span>
      </div>
      <div className="flex gap-1.5">
        <Input
          type="number"
          placeholder="Сумма"
          className="h-8 text-xs"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-[10px] border-border shrink-0"
          disabled={disabled || !valid || parsed > playerAmount}
          onClick={() => { onDeposit(parsed); setAmount(''); }}
        >
          Положить
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-[10px] border-border shrink-0"
          disabled={disabled || !valid || parsed > vaultAmount}
          onClick={() => { onWithdraw(parsed); setAmount(''); }}
        >
          Забрать
        </Button>
      </div>
    </div>
  );
}

function statLabel(k: string): string {
  return k === 'attack' ? 'АТК' : k === 'defense' ? 'ЗАЩ' : k === 'healHp' ? 'ЛечHP' : k === 'healMp' ? 'ЛечMP' : k === 'damage' ? 'Урон' : k;
}

// Расположение "в полный рост": голова сверху по центру, амулет и первое кольцо по бокам
// тела, оружие и второе кольцо на уровне рук, ноги внизу — читается как силуэт персонажа,
// а не произвольная сетка. area-имена совпадают с полями Inventory.slot.
const PORTRAIT_AREAS = `
  ".      head   ."
  "amulet body   ring1"
  "weapon hands  ring2"
  ".      legs   ."
`;
const PORTRAIT_SLOTS: { slot: string; area: string }[] = [
  { slot: 'head', area: 'head' },
  { slot: 'amulet', area: 'amulet' },
  { slot: 'body', area: 'body' },
  { slot: 'ring1', area: 'ring1' },
  { slot: 'weapon', area: 'weapon' },
  { slot: 'hands', area: 'hands' },
  { slot: 'ring2', area: 'ring2' },
  { slot: 'legs', area: 'legs' },
];

function PortraitGrid({ equipped, onSelect }: { equipped: InventoryItem[]; onSelect: (item: InventoryItem) => void }) {
  const bySlot = new Map(equipped.map(i => [i.slot, i]));
  return (
    <div className="grid gap-2" style={{ gridTemplateAreas: PORTRAIT_AREAS, gridTemplateColumns: 'repeat(3, 1fr)' }}>
      {PORTRAIT_SLOTS.map(({ slot, area }) => {
        const item = bySlot.get(slot);
        return (
          <div key={slot} style={{ gridArea: area }} className="flex flex-col items-center gap-1">
            {item ? (
              <ItemIconTile item={item} equipped onClick={() => onSelect(item)} />
            ) : (
              <div className="aspect-square w-full rounded-lg border border-dashed border-border/50 bg-secondary/10 flex items-center justify-center text-muted-foreground/40 text-lg">
                {slot === 'weapon' ? '⚔️' : slot === 'head' ? '👤' : slot === 'body' ? '👕' : slot === 'hands' ? '🤚' : slot === 'legs' ? '🦵' : slot === 'amulet' ? '📿' : '💍'}
              </div>
            )}
            <span className="text-[9px] text-muted-foreground text-center leading-none">{SLOT_RU[slot] ?? slot}</span>
          </div>
        );
      })}
    </div>
  );
}

export function InventoryTab({
  player, loading, onEquip, onUseItem, onLearnBlueprint,
  stashItems, stashCapacity, stashLoading, onStoreItem, onRetrieveItem,
  vaultAvailable, vaultGold, vaultShards, vaultItems, vaultCapacity, vaultLoading, vaultTransferring,
  playerGold, playerShards, onDepositGold, onWithdrawGold, onDepositShards, onWithdrawShards,
  onStoreToVault, onRetrieveFromVault,
}: InventoryTabProps) {
  const playerInventory = player?.inventory || [];
  const [view, setView] = useState<'inventory' | 'stash' | 'vault'>('inventory');
  const [detail, setDetail] = useState<{ item: GridItem; source: 'inventory' | 'stash' | 'vault' } | null>(null);

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
        {/* Общий сейф аккаунта (schema.prisma AccountVault) — виден и когда недоступен
            (второй слот ещё не создан), чтобы игрок понимал, что фича есть, но открывается
            вторым персонажем, а не терялся в её отсутствии. */}
        <Button
          size="sm"
          variant={view === 'vault' ? 'default' : 'ghost'}
          className="flex-1 h-8 text-xs"
          onClick={() => setView('vault')}
        >
          📦 Сейф{vaultAvailable ? ` (${vaultItems.length}/${vaultCapacity})` : ''}
        </Button>
      </div>

      {view === 'vault' ? (
        <>
          {!vaultAvailable ? (
            <Card className="border-border">
              <CardContent className="px-4 py-4">
                <p className="text-xs text-muted-foreground text-center">
                  Общий сейф расшарен между персонажами одного аккаунта — станет доступен, когда вы
                  создадите второго персонажа (вкладка «Персонажи»).
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-border">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm">📦 Общий сейф</CardTitle>
                  <p className="text-[10px] text-muted-foreground leading-relaxed pt-0.5">
                    Золото, Осколки Короны и предметы здесь видны обоим персонажам аккаунта.
                  </p>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-2">
                  <CurrencyTransferRow
                    icon="💰" label="Золото"
                    playerAmount={playerGold} vaultAmount={vaultGold}
                    disabled={vaultTransferring}
                    onDeposit={onDepositGold} onWithdraw={onWithdrawGold}
                  />
                  <CurrencyTransferRow
                    icon="👑" label="Осколки Короны"
                    playerAmount={playerShards} vaultAmount={vaultShards}
                    disabled={vaultTransferring}
                    onDeposit={onDepositShards} onWithdraw={onWithdrawShards}
                  />
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm">Предметы в сейфе</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  {vaultItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      {vaultLoading ? 'Загрузка...' : 'Сейф пуст — уберите сюда предметы из инвентаря, чтобы поделиться ими со вторым персонажем'}
                    </p>
                  ) : (
                    <div className="grid grid-cols-5 gap-2">
                      {vaultItems.map(item => (
                        <ItemIconTile key={item.id} item={item} onClick={() => setDetail({ item, source: 'vault' })} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      ) : view === 'stash' ? (
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
          {/* Портрет — расположение по слотам "в полный рост", а не плоская сетка: голова
              сверху, тело в центре с амулетом/кольцом по бокам, оружие и вторая рука ниже,
              ноги внизу. Под каждый предмет своя иконка уже есть (ItemIconTile), место под
              арт персонажа/анимацию класса — на будущее (см. обсуждение с пользователем). */}
          <Card className="border-border">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm">Портрет</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <PortraitGrid equipped={equipped} onSelect={item => setDetail({ item, source: 'inventory' })} />
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
                {/* Флейвор-текст базового предмета (ITEMS[].descriptionRu, game-data.ts) — ни
                    инвентарь, ни хранилище раньше его вообще не показывали, хотя часть предметов
                    (легендарки/мифики) уже написана в духе Dark Souls. Общий для всех экземпляров
                    itemId, ищется по статичным данным, а не хранится в самой Inventory-строке. */}
                {(() => {
                  const baseItem = ITEMS.find(i => i.id === detail.item.itemId);
                  return baseItem?.descriptionRu ? (
                    <p className="text-[11px] text-muted-foreground leading-relaxed italic pt-1.5 border-t border-border/60">
                      {baseItem.descriptionRu}
                    </p>
                  ) : null;
                })()}
              </div>
              <div className="flex flex-col gap-1.5 pt-1">
                {detail.source === 'stash' ? (
                  <Button size="sm" onClick={() => { onRetrieveItem(detail.item.id); setDetail(null); }} disabled={loading}>
                    Достать в инвентарь
                  </Button>
                ) : detail.source === 'vault' ? (
                  <Button size="sm" onClick={() => { onRetrieveFromVault(detail.item.id); setDetail(null); }} disabled={vaultTransferring}>
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
                        {vaultAvailable && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-border"
                            onClick={() => { onStoreToVault(detail.item.id); setDetail(null); }}
                            disabled={vaultTransferring || vaultItems.length >= vaultCapacity}
                          >
                            📦 В общий сейф
                          </Button>
                        )}
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
