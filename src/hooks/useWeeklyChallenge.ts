import { useCallback, useEffect, useState } from 'react';
import { GameMessage, GameTab, WeeklyChallengeAttemptResultView, WeeklyChallengeStateView } from '@/lib/game-types';

interface UseWeeklyChallengeArgs {
  apiCall: (url: string, method?: string, body?: unknown) => Promise<Record<string, unknown> & { error?: string; message?: string }>;
  telegramIdRef: React.RefObject<string>;
  tab: GameTab;
  onMessage: (message: GameMessage) => void;
  refreshPlayer: () => Promise<void>;
}

/** Испытание недели — горизонтальный endgame-контент (см. lib/social/weekly-challenge.ts):
 * solo-бой мгновенно резолвится за один запрос, как и Доска контрактов, поэтому хук зеркалит
 * форму useAccountVault/premium-хуков, а не многоходовую in-combat модель useCombatState. */
export function useWeeklyChallenge({ apiCall, telegramIdRef, tab, onMessage, refreshPlayer }: UseWeeklyChallengeArgs) {
  const [state, setState] = useState<WeeklyChallengeStateView | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempting, setAttempting] = useState(false);
  const [lastResult, setLastResult] = useState<WeeklyChallengeAttemptResultView | null>(null);

  const refresh = useCallback(() => {
    if (!telegramIdRef.current) return;
    setLoading(true);
    apiCall('/api/weekly-challenge/state')
      .then(data => { if (!data.error) setState(data as unknown as WeeklyChallengeStateView); })
      .catch(() => onMessage({ text: 'Не удалось загрузить испытание недели', type: 'error' }))
      .finally(() => setLoading(false));
  }, [apiCall, telegramIdRef, onMessage]);

  useEffect(() => {
    if (tab !== 'weekly-challenge') return;
    refresh();
  }, [tab, refresh]);

  const attempt = useCallback(async () => {
    setAttempting(true);
    try {
      const data = await apiCall('/api/weekly-challenge/attempt', 'POST');
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
        return;
      }
      const result = data as unknown as WeeklyChallengeAttemptResultView;
      setLastResult(result);
      onMessage({ text: result.won ? `Победа над ${result.target.nameRu}!` : `Поражение — ${result.target.nameRu} оказался сильнее.`, type: result.won ? 'success' : 'error' });
      await refreshPlayer();
      refresh();
    } catch {
      onMessage({ text: 'Не удалось начать испытание недели', type: 'error' });
    } finally {
      setAttempting(false);
    }
  }, [apiCall, onMessage, refreshPlayer, refresh]);

  return { state, loading, attempting, lastResult, refresh, attempt };
}
