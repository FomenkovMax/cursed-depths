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

/** Экспедиции — премиум-эксклюзивная офлайн-механика (lib/expeditions.ts): не блокирует
 * остальную игру, просто таймер поверх текущей сессии. Тикающий обратный отсчёт — единственная
 * причина, по которой этому компоненту вообще нужен собственный setInterval (больше нигде в
 * игре нет "живого" таймера на фронте). */
export function ExpeditionPanel({ state, loading, starting, claiming, onStart, onClaim }: ExpeditionPanelProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!state?.active || state.active.ready) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state?.active]);

  if (!state?.premiumActive) {
    return (
      <p className="text-[10px] text-muted-foreground text-center py-2">
        Экспедиции доступны только с активным премиум-статусом.
      </p>
    );
  }

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
    <div className="grid grid-cols-2 gap-2">
      {state.tiers.map(tier => (
        <div key={tier.id} className="p-2 rounded-lg border border-border/60 bg-secondary/10 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">{tier.icon}</span>
            <div className="min-w-0">
              <div className="text-xs font-medium">{tier.nameRu}</div>
              <div className="text-[9px] text-muted-foreground">{tier.hours} ч.</div>
            </div>
          </div>
          <div className="text-[9px] text-muted-foreground italic leading-tight">{tier.descriptionRu}</div>
          <button
            type="button"
            onClick={() => onStart(tier.id)}
            disabled={loading || starting !== null}
            className="h-7 text-[10px] rounded-md border border-primary/60 font-medium disabled:opacity-50 hover:bg-primary/10"
          >
            {starting === tier.id ? '...' : 'Отправить'}
          </button>
        </div>
      ))}
    </div>
  );
}
