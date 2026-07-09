import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayerData } from '@/lib/game-types';

export interface LeaderboardEntry {
  id: string;
  name: string;
  race: { name: string; icon: string } | null;
  class: { name: string; icon: string } | null;
  level: number;
  xp: number;
  gold: number;
}

interface LeaderboardTabProps {
  player: PlayerData | null;
  leaderboard: LeaderboardEntry[];
  loading: boolean;
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export function LeaderboardTab({ player, leaderboard, loading }: LeaderboardTabProps) {
  return (
    <TabsContent value="leaderboard" className="flex-1 overflow-y-auto p-4 space-y-3 m-0">
      <div className="text-center mb-2">
        <h3 className="font-bold text-sm">Таблица лидеров</h3>
        <p className="text-xs text-muted-foreground">Топ-10 искателей приключений по уровню</p>
      </div>

      {loading ? (
        <Card className="border-border">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          </CardContent>
        </Card>
      ) : leaderboard.length === 0 ? (
        <Card className="border-border">
          <CardContent className="p-6 text-center">
            <div className="text-3xl mb-2">🏆</div>
            <p className="text-sm text-muted-foreground">Пока никого нет в таблице лидеров</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {leaderboard.map((entry, i) => {
            const isMe = !!player && entry.id === player.id;
            return (
              <Card key={entry.id} className={`border-border ${isMe ? 'border-gold/60 bg-gold/5' : ''}`}>
                <CardContent className="p-2.5 flex items-center gap-2.5">
                  <span className="text-lg w-7 text-center">{RANK_MEDALS[i] ?? `#${i + 1}`}</span>
                  <span className="text-xl">{entry.race?.icon || '👤'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">
                      {entry.name}
                      {isMe && <Badge className="ml-1 text-[9px] h-4 px-1 bg-gold/20 text-gold">вы</Badge>}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {entry.race?.name} {entry.class?.icon} {entry.class?.name}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-uncommon">Ур. {entry.level}</div>
                    <div className="text-[10px] text-gold">💰 {entry.gold}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </TabsContent>
  );
}
