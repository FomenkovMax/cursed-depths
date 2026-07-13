import { useCallback, useEffect, useState } from 'react';
import { AccountVaultStateView, GameMessage, GameTab, PlayerData } from '@/lib/game-types';

interface UseAccountVaultArgs {
  apiCall: (url: string, method?: string, body?: unknown) => Promise<Record<string, unknown> & { error?: string; message?: string }>;
  telegramIdRef: React.RefObject<string>;
  tab: GameTab;
  onPlayerUpdate: (player: PlayerData) => void;
  onMessage: (message: GameMessage) => void;
  refreshPlayer: () => Promise<void>;
  /** Осколки Короны показываются везде из usePremiumFeatures().premiumState, а не из player
   * напрямую (см. page.tsx) — после перевода Осколков в сейф/из сейфа нужно отдельно попросить
   * premium-хук перечитать своё состояние, иначе шапка/кошелёк останутся со старым числом. */
  onShardsChanged: () => void;
}

/** Общий сейф на аккаунт (расшарен между двумя слотами персонажа, см. schema.prisma
 * AccountVault) — золото/Осколки Короны/предметы, видимые обоим слотам. UI живёт внутри
 * InventoryTab.tsx (переключатель Инвентарь/Хранилище/Сейф) — рядом с личным инвентарём и
 * личным хранилищем, а не на вкладке переключения персонажей (useCharacterSlots). */
export function useAccountVault({ apiCall, telegramIdRef, tab, onPlayerUpdate, onMessage, refreshPlayer, onShardsChanged }: UseAccountVaultArgs) {
  const [state, setState] = useState<AccountVaultStateView | null>(null);
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);

  const refresh = useCallback(() => {
    if (!telegramIdRef.current) return;
    setLoading(true);
    apiCall('/api/vault/state')
      .then(data => { if (!data.error) setState(data as unknown as AccountVaultStateView); })
      .catch(() => onMessage({ text: 'Не удалось загрузить сейф', type: 'error' }))
      .finally(() => setLoading(false));
  }, [apiCall, telegramIdRef, onMessage]);

  useEffect(() => {
    // Живёт внутри вкладки "inventory" (InventoryTab.tsx, переключатель Инвентарь/Хранилище/
    // Сейф), а не "characters" — сейф про предметы/золото, а не про переключение персонажей.
    if (tab !== 'inventory') return;
    refresh();
  }, [tab, refresh]);

  const runTransfer = useCallback(async (url: string, body: unknown, fallbackError: string, afterSuccess?: () => void) => {
    setTransferring(true);
    try {
      const data = await apiCall(url, 'POST', body);
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
        return;
      }
      if (data.player) onPlayerUpdate(data.player as unknown as PlayerData);
      if (data.message) onMessage({ text: data.message, type: 'success' });
      refresh();
      afterSuccess?.();
    } catch {
      onMessage({ text: fallbackError, type: 'error' });
    } finally {
      setTransferring(false);
    }
  }, [apiCall, onMessage, onPlayerUpdate, refresh]);

  const depositGold = useCallback((amount: number) => runTransfer('/api/vault/deposit-gold', { amount }, 'Не удалось положить золото'), [runTransfer]);
  const withdrawGold = useCallback((amount: number) => runTransfer('/api/vault/withdraw-gold', { amount }, 'Не удалось забрать золото'), [runTransfer]);
  const depositShards = useCallback(
    (amount: number) => runTransfer('/api/vault/deposit-shards', { amount }, 'Не удалось положить Осколки', onShardsChanged),
    [runTransfer, onShardsChanged],
  );
  const withdrawShards = useCallback(
    (amount: number) => runTransfer('/api/vault/withdraw-shards', { amount }, 'Не удалось забрать Осколки', onShardsChanged),
    [runTransfer, onShardsChanged],
  );

  const storeItem = useCallback(async (inventoryId: string) => {
    setTransferring(true);
    try {
      const data = await apiCall('/api/vault/store-item', 'POST', { inventoryId });
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
        return;
      }
      onMessage({ text: (data.message as string) ?? 'Предмет убран в сейф', type: 'success' });
      await refreshPlayer();
      refresh();
    } catch {
      onMessage({ text: 'Не удалось убрать предмет в сейф', type: 'error' });
    } finally {
      setTransferring(false);
    }
  }, [apiCall, onMessage, refresh, refreshPlayer]);

  const retrieveItem = useCallback(async (vaultItemId: string) => {
    setTransferring(true);
    try {
      const data = await apiCall('/api/vault/retrieve-item', 'POST', { vaultItemId });
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
        return;
      }
      onMessage({ text: (data.message as string) ?? 'Предмет возвращён в инвентарь', type: 'success' });
      await refreshPlayer();
      refresh();
    } catch {
      onMessage({ text: 'Не удалось достать предмет из сейфа', type: 'error' });
    } finally {
      setTransferring(false);
    }
  }, [apiCall, onMessage, refresh, refreshPlayer]);

  return { state, loading, transferring, refresh, depositGold, withdrawGold, depositShards, withdrawShards, storeItem, retrieveItem };
}
