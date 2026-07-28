import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ItemIconTile } from '@/components/game/ItemIconTile';
import { LOCATIONS } from '@/lib/game-data';
import { LOCATION_IMAGES } from '@/lib/asset-icons';
import { PlayerData, STAT_SHORT_RU } from '@/lib/game-types';
import { computeEquipmentBonuses } from '@/lib/combat/equipment-stats';
import { findPet } from '@/lib/economy/pets';
import { stageUnlockLevel } from '@/lib/combat/combat-engine';
import { parsePassiveEffect } from '@/lib/combat/passive-engine';
import { dungeonForLocation } from '@/lib/combat/dungeons';
import { trialForLocation } from '@/lib/combat/trials';
import { MAX_HEAT_LEVEL, heatLevelEffect, heatLevelLabel } from '@/lib/combat/dungeon-modifiers';
import { ABYSS_LOCATION_ID, ABYSS_MIN_LEVEL } from '@/lib/combat/abyss';
import { MarketPanel } from './MarketPanel';
import { WalletPanel, type WalletCurrency } from './WalletPanel';
import { TodayPanel } from './TodayPanel';
import type {
  WorldBossStateView, FortressStateView, GuildRaidBossStateView,
  ExpeditionStateView, BountyStateView, WeeklyChallengeStateView, GameTab,
} from '@/lib/game-types';

const WALLET_CURRENCY_IDS = ['ash_shard', 'aylet_tear', 'tornak_seal', 'kessara_whisper'];
// Короткая функциональная подпись каждой крафт-валюты (аудит 3/C4, PoE2: "валюта = сам
// крафт-инструмент, не просто gold-sink") — та же формулировка, что уже есть у полного
// descriptionRu в Кузнице (CraftTab.tsx), сжатая под компактную ячейку Кошелька.
const WALLET_CURRENCY_META: Record<string, { icon: string; nameRu: string; functionHint: string }> = {
  ash_shard: { icon: '🔥', nameRu: 'Осколок Пепла', functionHint: 'реролл всех св-в' },
  aylet_tear: { icon: '💧', nameRu: 'Слеза Айлет', functionHint: '+1 ранг редкости' },
  tornak_seal: { icon: '🗿', nameRu: 'Печать Торнака', functionHint: '+1 свойство' },
  kessara_whisper: { icon: '🌑', nameRu: 'Шёпот Кессары', functionHint: 'рискованный реролл' },
};

interface AdventureLogEntry {
  id: number;
  text: string;
  type: 'info' | 'success' | 'error';
}

interface OverviewTabProps {
  player: PlayerData | null;
  location: typeof LOCATIONS[0] | null;
  loading: boolean;
  adventureLog: AdventureLogEntry[];
  onExplore: () => void;
  onRest: () => void;
  onTravel: (locationId: string) => Promise<void>;
  onDaily: () => void;
  canClaimDaily: boolean;
  onGoToCombat: () => void;
  onAllocateStat: (stat: string) => void;
  onBuyItem: (itemId: string) => void;
  onSellItem: (inventoryId: string) => void;
  onStartDungeon: (dungeonId: string, heatLevel: number) => void;
  onStartAbyss: () => void;
  onStartTrial: (trialId: string) => void;
  activePetId: string | null;
  crownShards: number;
  battlePassXp: number | null;
  worldBoss: WorldBossStateView | null;
  fortress: FortressStateView | null;
  guildRaidBoss: GuildRaidBossStateView | null;
  expeditionState: ExpeditionStateView | null;
  bountyState: BountyStateView | null;
  weeklyChallenge: WeeklyChallengeStateView | null;
  onNavigateTab: (tab: GameTab) => void;
  onOpenRespec: () => void;
}

export function OverviewTab({
  player,
  location,
  loading,
  adventureLog,
  onExplore,
  onRest,
  onTravel,
  onDaily,
  canClaimDaily,
  onGoToCombat,
  onAllocateStat,
  onBuyItem,
  onSellItem,
  onStartDungeon,
  onStartAbyss,
  onStartTrial,
  activePetId,
  crownShards,
  battlePassXp,
  worldBoss,
  fortress,
  guildRaidBoss,
  expeditionState,
  bountyState,
  weeklyChallenge,
  onNavigateTab,
  onOpenRespec,
}: OverviewTabProps) {
  const [dungeonHeat, setDungeonHeat] = useState(0);
  const playerInventory = player?.inventory || [];
  const activePet = activePetId ? findPet(activePetId) : null;
  const gearBonuses = computeEquipmentBonuses(playerInventory, activePet);
  const dungeon = player ? dungeonForLocation(player.locationId) : null;
  const trial = player ? trialForLocation(player.locationId) : null;
  const canEnterAbyss = player && player.locationId === ABYSS_LOCATION_ID;
  const walletCurrencies: WalletCurrency[] = WALLET_CURRENCY_IDS.map(id => ({
    id,
    icon: WALLET_CURRENCY_META[id].icon,
    nameRu: WALLET_CURRENCY_META[id].nameRu,
    functionHint: WALLET_CURRENCY_META[id].functionHint,
    quantity: playerInventory.filter(i => i.itemId === id).reduce((sum, i) => sum + i.quantity, 0),
  }));

  return (
    <TabsContent value="overview" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
      {/* Location card — описание крупнее и заметнее, ближе к нарративной сцене чат-бота
          в референсе, а не подпись мелким текстом под заголовком */}
      <Card className="border-border overflow-hidden">
        {location && LOCATION_IMAGES[location.id] && (
          <div className="aspect-[16/9] bg-secondary/20">
            <img src={LOCATION_IMAGES[location.id]} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <CardContent className="p-4">
          <div className="flex items-start gap-3 mb-3">
            {!(location && LOCATION_IMAGES[location.id]) && (
              <span className="text-4xl leading-none">{location?.icon}</span>
            )}
            <div>
              <h3 className="font-bold text-sm">{location?.nameRu}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{location?.descriptionRu}</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="w-full h-11"
              onClick={onExplore}
              disabled={loading || player?.inCombat || (player?.hp ?? 0) <= 0}
            >
              🔍 Исследовать
            </Button>
            {player?.locationId === 'town' ? (
              <Button
                variant="outline"
                className="w-full h-11 border-border"
                onClick={onRest}
                disabled={loading || player?.inCombat}
              >
                🍺 Отдохнуть
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full h-11 border-border"
                onClick={() => onTravel('town')}
                disabled={loading || player?.inCombat}
              >
                🏠 В таверну
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full h-11 border-border"
              onClick={onDaily}
              disabled={loading || !canClaimDaily}
            >
              🎁 Ежедневное
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 border-border"
              onClick={onGoToCombat}
              disabled={!player?.inCombat}
            >
              ⚔️ В бой!
            </Button>
          </div>
        </CardContent>
      </Card>

      <TodayPanel
        canClaimDaily={canClaimDaily}
        dailyStreak={player?.dailyStreak ?? 0}
        onClaimDaily={onDaily}
        worldBoss={worldBoss}
        fortress={fortress}
        guildRaidBoss={guildRaidBoss}
        expeditionState={expeditionState}
        bountyState={bountyState}
        weeklyChallenge={weeklyChallenge}
        onNavigateTab={onNavigateTab}
      />

      <WalletPanel gold={player?.gold ?? 0} crownShards={crownShards} currencies={walletCurrencies} battlePassXp={battlePassXp} />

      {/* Журнал похождений — свиток последних событий вместо исчезающего тоста, ближе к
          истории чата в референсном боте: там каждое действие остаётся строкой в переписке. */}
      {adventureLog.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm">📖 Журнал похождений</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="max-h-32 overflow-y-auto pr-1 space-y-1">
              {adventureLog.map(entry => (
                <p
                  key={entry.id}
                  className={`text-xs leading-relaxed ${
                    entry.type === 'success' ? 'text-uncommon' :
                    entry.type === 'error' ? 'text-destructive' :
                    'text-muted-foreground'
                  }`}
                >
                  {entry.text}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Данж — разовый забег из нескольких комнат с боссом в конце (см. lib/combat/dungeons.ts) */}
      {player && dungeon && (
        <Card className="border-gold/40 bg-gold/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{dungeon.icon}</span>
              <div>
                <h3 className="font-bold text-sm">{dungeon.nameRu}</h3>
                <p className="text-xs text-muted-foreground">{dungeon.descriptionRu}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge variant="outline" className="text-[10px] h-4 px-1">🚪 {dungeon.roomCount} комнат</Badge>
              <Badge variant="outline" className="text-[10px] h-4 px-1">Ур. {dungeon.minLevel}+</Badge>
              <Badge variant="outline" className="text-[10px] h-4 px-1 text-gold">🎁 +{dungeon.completionReward.xp} XP, +{dungeon.completionReward.gold} 💰</Badge>
            </div>

            {/* Heat-слайдер — риск игрок выбирает САМ перед входом (в отличие от случайного
                модификатора забега, который всё равно роллится сверху) — см. lib/combat/dungeon-modifiers.ts */}
            <div className="mb-3 p-2 rounded-lg bg-secondary/20 border border-border/60">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-muted-foreground">
                  {heatLevelLabel(dungeonHeat).icon} Риск: {heatLevelLabel(dungeonHeat).nameRu}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  враги ×{heatLevelEffect(dungeonHeat).enemyDamageMult.toFixed(2)} · награда ×{heatLevelEffect(dungeonHeat).goldMult.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[dungeonHeat]}
                min={0}
                max={MAX_HEAT_LEVEL}
                step={1}
                disabled={loading || player.inCombat}
                onValueChange={([v]) => setDungeonHeat(v)}
              />
            </div>

            <Button
              className="w-full h-10 bg-gold/80 hover:bg-gold text-background"
              onClick={() => onStartDungeon(dungeon.id, dungeonHeat)}
              disabled={loading || player.inCombat || player.hp <= 0 || player.level < dungeon.minLevel}
            >
              {dungeon.icon} Войти в данж
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Испытание — ветвящийся аналог данжа (lib/combat/trials.ts): на каждой развилке видно тип
          обеих троп заранее, маршрут можно спланировать и запомнить, а не просто идти по прямой. */}
      {player && trial && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{trial.icon}</span>
              <div>
                <h3 className="font-bold text-sm">{trial.nameRu}</h3>
                <p className="text-xs text-muted-foreground">{trial.descriptionRu}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {/* Короткий забег (аудит 4.1, C6) — гарантированная концовка за пару решений, а не
                  20-40 минут блуждания; отличается от обычного испытания только числом развилок,
                  движок (lib/combat/trials.ts) тот же самый. */}
              {trial.junctions.length <= 2 && (
                <Badge variant="outline" className="text-[10px] h-4 px-1 text-uncommon">⏱️ Короткий забег</Badge>
              )}
              <Badge variant="outline" className="text-[10px] h-4 px-1">🗺️ {trial.junctions.length} развилки</Badge>
              <Badge variant="outline" className="text-[10px] h-4 px-1">Ур. {trial.minLevel}+</Badge>
              <Badge variant="outline" className="text-[10px] h-4 px-1 text-gold">🎁 +{trial.completionReward.xp} XP, +{trial.completionReward.gold} 💰</Badge>
            </div>
            <Button
              className="w-full h-10"
              onClick={() => onStartTrial(trial.id)}
              disabled={loading || player.inCombat || player.hp <= 0 || player.level < trial.minLevel}
            >
              {trial.icon} Войти в испытание
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Бездонный Разлом — бесконечный соло-эндгейм, доступен только из Верхней Глуби
          (см. lib/combat/abyss.ts). Никакого фиксированного конца — глубина растёт, пока не сбежишь
          или не погибнешь; рекорд глубины сохраняется навсегда. */}
      {canEnterAbyss && player && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">🌀</span>
              <div>
                <h3 className="font-bold text-sm">Бездонный Разлом</h3>
                <p className="text-xs text-muted-foreground">Бесконечный спуск — чем глубже, тем опаснее и тем богаче награда. Конца нет.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge variant="outline" className="text-[10px] h-4 px-1">Ур. {ABYSS_MIN_LEVEL}+</Badge>
              <Badge variant="outline" className="text-[10px] h-4 px-1 text-gold">🏆 Рекорд: глубина {player.bestAbyssDepth}</Badge>
            </div>
            <Button
              className="w-full h-10 bg-destructive/80 hover:bg-destructive text-background"
              onClick={onStartAbyss}
              disabled={loading || player.inCombat || player.hp <= 0 || player.level < ABYSS_MIN_LEVEL}
            >
              🌀 Спуститься в Разлом
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Market — только в Торговом дворе (см. lib/economy/shop.ts) */}
      {player && player.locationId === 'market' && (
        <MarketPanel player={player} loading={loading} onBuy={onBuyItem} onSell={onSellItem} />
      )}

      {/* Character stats */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between flex-wrap gap-1">
          <CardTitle className="text-sm">Характеристики</CardTitle>
          <div className="flex items-center gap-1.5">
            {!!player?.consumableFightsLeft && (
              <Badge className="text-[10px] h-5 bg-uncommon/20 text-uncommon">
                ⚗️ +{player.consumableAttackBonus} атаки ({player.consumableFightsLeft} {player.consumableFightsLeft === 1 ? 'бой' : 'боёв'})
              </Badge>
            )}
            {!!player?.statPoints && (
              <Badge className="text-[10px] h-5 bg-gold/20 text-gold">+{player.statPoints} очков</Badge>
            )}
            {player && (
              <Button
                size="sm"
                variant="outline"
                className="h-5 px-1.5 text-[10px] border-border"
                onClick={onOpenRespec}
              >
                🔄 Respec
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="grid grid-cols-3 gap-2">
            {(['strength', 'dexterity', 'vitality', 'intellect', 'willpower', 'instinct'] as const).map(stat => {
              const base = player?.[stat] || 0;
              const bonus = gearBonuses[stat];
              return (
              <div key={stat} className="bg-secondary/50 rounded-lg p-2 text-center">
                <div className="text-[10px] text-muted-foreground">{STAT_SHORT_RU[stat]}</div>
                <div className="font-bold text-sm">
                  {base + bonus}
                  {bonus > 0 && <span className="text-[10px] text-uncommon font-normal"> (+{bonus})</span>}
                </div>
                {!!player?.statPoints && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-5 w-5 p-0 mt-1 text-[10px] border-border"
                    disabled={loading}
                    onClick={() => onAllocateStat(stat)}
                  >
                    +
                  </Button>
                )}
              </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Passive abilities */}
      {player && (
        <Card className="border-border">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm">Пассивные способности</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {(() => {
              const passives = (player.class.abilities || []).filter(a => a.type === 'passive');
              if (passives.length === 0) {
                return <p className="text-xs text-muted-foreground text-center">У класса нет пассивных способностей</p>;
              }
              return (
                <div className="space-y-2">
                  {passives.map(a => {
                    const unlocked = player.level >= stageUnlockLevel(a.stage);
                    const active = unlocked && parsePassiveEffect(a.description) !== null;
                    return (
                      <div
                        key={a.id}
                        className={`flex items-start gap-2 p-2 rounded-lg bg-secondary/30 border border-border ${!unlocked ? 'opacity-50' : ''}`}
                      >
                        <span className="text-lg">{a.icon || '✨'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-medium">{a.name}</span>
                            {unlocked ? (
                              active ? (
                                <Badge className="text-[9px] h-4 px-1 bg-uncommon/20 text-uncommon">активна</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px] h-4 px-1 text-muted-foreground">декоративна</Badge>
                              )
                            ) : (
                              <Badge variant="outline" className="text-[9px] h-4 px-1">ур. {stageUnlockLevel(a.stage)}</Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">{a.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Equipped gear — компактная сводка иконками (полная информация и снятие — во вкладке
          "Инвентарь", чтобы не дублировать один и тот же список дважды текстом) */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">Экипировка</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {playerInventory.filter(i => i.equipped).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center">Ничего не экипировано</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {playerInventory.filter(i => i.equipped).map(item => (
                <ItemIconTile key={item.id} item={item} equipped />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Death state */}
      {player?.hp !== undefined && player.hp <= 0 && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-4 text-center">
            <div className="text-3xl mb-2">💀</div>
            <p className="text-sm text-destructive font-bold">Вы погибли!</p>
            <p className="text-xs text-muted-foreground mt-1">Вернитесь в таверну для восстановления</p>
            <Button
              className="mt-3"
              onClick={() => { onTravel('town').then(() => onRest()); }}
              disabled={loading}
            >
              🏠 Вернуться в таверну
            </Button>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}
