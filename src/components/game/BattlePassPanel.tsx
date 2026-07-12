import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BattlePassStateView, BattlePassTierView } from '@/lib/game-types';

interface BattlePassPanelProps {
  state: BattlePassStateView | null;
  loading: boolean;
  claimingTier: number | null;
  onClaimTier: (tier: number) => void;
}

function rewardLabel(reward: BattlePassTierView['reward']): string {
  const parts: string[] = [];
  if (reward.gold) parts.push(`💰 ${reward.gold}`);
  if (reward.crownShards) parts.push(`👑 ${reward.crownShards}`);
  for (const item of reward.items ?? []) {
    parts.push(`${item.icon} ${item.nameRu} ×${item.quantity}`);
  }
  return parts.join(' + ');
}

export function BattlePassPanel({ state, loading, claimingTier, onClaimTier }: BattlePassPanelProps) {
  if (!state?.premiumActive) {
    return (
      <p className="text-[10px] text-muted-foreground text-center py-2">
        Боевой пропуск доступен только с активным премиум-статусом.
      </p>
    );
  }

  const maxTier = state.tiers[state.tiers.length - 1];
  const progressPercent = maxTier ? Math.min(100, (state.xp / maxTier.xpRequired) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="text-center text-[10px] text-muted-foreground">
        Сезон {state.seasonId} • очков: {state.xp}
      </div>
      <Progress value={progressPercent} className="h-2" />

      <div className="space-y-1.5">
        {state.tiers.map(t => (
          <div
            key={t.tier}
            className={`flex items-center gap-3 p-2 rounded-lg border ${
              t.claimed ? 'border-gold/60 bg-gold/10' : t.unlocked ? 'border-uncommon/50 bg-uncommon/5' : 'border-border/40 bg-secondary/10 opacity-70'
            }`}
          >
            <span className="text-[10px] w-6 shrink-0 text-center font-bold text-muted-foreground">#{t.tier}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium">{rewardLabel(t.reward)}</div>
              <div className="text-[10px] text-muted-foreground">{t.xpRequired} очков</div>
            </div>
            {t.claimed ? (
              <span className="text-[10px] text-gold shrink-0">Получено</span>
            ) : t.unlocked ? (
              <Button
                size="sm"
                className="h-7 text-[10px] shrink-0"
                disabled={loading || claimingTier !== null}
                onClick={() => onClaimTier(t.tier)}
              >
                {claimingTier === t.tier ? '...' : 'Забрать'}
              </Button>
            ) : (
              <span className="text-[10px] text-muted-foreground shrink-0">🔒</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
