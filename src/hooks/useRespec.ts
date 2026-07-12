import { useCallback, useState } from 'react';
import { GameMessage, PlayerData } from '@/lib/game-types';
import type { RespecStatField } from '@/lib/economy/respec';

interface UseRespecArgs {
  apiCall: (url: string, method?: string, body?: unknown) => Promise<{ player?: PlayerData; message?: string; error?: string }>;
  onPlayerUpdate: (player: PlayerData) => void;
  onMessage: (message: GameMessage) => void;
}

/** Модалка respec (src/components/game/RespecModal.tsx) сама владеет черновым распределением
 * очков — этот хук отвечает только за open/close и запрос на сервер, per CLAUDE.md. */
export function useRespec({ apiCall, onPlayerUpdate, onMessage }: UseRespecArgs) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (allocations: Record<RespecStatField, number>) => {
    setSubmitting(true);
    try {
      const data = await apiCall('/api/player/respec', 'POST', { allocations });
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
        return;
      }
      if (data.player) onPlayerUpdate(data.player);
      onMessage({ text: data.message ?? 'Характеристики перераспределены', type: 'success' });
      setOpen(false);
    } catch {
      onMessage({ text: 'Ошибка respec', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [apiCall, onPlayerUpdate, onMessage]);

  return { open, setOpen, submitting, submit };
}
