import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrophyRoomStateView, TrophyEntryView } from '@/lib/game-types';

interface TrophyRoomTabProps {
  state: TrophyRoomStateView | null;
  loading: boolean;
}

/** Карточка одного босса — повержен показывает иконку/имя/счётчик побед и лор (раскрывается
 * только после первой победы), не повержен остаётся силуэтом с подсказкой по локации. Иконки —
 * временная эмодзи-заглушка, полноценные арты появятся отдельным дизайн-проходом. */
function TrophyCard({ t }: { t: TrophyEntryView }) {
  return (
    <Card className={t.defeated ? 'border-gold/50 bg-gold/5' : 'border-border bg-secondary/10'}>
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-center gap-2.5">
          <span className={`text-2xl ${t.defeated ? '' : 'grayscale opacity-40'}`}>{t.defeated ? t.icon : '❔'}</span>
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium truncate ${t.defeated ? 'text-gold' : 'text-muted-foreground'}`}>
              {t.defeated ? t.nameRu : '???'}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">{t.locationNameRu}</div>
          </div>
          {t.defeated && (
            <Badge variant="outline" className="text-[10px] h-5 border-gold/40 text-gold shrink-0">
              ×{t.killCount}
            </Badge>
          )}
        </div>
        {t.defeated ? (
          <p className="text-[10px] text-muted-foreground leading-relaxed italic pt-0.5">{t.loreRu}</p>
        ) : (
          <p className="text-[10px] text-muted-foreground/70 leading-relaxed">Ещё не повержен — ищите в этой локации.</p>
        )}
        {t.rarestItemNameRu && (
          <div className="pt-1 border-t border-border/40">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground truncate">
                {t.rarestItemIcon} {t.rarestItemNameRu}
              </span>
              <span className="text-[9px] text-muted-foreground shrink-0">
                {t.pityRemaining === 0 ? 'гарантирован!' : `через ${t.pityRemaining} побед`}
              </span>
            </div>
            <div className="h-1 rounded-full bg-secondary/50 mt-1 overflow-hidden">
              <div
                className="h-full bg-gold/70 rounded-full"
                style={{ width: `${Math.min(100, Math.round((t.pityCounter / t.pityCap) * 100))}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TrophyRoomTab({ state, loading }: TrophyRoomTabProps) {
  return (
    <TabsContent value="trophies" className="flex-1 overflow-y-auto p-4 space-y-3 m-0">
      <div className="text-center mb-2">
        <h3 className="font-bold text-sm">🎖️ Комната трофеев</h3>
        {state?.premiumActive && (
          <p className="text-xs text-muted-foreground">Собрано {state.collectedCount} из {state.totalCount}</p>
        )}
      </div>

      {!state?.premiumActive ? (
        <Card className="border-border">
          <CardContent className="p-6 text-center space-y-2">
            <div className="text-3xl">🎖️</div>
            <p className="text-sm text-muted-foreground">
              Комната трофеев доступна только с активным премиум-статусом.
            </p>
            <p className="text-[10px] text-muted-foreground">
              Каждая победа над уникальным боссом (пока премиум активен) пополняет счётчик и раскрывает его лор — чисто коллекционная память о ваших победах.
            </p>
          </CardContent>
        </Card>
      ) : loading && state.trophies.length === 0 ? (
        <Card className="border-border">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {state.trophies.map(t => (
            <TrophyCard key={t.enemyId} t={t} />
          ))}
        </div>
      )}
    </TabsContent>
  );
}
