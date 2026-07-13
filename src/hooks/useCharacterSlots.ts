import { useCallback, useEffect, useState } from 'react';
import { ApiCallFn, CharacterSlotsStateView, GameMessage, GameTab } from '@/lib/game-types';

interface UseCharacterSlotsArgs {
  apiCall: ApiCallFn;
  telegramIdRef: React.RefObject<string>;
  tab: GameTab;
  onMessage: (message: GameMessage) => void;
}

/** Второй слот персонажа с общим telegramId-аккаунтом (аудит 4.1, D1/D3) — см.
 * lib/account-slots.ts за объяснением механизма свапа. Переключение персонажа меняет, ЧЕЙ
 * Player-ряд отвечает на все последующие запросы этого telegramId — единственный надёжный
 * способ подхватить это на фронте без переписывания состояния каждой вкладки — полная
 * перезагрузка страницы сразу после успешного свапа. */
export function useCharacterSlots({ apiCall, telegramIdRef, tab, onMessage }: UseCharacterSlotsArgs) {
  const [state, setState] = useState<CharacterSlotsStateView | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!telegramIdRef.current) return;
    setLoading(true);
    apiCall('/api/account/characters')
      .then(data => { if (data.characters) setState(data as unknown as CharacterSlotsStateView); })
      .catch(() => onMessage({ text: 'Не удалось загрузить персонажей', type: 'error' }))
      .finally(() => setLoading(false));
  }, [apiCall, telegramIdRef, onMessage]);

  useEffect(() => {
    if (tab !== 'characters') return;
    refresh();
  }, [tab, refresh]);

  const createCharacter = useCallback(async (name: string, race: string, className: string) => {
    setCreating(true);
    try {
      const data = await apiCall('/api/account/create-character', 'POST', { name, race, className });
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
        return;
      }
      onMessage({ text: (data.message as string) ?? 'Персонаж создан', type: 'success' });
      refresh();
    } catch {
      onMessage({ text: 'Не удалось создать персонажа', type: 'error' });
    } finally {
      setCreating(false);
    }
  }, [apiCall, onMessage, refresh]);

  const switchCharacter = useCallback(async (characterId: string) => {
    setSwitchingId(characterId);
    try {
      const data = await apiCall('/api/account/switch-character', 'POST', { characterId });
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
        setSwitchingId(null);
        return;
      }
      onMessage({ text: 'Персонаж переключён — перезагрузка...', type: 'success' });
      window.location.reload();
    } catch {
      onMessage({ text: 'Не удалось переключить персонажа', type: 'error' });
      setSwitchingId(null);
    }
  }, [apiCall, onMessage]);

  return { state, loading, creating, switchingId, refresh, createCharacter, switchCharacter };
}
