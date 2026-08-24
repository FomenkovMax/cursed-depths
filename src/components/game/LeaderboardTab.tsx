import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayerData } from '@/lib/game-types';
import { findTitle } from '@/lib/social/titles';
import { TITLE_ICON_IMAGES, TAB_BANNER_IMAGES } from '@/lib/asset-icons';
import { AssetIcon } from '@/components/game/AssetIcon';
import { TabBanner } from '@/components/game/TabBanner';

export interface LeaderboardEntry {
  id: string;
  name: string;
  race: { name: string; icon: string } | null;
  class: { name: string; icon: string } | null;
  level: number;
  xp: number;
  gold: number;
  activeTitleId: string | null;
}

export interface SeasonWinnerEntry {
  id: string;
  rank: number;
  playerId: string;
  rewardGold: number;
  rewardXp: number;
  player: { name: string; class: { icon: string } | null };
}

interface LeaderboardTabProps {
  player: PlayerData | null;
  leaderboard: LeaderboardEntry[];
  loading: boolean;
  currentSeason: string | null;
  previousSeason: string | null;
  previousSeasonWinners: SeasonWinnerEntry[];
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export function LeaderboardTab({ player, leaderboard, loading, currentSeason, previousSeason, previousSeasonWinners }: LeaderboardTabProps) {
  return (
    <TabsContent value="leaderboard" className="flex-1 overflow-y-auto p-4 space-y-3 m-0 animate-fade-in">
      <TabBanner
        src={TAB_BANNER_IMAGES.leaderboard}
        title="Таблица лидеров"
        subtitle={`Топ-10 искателей приключений по уровню${currentSeason ? ` • сезон ${currentSeason}` : ''}`}
      />

      {/* Награды за прошлый сезон — топ-3 получают золото и опыт в начале каждого месяца
          (см. GET /api/leaderboard, lib/social/seasons.ts). Прогресс игроков при этом НЕ сбрасывается. */}
      {previousSeasonWinners.length > 0 && (
        <Card className="border-gold/40 bg-gold/5">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm">🏆 Прошлый сезон {previousSeason}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-1.5">
            {previousSeasonWinners.map(w => (
              <div key={w.id} className="flex items-center gap-2 text-xs">
                <span>{RANK_MEDALS[w.rank - 1] ?? `#${w.rank}`}</span>
                <span className="flex-1 truncate">{w.player.class?.icon} {w.player.name}</span>
                <span className="text-gold">+{w.rewardGold} 💰</span>
                <span className="text-xp">+{w.rewardXp} XP</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
            const title = findTitle(entry.activeTitleId);
            return (
              <Card key={entry.id} className={`border-border ${isMe ? 'border-gold/60 bg-gold/5' : ''}`}>
                <CardContent className="p-2.5 flex items-center gap-2.5">
                  <span className="text-lg w-7 text-center">{RANK_MEDALS[i] ?? `#${i + 1}`}</span>
                  <span className="text-xl">{entry.race?.icon || '👤'}</span>
                  <div className="flex-1 min-w-0">
                    {title && (
                      <div className={`flex items-center gap-1 text-[9px] font-medium truncate ${title.colorClass}`}>
                        <AssetIcon src={TITLE_ICON_IMAGES[title.id]} emoji={title.icon} size={11} /> {title.nameRu}
                      </div>
                    )}
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
