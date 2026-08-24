import { useEffect, useState } from 'react';
import { ExpeditionStateView } from '@/lib/game-types';

interface ExpeditionPanelProps {
  state: ExpeditionStateView | null;
  loading: boolean;
  starting: string | null;
  claiming: boolean;
  onStart: (tierId: string) => void;
  onClaim: () => void;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

/** Экспедиции — офлайн-механика (lib/premium/expeditions.ts): не блокирует остальную игру,
 * просто таймер поверх текущей сессии. Тикающий обратный отсчёт — единственная причина, по
 * которой этому компоненту вообще нужен собственный setInterval (больше нигде в игре нет
 * "живого" таймера на фронте). Премиум — любой тир без лимита; F2P (волна 2B, п.24) — раз в
 * день только самый короткий тир, с половинной наградой, остальные тиры видны, но заперты —
 * "вкус" механики вместо полной невидимости, как было раньше. */
export function ExpeditionPanel({ state, loading, starting, claiming, onStart, onClaim }: ExpeditionPanelProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!state?.active || state.active.ready) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state?.active]);

  if (!state) return null;

  if (state.active) {
    const endsAtMs = new Date(state.active.endsAt).getTime();
    const remaining = endsAtMs - now;
    const ready = state.active.ready || remaining <= 0;

    return (
      <div className="p-3 rounded-lg border border-primary/40 bg-primary/5 text-center space-y-2">
        <div className="text-2xl">{state.active.tier?.icon ?? '🎒'}</div>
        <div className="text-sm font-medium">{state.active.tier?.nameRu ?? 'Экспедиция'}</div>
        {ready ? (
          <>
            <div className="text-xs text-uncommon">Герой вернулся!</div>
            <button
              type="button"
              onClick={onClaim}
              disabled={claiming}
              className="w-full h-9 text-xs rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50"
            >
              {claiming ? 'Забираем...' : '🎁 Забрать награду'}
            </button>
          </>
        ) : (
          <div className="text-lg font-mono text-muted-foreground">{formatRemaining(remaining)}</div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!state.premiumActive && (
        <p className="text-[10px] text-muted-foreground text-center">
          {state.f2pUsedToday
            ? 'Бесплатная вылазка на сегодня использована — возвращайтесь завтра, или снимите дневной лимит и откройте остальные тиры премиумом.'
            : 'Бесплатно доступна короткая вылазка раз в день (награда x0.5) — остальные тиры и полная награда только с премиумом.'}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {state.tiers.map(tier => {
          const isF2pTier = tier.id === state.f2pTierId;
          const locked = !state.premiumActive && (!isF2pTier || state.f2pUsedToday);
          return (
            <div key={tier.id} className={`p-2 rounded-lg border flex flex-col gap-1 ${locked ? 'border-border/40 bg-secondary/5 opacity-60' : 'border-border/60 bg-secondary/10'}`}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{tier.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium flex items-center gap-1">
                    {tier.nameRu}
                    {!state.premiumActive && isF2pTier && <span className="text-[8px] text-uncommon">x0.5</span>}
                  </div>
                  <div className="text-[9px] text-muted-foreground">{tier.hours} ч.</div>
                </div>
              </div>
              <div className="text-[9px] text-muted-foreground italic leading-tight">{tier.descriptionRu}</div>
              <button
                type="button"
                onClick={() => onStart(tier.id)}
                disabled={loading || starting !== null || locked}
                className="h-7 text-[10px] rounded-md border border-primary/60 font-medium disabled:opacity-50 hover:bg-primary/10"
              >
                {starting === tier.id ? '...' : locked ? '👑 Премиум' : 'Отправить'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
