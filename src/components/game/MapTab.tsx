import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LOCATIONS } from '@/lib/game-data';
import { PlayerData, WaypointsStateView } from '@/lib/game-types';
import { LOCATION_IMAGES } from '@/lib/asset-icons';
import { TabBanner } from '@/components/game/TabBanner';

/** Эвристика риска локации — та же дельта уровня, что уже решает доступность травела ниже
 * (loc.level <= player.level + 2), просто разбитая на три бакета вместо одного порога. Не новый
 * расчёт опасности, а видимое объяснение уже существующей логики: почему локация выглядит
 * пограничной ("+2 ур." уже опасно, хоть и доступно), а не просто "доступна/нет". */
function riskLevel(locLevel: number, playerLevel: number): { label: string; className: string } {
  const delta = locLevel - playerLevel;
  if (delta <= -3) return { label: '🟢 Низкий риск', className: 'text-uncommon border-uncommon/30' };
  if (delta <= 0) return { label: '🟡 Средний риск', className: 'text-gold border-gold/30' };
  return { label: '🔴 Высокий риск', className: 'text-destructive border-destructive/30' };
}

interface MapTabProps {
  player: PlayerData | null;
  location: typeof LOCATIONS[0] | null;
  loading: boolean;
  onTravel: (locationId: string) => void;
  waypointsState: WaypointsStateView | null;
  waypointsLoading: boolean;
  fastTravellingTo: string | null;
  onFastTravel: (locationId: string) => void;
}

export function MapTab({ player, location, loading, onTravel, waypointsState, waypointsLoading, fastTravellingTo, onFastTravel }: MapTabProps) {
  return (
    <TabsContent value="map" className="flex-1 overflow-y-auto p-4 space-y-3 m-0 animate-fade-in">
      {/* Баннер — арт текущей локации игрока (LOCATION_IMAGES уже покрывают 37/37), а не новая
          генерация: сама вкладка "Карта" не привязана к одной сцене, зато "вы здесь" — это то,
          что реально знает игрок в этот момент. */}
      <TabBanner
        src={location && LOCATION_IMAGES[location.id] ? LOCATION_IMAGES[location.id] : LOCATION_IMAGES.town}
        title="Карта Проклятых Глубин"
        subtitle={location ? `Вы здесь: ${location.nameRu} — выберите локацию для путешествия` : 'Выберите локацию для путешествия'}
      />

      {/* Быстрое перемещение — премиум-эксклюзив (lib/economy/fast-travel.ts): телепорт напрямую в любую
          УЖЕ посещённую локацию, минуя граф связей ниже (тот остаётся бесплатным и мгновенным,
          но только между соседями). */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">⚡ Быстрое перемещение</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {!waypointsState?.premiumActive ? (
            <p className="text-[10px] text-muted-foreground text-center py-2">
              Быстрое перемещение доступно только с активным премиум-статусом.
            </p>
          ) : waypointsState.waypoints.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-2">
              Вы ещё не посещали других локаций — путешествуйте обычным путём, чтобы открыть точки телепорта.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {waypointsState.waypoints.map(w => (
                <Button
                  key={w.id}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-border"
                  disabled={waypointsLoading || loading || fastTravellingTo !== null || !!player?.inCombat}
                  onClick={() => onFastTravel(w.id)}
                >
                  {fastTravellingTo === w.id ? '...' : `${w.icon} ${w.nameRu}`}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {LOCATIONS.map(loc => {
        const isCurrentLocation = player?.locationId === loc.id;
        const isConnected = location?.connections.includes(loc.id);
        const canTravel = isConnected && !player?.inCombat && loc.level <= (player?.level ?? 0) + 2;
        const levelLocked = loc.level > (player?.level ?? 0) + 2;

        return (
          <Card
            key={loc.id}
            className={`border-border transition-all ${
              isCurrentLocation ? 'border-primary bg-primary/10 animate-glow' :
              canTravel ? 'hover:border-primary/50 cursor-pointer' :
              'opacity-60'
            }`}
            onClick={() => canTravel && !isCurrentLocation ? onTravel(loc.id) : undefined}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                {LOCATION_IMAGES[loc.id] ? (
                  <img src={LOCATION_IMAGES[loc.id]} alt="" className="w-20 h-14 rounded-md object-cover shrink-0" />
                ) : (
                  <span className="text-2xl">{loc.icon}</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm truncate">{loc.nameRu}</h4>
                    {isCurrentLocation && (
                      <Badge className="text-[10px] h-4 bg-primary/20 text-primary">Вы здесь</Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{loc.descriptionRu}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      Ур. {loc.level}+
                    </Badge>
                    {!levelLocked && (() => {
                      const risk = riskLevel(loc.level, player?.level ?? 0);
                      return (
                        <Badge variant="outline" className={`text-[10px] h-4 px-1 ${risk.className}`}>
                          {risk.label}
                        </Badge>
                      );
                    })()}
                    {levelLocked && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1 text-destructive border-destructive/30">
                        🔒 Ур. {loc.level - 2}+
                      </Badge>
                    )}
                    {loc.connections.map(cId => {
                      const cLoc = LOCATIONS.find(l => l.id === cId);
                      return cLoc ? (
                        <span key={cId} className="text-[10px] text-muted-foreground">→ {cLoc.icon}</span>
                      ) : null;
                    })}
                  </div>
                </div>
                {!isCurrentLocation && canTravel && (
                  <Button size="sm" className="h-8 text-xs shrink-0" disabled={loading}>
                    🚶
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </TabsContent>
  );
}
