import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ItemIconTile } from '@/components/game/ItemIconTile';
import { PaperDoll } from '@/components/game/character-viewer/PaperDoll';
import { AssetIcon } from '@/components/game/AssetIcon';
import { CURRENCY_ICON_IMAGES, ITEM_ICON_IMAGES } from '@/lib/asset-icons';
import { currentClassPortrait } from '@/lib/character-portrait';
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
function CurrencyTransferRow({ icon, image, label, playerAmount, vaultAmount, disabled, onDeposit, onWithdraw }: {
  icon: string; image?: string; label: string; playerAmount: number; vaultAmount: number; disabled: boolean;
  onDeposit: (amount: number) => void; onWithdraw: (amount: number) => void;
}) {
  const [amount, setAmount] = useState('');
  const parsed = Math.floor(Number(amount));
  const valid = Number.isFinite(parsed) && parsed > 0;

  return (
    <div className="space-y-1.5 p-2 rounded-lg bg-secondary/20 border border-border/60">
      <div className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1"><AssetIcon src={image} emoji={icon} size={14} /> {label}</span>
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
  return k === 'attack' ? 'Атака' : k === 'defense' ? 'Защита' : k === 'healHp' ? 'Лечение HP' : k === 'healMp' ? 'Лечение MP' : k === 'damage' ? 'Урон' : k;
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
  const classPortrait = player ? currentClassPortrait(player) : undefined;

  const detailStats = detail ? parseStats(detail.item.stats) : {};
  const detailAffixes = detail ? parseAffixes(detail.item.affixes) : [];
  const canEquip = detail ? ['weapon', 'armor', 'accessory'].includes(detail.item.type) : false;
  const canUse = detail?.item.type === 'consumable';
  const canLearn = detail?.item.type === 'blueprint';

  return (
    <TabsContent value="inventory" className="flex-1 overflow-y-auto p-4 space-y-3 m-0 animate-fade-in">
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
                    icon="💰" image={CURRENCY_ICON_IMAGES.gold} label="Золото"
                    playerAmount={playerGold} vaultAmount={vaultGold}
                    disabled={vaultTransferring}
                    onDeposit={onDepositGold} onWithdraw={onWithdrawGold}
                  />
                  <CurrencyTransferRow
                    icon="👑" image={CURRENCY_ICON_IMAGES.crownShards} label="Осколки Короны"
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
                    <div className="grid grid-cols-4 gap-2">
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
              <div className="grid grid-cols-4 gap-2">
                {stashItems.map(item => (
                  <ItemIconTile key={item.id} item={item} onClick={() => setDetail({ item, source: 'stash' })} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Портрет в полный рост — full-body арт текущей эволюции класса (lib/character-portrait.ts,
              меняется сам по мере роста уровня) как фон, поверх которого разложены иконки надетых
              предметов (см. PaperDoll) на анатомических позициях — голова/амулет/тело прямо на
              портрете, а не отдельным силуэтом под мелкой картинкой, как было раньше. */}
          <Card className="border-border">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm">Портрет</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <PaperDoll equipped={equipped} onSelect={item => setDetail({ item, source: 'inventory' })} portraitSrc={classPortrait} />
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
                <div className="grid grid-cols-4 gap-2">
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
        <DialogContent className="max-w-xs p-0 gap-0 overflow-hidden border-2" style={detail ? { borderColor: RARITY_COLORS[detail.item.rarity] + '80' } : undefined}>
          {detail && (() => {
            const rarityColor = RARITY_COLORS[detail.item.rarity];
            const baseItem = ITEMS.find(i => i.id === detail.item.itemId);
            const imageSrc = ITEM_ICON_IMAGES[detail.item.itemId];
            return (
              <>
                {/* Крупная иконка в орнаментной рамке (цвет — редкость предмета) + характеристики
                    рядом — по референсу "Зов Теней": там иконка предмета видна и крупная, а не
                    32px значок в заголовке общего диалога, как было раньше. */}
                <div className="flex items-start gap-3 px-4 pt-4 pb-3 bg-gradient-to-b from-secondary/50 to-transparent">
                  <div
                    className="relative w-20 h-20 shrink-0 rounded-lg border-2 bg-black/40 overflow-hidden"
                    style={{ borderColor: rarityColor, boxShadow: `0 0 14px ${rarityColor}66, inset 0 0 10px ${rarityColor}22` }}
                  >
                    {imageSrc ? (
                      <img src={imageSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-4xl">{detail.item.icon ?? ''}</span>
                    )}
                    <span className="absolute top-1 left-1 w-2.5 h-2.5 border-t border-l" style={{ borderColor: rarityColor }} />
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 border-t border-r" style={{ borderColor: rarityColor }} />
                    <span className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b border-l" style={{ borderColor: rarityColor }} />
                    <span className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b border-r" style={{ borderColor: rarityColor }} />
                    {detail.item.enhancementLevel > 0 && (
                      <span className="absolute bottom-0 inset-x-0 text-center bg-black/80 text-gold text-[11px] font-bold py-0.5 leading-none">
                        +{detail.item.enhancementLevel}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 pt-1">
                    <DialogTitle className="text-sm font-display leading-tight" style={{ color: rarityColor }}>
                      {detail.item.name}
                    </DialogTitle>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {('slot' in detail.item && detail.item.slot && SLOT_RU[detail.item.slot]) || ITEM_TYPE_RU[detail.item.type]} • {RARITY_NAMES_RU[detail.item.rarity]}
                      {detail.item.quantity > 1 && ` • x${detail.item.quantity}`}
                    </div>
                    {detail.item.affixTier && AFFIX_TIER_RU[detail.item.affixTier] && (
                      <Badge className="mt-1.5 text-[10px]" style={{ backgroundColor: AFFIX_TIER_COLORS[detail.item.affixTier] + '20', color: AFFIX_TIER_COLORS[detail.item.affixTier] }}>
                        {AFFIX_TIER_RU[detail.item.affixTier]}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="px-4 space-y-3 pb-4 max-h-[50vh] overflow-y-auto">
                  {Object.keys(detailStats).length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-semibold mb-1">Характеристики</div>
                      <div className="rounded-lg border border-border/60 divide-y divide-border/40 overflow-hidden">
                        {Object.entries(detailStats).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between px-2.5 py-1.5 text-xs bg-secondary/10">
                            <span className="text-muted-foreground">{statLabel(k)}</span>
                            <span className="font-semibold text-gold">+{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {detailAffixes.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-semibold mb-1">Аффиксы</div>
                      <div className="flex flex-wrap gap-1.5">
                        {detailAffixes.map((a, i) => (
                          <span key={i} className="text-[11px] px-2 py-1 rounded-md bg-secondary/30 border border-border/60">
                            {a.labelRu} <span className="text-primary font-semibold">+{a.value}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Флейвор-текст базового предмета (ITEMS[].descriptionRu, game-data.ts) — часть
                      предметов (легендарки/мифики) уже написана в духе Dark Souls, теперь в
                      отдельной оформленной панели вместо мелкого курсива под чертой. */}
                  {baseItem?.descriptionRu && (
                    <div className="rounded-lg border border-border/50 bg-secondary/10 px-3 py-2">
                      <p className="text-[11px] text-muted-foreground leading-relaxed italic">{baseItem.descriptionRu}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 px-4 pb-4">
                  {detail.source === 'stash' ? (
                    <Button onClick={() => { onRetrieveItem(detail.item.id); setDetail(null); }} disabled={loading}>
                      Достать в инвентарь
                    </Button>
                  ) : detail.source === 'vault' ? (
                    <Button onClick={() => { onRetrieveFromVault(detail.item.id); setDetail(null); }} disabled={vaultTransferring}>
                      Достать в инвентарь
                    </Button>
                  ) : (
                    <>
                      {(detail.item as InventoryItem).equipped ? (
                        <Button variant="outline" className="border-border" onClick={() => { onEquip(detail.item.id); setDetail(null); }} disabled={loading}>
                          Снять
                        </Button>
                      ) : (
                        <>
                          {canEquip && (
                            <Button onClick={() => { onEquip(detail.item.id); setDetail(null); }} disabled={loading}>
                              Надеть
                            </Button>
                          )}
                          {canUse && (
                            <Button variant="outline" className="border-border" onClick={() => { onUseItem(detail.item.id); setDetail(null); }} disabled={loading}>
                              Использовать
                            </Button>
                          )}
                          {canLearn && (
                            <Button variant="outline" className="border-gold/50 text-gold" onClick={() => { onLearnBlueprint(detail.item.id); setDetail(null); }} disabled={loading}>
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
            );
          })()}
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}
