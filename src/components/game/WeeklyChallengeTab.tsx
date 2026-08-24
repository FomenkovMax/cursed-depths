import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { WeeklyChallengeStateView, WeeklyChallengeAttemptResultView } from '@/lib/game-types';
import { BOSS_PORTRAIT_IMAGES, TAB_BANNER_IMAGES } from '@/lib/asset-icons';
import { TabBanner } from '@/components/game/TabBanner';

interface WeeklyChallengeTabProps {
  state: WeeklyChallengeStateView | null;
  loading: boolean;
  attempting: boolean;
  lastResult: WeeklyChallengeAttemptResultView | null;
  onAttempt: () => void;
}

/** Испытание недели — единственный горизонтальный endgame-контент: solo, бесплатно, без
 * гильдии, детерминированно выбранный по неделе босс, одна попытка на игрока за неделю
 * (см. lib/social/weekly-challenge.ts). */
export function WeeklyChallengeTab({ state, loading, attempting, lastResult, onAttempt }: WeeklyChallengeTabProps) {
  if (loading && !state) {
    return (
      <TabsContent value="weekly-challenge" className="flex-1 overflow-y-auto p-4 space-y-3 m-0 animate-fade-in">
        <p className="text-xs text-muted-foreground text-center py-4">Загрузка испытания недели...</p>
      </TabsContent>
    );
  }

  if (!state) {
    return <TabsContent value="weekly-challenge" className="flex-1 overflow-y-auto p-4 space-y-3 m-0 animate-fade-in" />;
  }

  return (
    <TabsContent value="weekly-challenge" className="flex-1 overflow-y-auto p-4 space-y-3 m-0 animate-fade-in">
      <TabBanner
        src={TAB_BANNER_IMAGES['weekly-challenge']}
        title="Испытание недели"
        subtitle="Одна попытка за неделю — бой резолвится мгновенно."
      />

      <Card className="border-border overflow-hidden">
        {/* Full-body портрет босса недели — тот же баннер-приём, что и в CombatTab/PartyTab,
            вместо мелкой обрезанной иконки 64×64 (кроп-баг, отмеченный ранее как открытый пункт). */}
        {BOSS_PORTRAIT_IMAGES[state.target.enemyId] ? (
          <div className="relative w-full aspect-[3/4] max-h-72 overflow-hidden bg-secondary/20">
            <img src={BOSS_PORTRAIT_IMAGES[state.target.enemyId]} alt="" className="w-full h-full object-cover object-top" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-3 pt-8 pb-2">
              <div className="text-sm font-medium text-white">{state.target.nameRu}</div>
              <div className="text-[10px] text-white/80">Неделя {state.weekId}</div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center">
            <div className="text-3xl">{state.target.icon}</div>
            <div className="text-sm font-medium">{state.target.nameRu}</div>
            <div className="text-[10px] text-muted-foreground">Неделя {state.weekId}</div>
          </div>
        )}
        <CardContent className="p-4 text-center space-y-2">
          {state.myResult && (
            <div className={`p-2 rounded-lg border text-[10px] ${state.myResult.won ? 'bg-uncommon/10 border-uncommon/30 text-uncommon' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
              {state.myResult.won
                ? `Побеждён за ${state.myResult.turnsTaken} ход(ов), осталось ${state.myResult.hpPercentRemaining}% ХП`
                : `Поражение на ${state.myResult.turnsTaken} ходу`}
            </div>
          )}

          <button
            type="button"
            onClick={onAttempt}
            disabled={loading || attempting || state.attempted}
            className="w-full h-9 text-xs rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {attempting ? 'Идёт бой...' : state.attempted ? 'Попытка на эту неделю использована' : '⚔️ Бросить вызов'}
          </button>
        </CardContent>
      </Card>

      {lastResult && (
        <Card className="border-border">
          <CardContent className="p-3 space-y-1">
            <div className="text-xs font-medium">
              {lastResult.won ? '🏆 Победа!' : '💀 Поражение'}
              {lastResult.won && <span className="text-gold"> — 👑 {lastResult.goldGained} золота, ✨ {lastResult.xpGained} опыта{lastResult.itemWon ? `, добыт трофей: ${lastResult.itemWon}` : ''}</span>}
            </div>
            <div className="max-h-40 overflow-y-auto text-[10px] text-muted-foreground space-y-0.5">
              {lastResult.log.map((line, i) => <div key={i}>{line}</div>)}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border">
        <CardContent className="p-3">
          <div className="text-xs font-medium mb-1.5">🏆 Лучшие этой недели</div>
          {state.leaderboard.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-1">Пока никто не победил на этой неделе.</p>
          ) : (
            <div className="space-y-1">
              {state.leaderboard.map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-[10px] py-0.5">
                  <span className="text-muted-foreground">#{i + 1} {entry.name}</span>
                  <span>{entry.turnsTaken} ход(ов), {entry.hpPercentRemaining}% ХП</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
