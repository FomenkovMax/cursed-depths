import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PvpOpponentView, PvpFightResultView, PvpLeagueView } from '@/lib/game-types';

interface PvpTabProps {
  opponents: PvpOpponentView[];
  myRating: number;
  myLeague: PvpLeagueView | null;
  myWins: number;
  myLosses: number;
  loading: boolean;
  onChallenge: (opponentId: string) => Promise<PvpFightResultView | null>;
}

export function PvpTab({ opponents, myRating, myLeague, myWins, myLosses, loading, onChallenge }: PvpTabProps) {
  const [lastResult, setLastResult] = useState<PvpFightResultView | null>(null);
  const [fightingId, setFightingId] = useState<string | null>(null);

  const handleChallenge = async (opponentId: string) => {
    setFightingId(opponentId);
    const result = await onChallenge(opponentId);
    if (result) setLastResult(result);
    setFightingId(null);
  };

  return (
    <TabsContent value="pvp" className="flex-1 overflow-y-auto p-4 space-y-3 m-0">
      <div className="text-center mb-2">
        <h3 className="font-bold text-sm">⚔️ Арена</h3>
        <p className="text-xs text-muted-foreground">Асинхронные бои — мгновенный симулированный поединок, ваши реальные ХП не тратятся</p>
      </div>

      <Card className="border-gold/40 bg-gold/5">
        <CardContent className="p-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold">{myLeague ? `${myLeague.icon} ${myLeague.nameRu}` : '—'}</div>
            <div className="text-[10px] text-muted-foreground">Рейтинг {myRating} • {myWins}П / {myLosses}Пор</div>
          </div>
        </CardContent>
      </Card>

      {lastResult && (
        <Card className={`border-border ${lastResult.won ? 'border-uncommon/60 bg-uncommon/5' : 'border-destructive/60 bg-destructive/5'}`}>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm">{lastResult.won ? '🏆 Победа!' : '💀 Поражение'}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <Badge variant="outline" className={lastResult.ratingDelta >= 0 ? 'text-uncommon border-uncommon/30' : 'text-destructive border-destructive/30'}>
                Рейтинг {lastResult.ratingDelta >= 0 ? '+' : ''}{lastResult.ratingDelta} → {lastResult.newRating}
              </Badge>
              {lastResult.won && <Badge variant="outline" className="text-gold border-gold/30">+{lastResult.goldGained} 💰 +{lastResult.xpGained} XP</Badge>}
              {lastResult.leveledUp && <Badge className="bg-gold/20 text-gold">🎉 Новый уровень!</Badge>}
            </div>
            <ScrollArea className="h-32">
              <div className="space-y-1">
                {lastResult.log.map((line, i) => (
                  <p key={i} className="text-[11px] text-muted-foreground leading-relaxed">{line}</p>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {opponents.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">Пока не с кем сражаться — соперники появятся по мере роста игроков</p>
            </CardContent>
          </Card>
        ) : (
          opponents.map(o => (
            <Card key={o.id} className="border-border">
              <CardContent className="p-3 flex items-center gap-2">
                <span className="text-xl shrink-0">{o.class.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">{o.name} <span className="text-muted-foreground">Ур.{o.level}</span></div>
                  <div className="text-[10px] text-muted-foreground">{o.league.icon} {o.league.nameRu} • {o.pvpRating} • {o.pvpWins}П/{o.pvpLosses}Пор</div>
                </div>
                <Button
                  size="sm"
                  className="h-7 text-xs shrink-0"
                  disabled={loading || fightingId === o.id}
                  onClick={() => handleChallenge(o.id)}
                >
                  {fightingId === o.id ? '...' : 'Атаковать'}
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </TabsContent>
  );
}
