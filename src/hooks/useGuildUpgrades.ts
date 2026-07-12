import { useCallback, useState } from 'react';
import { GameMessage, GuildData, PlayerData } from '@/lib/game-types';

interface UseGuildUpgradesArgs {
  apiCall: (url: string, method?: string, body?: unknown) => Promise<{ player?: PlayerData; guild?: GuildData; message?: string; error?: string }>;
  onPlayerUpdate: (player: PlayerData) => void;
  onGuildUpdate: (guild: GuildData) => void;
  onMessage: (message: GameMessage) => void;
}

/** Дерево построек само статично (src/lib/social/guild-upgrades.ts) — этот хук отвечает только за
 * пожертвование в казну и разблокировку узла (POST-запросы + обновление guild/player), per
 * CLAUDE.md. Список построек и текущий unlocked-набор читаются из уже загруженного `guild`
 * в page.tsx, не дублируются здесь. */
export function useGuildUpgrades({ apiCall, onPlayerUpdate, onGuildUpdate, onMessage }: UseGuildUpgradesArgs) {
  const [donating, setDonating] = useState(false);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const donate = useCallback(async (amount: number) => {
    setDonating(true);
    try {
      const data = await apiCall('/api/guild/donate', 'POST', { amount });
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
        return;
      }
      if (data.player) onPlayerUpdate(data.player);
      if (data.guild) onGuildUpdate(data.guild);
      onMessage({ text: data.message ?? 'Пожертвование внесено', type: 'success' });
    } catch {
      onMessage({ text: 'Ошибка пожертвования', type: 'error' });
    } finally {
      setDonating(false);
    }
  }, [apiCall, onPlayerUpdate, onGuildUpdate, onMessage]);

  const unlock = useCallback(async (upgradeId: string) => {
    setUnlockingId(upgradeId);
    try {
      const data = await apiCall('/api/guild/upgrade', 'POST', { upgradeId });
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
        return;
      }
      if (data.guild) onGuildUpdate(data.guild);
      onMessage({ text: data.message ?? 'Постройка разблокирована', type: 'success' });
    } catch {
      onMessage({ text: 'Ошибка разблокировки постройки', type: 'error' });
    } finally {
      setUnlockingId(null);
    }
  }, [apiCall, onGuildUpdate, onMessage]);

  return { donating, unlockingId, donate, unlock };
}
