import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LOCATIONS, RARITY_COLORS } from '@/lib/game-data';
import { PlayerData, STAT_SHORT_RU, SLOT_RU, ITEM_TYPE_RU, parseStats } from '@/lib/game-types';
import { computeEquipmentBonuses } from '@/lib/equipment-stats';
import { stageUnlockLevel } from '@/lib/combat-engine';
import { parsePassiveEffect } from '@/lib/passive-engine';
import { dungeonForLocation } from '@/lib/dungeons';
import { ABYSS_LOCATION_ID, ABYSS_MIN_LEVEL } from '@/lib/abyss';
import { MarketPanel } from './MarketPanel';

interface OverviewTabProps {
  player: PlayerData | null;
  location: typeof LOCATIONS[0] | null;
  loading: boolean;
  onExplore: () => void;
  onRest: () => void;
  onTravel: (locationId: string) => Promise<void>;
  onDaily: () => void;
  canClaimDaily: boolean;
  onGoToCombat: () => void;
  onAllocateStat: (stat: string) => void;
  onBuyItem: (itemId: string) => void;
  onSellItem: (inventoryId: string) => void;
  onStartDungeon: (dungeonId: string) => void;
  onStartAbyss: () => void;
}

export function OverviewTab({
  player,
  location,
  loading,
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
}: OverviewTabProps) {
  const playerInventory = player?.inventory || [];
  const gearBonuses = computeEquipmentBonuses(playerInventory);
  const dungeon = player ? dungeonForLocation(player.locationId) : null;
  const canEnterAbyss = player && player.locationId === ABYSS_LOCATION_ID;

  return (
    <TabsContent value="overview" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
      {/* Location card */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{location?.icon}</span>
            <div>
              <h3 className="font-bold text-sm">{location?.nameRu}</h3>
              <p className="text-xs text-muted-foreground">{location?.descriptionRu}</p>
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

      {/* Данж — разовый забег из нескольких комнат с боссом в конце (см. lib/dungeons.ts) */}
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
            <Button
              className="w-full h-10 bg-gold/80 hover:bg-gold text-background"
              onClick={() => onStartDungeon(dungeon.id)}
              disabled={loading || player.inCombat || player.hp <= 0 || player.level < dungeon.minLevel}
            >
              {dungeon.icon} Войти в данж
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Бездонный Разлом — бесконечный соло-эндгейм, доступен только из Верхней Глуби
          (см. lib/abyss.ts). Никакого фиксированного конца — глубина растёт, пока не сбежишь
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

      {/* Market — только в Торговом дворе (см. lib/shop.ts) */}
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

      {/* Equipped gear */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">Экипировка</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {playerInventory.filter(i => i.equipped).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center">Ничего не экипировано</p>
          ) : (
            <div className="space-y-2">
              {playerInventory.filter(i => i.equipped).map(item => {
                const stats = parseStats(item.stats);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 border"
                    style={{ borderColor: RARITY_COLORS[item.rarity] + '50' }}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate" style={{ color: RARITY_COLORS[item.rarity] }}>
                        {item.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {SLOT_RU[item.slot || ''] || ITEM_TYPE_RU[item.type]}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {Object.entries(stats).map(([k, v]) => (
                        <Badge key={k} variant="outline" className="text-[10px] h-4 px-1">
                          {k === 'attack' ? 'АТК' : k === 'defense' ? 'ЗАЩ' : k === 'hp' ? 'HP' : k === 'mp' ? 'MP' : k} +{v}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
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
