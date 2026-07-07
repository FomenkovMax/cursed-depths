import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LOCATIONS } from '@/lib/game-data';
import { PlayerData } from '@/lib/game-types';

interface MapTabProps {
  player: PlayerData | null;
  location: typeof LOCATIONS[0] | null;
  loading: boolean;
  onTravel: (locationId: string) => void;
}

export function MapTab({ player, location, loading, onTravel }: MapTabProps) {
  return (
    <TabsContent value="map" className="flex-1 overflow-y-auto p-4 space-y-3 m-0">
      <div className="text-center mb-2">
        <h3 className="font-bold text-sm">Карта Проклятых Глубин</h3>
        <p className="text-xs text-muted-foreground">Выберите локацию для путешествия</p>
      </div>

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
                <span className="text-2xl">{loc.icon}</span>
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
