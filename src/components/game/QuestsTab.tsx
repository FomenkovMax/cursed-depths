import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlayerData, parseStats } from '@/lib/game-types';

interface QuestsTabProps {
  player: PlayerData | null;
  loading: boolean;
  onClaimQuest: (questId: string) => void;
}

export function QuestsTab({ player, loading, onClaimQuest }: QuestsTabProps) {
  const playerQuests = player?.quests || [];

  return (
    <TabsContent value="quests" className="flex-1 overflow-y-auto p-4 space-y-3 m-0">
      <div className="text-center mb-2">
        <h3 className="font-bold text-sm">Квесты</h3>
        <p className="text-xs text-muted-foreground">Выполняйте задания для наград</p>
      </div>

      {playerQuests.length === 0 ? (
        <Card className="border-border">
          <CardContent className="p-6 text-center">
            <div className="text-3xl mb-2">📜</div>
            <p className="text-sm text-muted-foreground">Нет активных квестов</p>
            <p className="text-xs text-muted-foreground mt-1">Исследуйте подземелья, чтобы получить задания</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-2 pr-2">
            {playerQuests.map(quest => {
              const reward = parseStats(quest.reward);
              const progressPercent = Math.min(100, (quest.progress / quest.target) * 100);
              return (
                <Card
                  key={quest.id}
                  className={`border-border ${
                    quest.claimed ? 'opacity-50' :
                    quest.completed ? 'border-gold/50 bg-gold/5' : ''
                  }`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-xl mt-0.5">
                        {quest.type === 'daily' ? '📅' : quest.type === 'kill' ? '⚔️' : quest.type === 'explore' ? '🗺️' : quest.type === 'craft' ? '⚒️' : '📜'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm">{quest.title}</h4>
                        <p className="text-[10px] text-muted-foreground">{quest.description}</p>

                        {/* Progress bar */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                quest.completed ? 'bg-gold' : 'bg-primary'
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {quest.progress}/{quest.target}
                          </span>
                        </div>

                        {/* Reward */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] text-muted-foreground">Награда:</span>
                          {reward.xp > 0 && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 text-xp">+{reward.xp} XP</Badge>
                          )}
                          {reward.gold > 0 && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 text-gold">+{reward.gold} 💰</Badge>
                          )}
                          {quest.claimed && (
                            <Badge className="text-[10px] h-4 bg-muted text-muted-foreground">Получено</Badge>
                          )}
                        </div>

                        {/* Claim button */}
                        {quest.completed && !quest.claimed && (
                          <Button
                            size="sm"
                            className="mt-2 h-7 text-xs bg-gold/80 hover:bg-gold text-background"
                            onClick={() => onClaimQuest(quest.id)}
                            disabled={loading}
                          >
                            🎁 Получить награду
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </TabsContent>
  );
}
