import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AchievementEntry } from '@/lib/game-types';

interface AchievementsTabProps {
  achievements: AchievementEntry[];
  loading: boolean;
}

export function AchievementsTab({ achievements, loading }: AchievementsTabProps) {
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <TabsContent value="achievements" className="flex-1 overflow-y-auto p-4 space-y-3 m-0">
      <div className="text-center mb-2">
        <h3 className="font-bold text-sm">Достижения</h3>
        <p className="text-xs text-muted-foreground">
          Разблокировано {unlockedCount} из {achievements.length}
        </p>
      </div>

      {loading && achievements.length === 0 ? (
        <Card className="border-border">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {achievements.map(a => (
            <Card
              key={a.id}
              className={`border-border ${a.unlocked ? 'border-gold/60 bg-gold/5' : 'opacity-60'}`}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <span className="text-2xl shrink-0">{a.unlocked ? a.icon : '🔒'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">{a.nameRu}</div>
                  <div className="text-[10px] text-muted-foreground">{a.descriptionRu}</div>
                  {!a.unlocked && a.target !== null && a.progress !== null && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <Progress value={(a.progress / a.target) * 100} className="h-1.5 flex-1" />
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {a.progress}/{a.target}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </TabsContent>
  );
}
