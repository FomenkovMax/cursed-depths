import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { TrophyRoomStateView, TrophyEntryView } from '@/lib/game-types';

interface TrophyRoomTabProps {
  state: TrophyRoomStateView | null;
  loading: boolean;
}

/** Плитка трофея — тот же язык, что AchievementTile: заблокированные приглушены с замком,
 * добытые — золотая рамка. */
function TrophyTile({ t, onClick }: { t: TrophyEntryView; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative aspect-square rounded-lg border flex items-center justify-center transition-colors hover:bg-secondary/40 ${
        t.defeated ? 'border-gold/70 bg-gold/10' : 'border-border bg-secondary/20 opacity-60'
      }`}
    >
      <span className="text-2xl">{t.defeated ? t.icon : '🔒'}</span>
    </button>
  );
}

export function TrophyRoomTab({ state, loading }: TrophyRoomTabProps) {
  const [selected, setSelected] = useState<TrophyEntryView | null>(null);
  const trophies = state?.trophies ?? [];

  return (
    <TabsContent value="trophies" className="flex-1 overflow-y-auto p-4 space-y-3 m-0">
      <div className="text-center mb-2">
        <h3 className="font-bold text-sm">🎖️ Комната трофеев</h3>
        <p className="text-xs text-muted-foreground">
          Собрано {state?.collectedCount ?? 0} из {state?.totalCount ?? 0}
        </p>
      </div>

      {!state?.premiumActive && (
        <Card className="border-gold/50 bg-gold/5">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">
              Каждый первый килл босса запоминается навсегда — но золото и{' '}
              <Badge className="mx-0.5 text-[9px] h-4 px-1 bg-gold/20 text-gold">👑 {state?.rewardGold ?? 500} + {state?.rewardShards ?? 20} Осколков</Badge>{' '}
              за него достаются только с активным премиумом в момент килла.
            </p>
          </CardContent>
        </Card>
      )}

      {loading && trophies.length === 0 ? (
        <Card className="border-border">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="grid grid-cols-5 gap-2">
              {trophies.map(t => (
                <TrophyTile key={t.enemyId} t={t} onClick={() => setSelected(t)} />
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
                  <span className="text-2xl">{selected.defeated ? selected.icon : '🔒'}</span>
                  <span className={selected.defeated ? 'text-gold' : ''}>{selected.defeated ? selected.nameRu : '???'}</span>
                </DialogTitle>
              </DialogHeader>
              {selected.defeated ? (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Повержен в локации «{selected.locationNameRu}»{selected.defeatedAt ? ` — ${new Date(selected.defeatedAt).toLocaleDateString('ru-RU')}` : ''}.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Этот босс ещё не повержен. Найдите его в локации «{selected.locationNameRu}».
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}
