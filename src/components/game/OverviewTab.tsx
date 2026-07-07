import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LOCATIONS, RARITY_COLORS } from '@/lib/game-data';
import { PlayerData, STAT_SHORT_RU, SLOT_RU, ITEM_TYPE_RU, parseStats } from '@/lib/game-types';
import { computeEquipmentBonuses } from '@/lib/equipment-stats';

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
}: OverviewTabProps) {
  const playerInventory = player?.inventory || [];
  const gearBonuses = computeEquipmentBonuses(playerInventory);

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

      {/* Character stats */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Характеристики</CardTitle>
          {!!player?.statPoints && (
            <Badge className="text-[10px] h-5 bg-gold/20 text-gold">+{player.statPoints} очков</Badge>
          )}
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
