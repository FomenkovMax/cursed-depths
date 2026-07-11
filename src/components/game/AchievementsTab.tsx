import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { AchievementEntry } from '@/lib/game-types';

interface AchievementsTabProps {
  achievements: AchievementEntry[];
  loading: boolean;
}

/** Плитка-медаль в сетке — тот же язык, что и ItemIconTile в инвентаре, но под значки
 * ачивок: заблокированные приглушены с замком, разблокированные — золотая рамка. */
function AchievementTile({ a, onClick }: { a: AchievementEntry; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative aspect-square rounded-lg border flex items-center justify-center transition-colors hover:bg-secondary/40 ${
        a.unlocked ? 'border-gold/70 bg-gold/10' : 'border-border bg-secondary/20 opacity-60'
      }`}
    >
      <span className="text-2xl">{a.unlocked ? a.icon : '🔒'}</span>
    </button>
  );
}

export function AchievementsTab({ achievements, loading }: AchievementsTabProps) {
  const [selected, setSelected] = useState<AchievementEntry | null>(null);
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
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="grid grid-cols-5 gap-2">
              {achievements.map(a => (
                <AchievementTile key={a.id} a={a} onClick={() => setSelected(a)} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-xs">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-sm">
                  <span className="text-2xl">{selected.unlocked ? selected.icon : '🔒'}</span>
                  <span className={selected.unlocked ? 'text-gold' : ''}>{selected.nameRu}</span>
                </DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground leading-relaxed">{selected.descriptionRu}</p>
              {!selected.unlocked && selected.target !== null && selected.progress !== null && (
                <div className="flex items-center gap-2 pt-1">
                  <Progress value={(selected.progress / selected.target) * 100} className="h-1.5 flex-1" />
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {selected.progress}/{selected.target}
                  </span>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}
