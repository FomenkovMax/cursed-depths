import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GameMessage,
  GameScreen,
  GameTab,
  GuildData,
  PlayerData,
  WorldBossStateView,
  WorldBossAttackResultView,
  FortressStateView,
  FortressAssaultResultView,
  GuildRaidBossStateView,
  GuildRaidAttackResultView,
} from '@/lib/game-types';

interface UseSocialFeaturesArgs {
  apiCall: (url: string, method?: string, body?: unknown) => Promise<Record<string, unknown> & { error?: string }>;
  telegramIdRef: React.RefObject<string>;
  screen: GameScreen;
  tab: GameTab;
  player: PlayerData | null;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  onMessage: (message: GameMessage) => void;
  onNavigateTab: (tab: GameTab) => void;
  refreshPlayer: () => Promise<void>;
}

/** Гильдия + три общегильдейские КООП/PvP-цели, живущие на вкладке "guild" (GuildTab.tsx) и
 * частично дублируемые read-only на "Сегодня" (OverviewTab.tsx) — lib/social/*.ts. Извлечено из
 * page.tsx per CLAUDE.md (аудит 1.4, A1): состояние читается/пишется только этим хуком, page.tsx
 * лишь прокидывает возвращённые данные в компоненты. */
export function useSocialFeatures({
  apiCall, telegramIdRef, screen, tab, player, loading, setLoading, onMessage, onNavigateTab, refreshPlayer,
}: UseSocialFeaturesArgs) {
  const [guild, setGuild] = useState<GuildData | null>(null);
  const [guildLoading, setGuildLoading] = useState(false);
  const [worldBoss, setWorldBoss] = useState<WorldBossStateView | null>(null);
  const [worldBossLoading, setWorldBossLoading] = useState(false);
  const [fortress, setFortress] = useState<FortressStateView | null>(null);
  const [fortressLoading, setFortressLoading] = useState(false);
  const [guildRaidBoss, setGuildRaidBoss] = useState<GuildRaidBossStateView | null>(null);
  const [guildRaidBossLoading, setGuildRaidBossLoading] = useState(false);

  // Гильдия — постоянная группа, не боевая сессия, поэтому без поллинга раз в 2 сек как у
  // Party — достаточно подгружать при открытии вкладки.
  useEffect(() => {
    if (tab !== 'guild' || !telegramIdRef.current) return;
    setGuildLoading(true);
    apiCall('/api/guild/state')
      .then(data => { if (data.guild !== undefined) setGuild(data.guild as GuildData | null); })
      .catch(() => onMessage({ text: 'Не удалось загрузить гильдию', type: 'error' }))
      .finally(() => setGuildLoading(false));
  }, [tab, apiCall, telegramIdRef, onMessage]);

  const refreshWorldBoss = useCallback(() => {
    setWorldBossLoading(true);
    apiCall('/api/worldboss/state')
      .then(data => { if (data.boss) setWorldBoss(data as unknown as WorldBossStateView); })
      .catch(() => onMessage({ text: 'Не удалось загрузить мирового босса', type: 'error' }))
      .finally(() => setWorldBossLoading(false));
  }, [apiCall, onMessage]);

  useEffect(() => {
    // Экран "Сегодня" на вкладке "Обзор" тоже показывает статус мирового босса — тот же
    // приём, что уже есть у premiumState/battlePassState: подгружаем не только на "своей"
    // вкладке, чтобы агрегатор не был пустым до первого визита в "Гильдию".
    if ((tab !== 'guild' && tab !== 'overview') || !telegramIdRef.current) return;
    refreshWorldBoss();
  }, [tab, refreshWorldBoss, telegramIdRef]);

  const handleAttackWorldBoss = useCallback(async (): Promise<WorldBossAttackResultView | null> => {
    if (!player) return null;
    setWorldBossLoading(true);
    try {
      const data = await apiCall('/api/worldboss/attack', 'POST', {});
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
        return null;
      }
      if (data.killed) onMessage({ text: 'Мировой босс повержен!', type: 'success' });
      await refreshPlayer();
      refreshWorldBoss();
      return data as unknown as WorldBossAttackResultView;
    } catch {
      onMessage({ text: 'Ошибка атаки мирового босса', type: 'error' });
      return null;
    } finally {
      setWorldBossLoading(false);
    }
  }, [player, apiCall, onMessage, refreshPlayer, refreshWorldBoss]);

  const refreshFortress = useCallback(() => {
    setFortressLoading(true);
    apiCall('/api/fortress/state')
      .then(data => { if (data.cycleId) setFortress(data as unknown as FortressStateView); })
      .catch(() => onMessage({ text: 'Не удалось загрузить состояние Крепости', type: 'error' }))
      .finally(() => setFortressLoading(false));
  }, [apiCall, onMessage]);

  useEffect(() => {
    if ((tab !== 'guild' && tab !== 'overview') || !telegramIdRef.current) return;
    refreshFortress();
  }, [tab, refreshFortress, telegramIdRef]);

  const handleAssaultFortress = useCallback(async (): Promise<FortressAssaultResultView | null> => {
    if (!player) return null;
    setFortressLoading(true);
    try {
      const data = await apiCall('/api/fortress/assault', 'POST', {});
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
        return null;
      }
      refreshFortress();
      return data as unknown as FortressAssaultResultView;
    } catch {
      onMessage({ text: 'Ошибка штурма Крепости', type: 'error' });
      return null;
    } finally {
      setFortressLoading(false);
    }
  }, [player, apiCall, onMessage, refreshFortress]);

  const refreshGuildRaidBoss = useCallback(() => {
    setGuildRaidBossLoading(true);
    apiCall('/api/guildraid/state')
      .then(data => { if (data.inGuild !== undefined) setGuildRaidBoss(data as unknown as GuildRaidBossStateView); })
      .catch(() => onMessage({ text: 'Не удалось загрузить гильд-рейд-босса', type: 'error' }))
      .finally(() => setGuildRaidBossLoading(false));
  }, [apiCall, onMessage]);

  useEffect(() => {
    if ((tab !== 'guild' && tab !== 'overview') || !telegramIdRef.current) return;
    refreshGuildRaidBoss();
  }, [tab, refreshGuildRaidBoss, telegramIdRef]);

  const handleAttackGuildRaidBoss = useCallback(async (): Promise<GuildRaidAttackResultView | null> => {
    if (!player) return null;
    setGuildRaidBossLoading(true);
    try {
      const data = await apiCall('/api/guildraid/attack', 'POST', {});
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
        return null;
      }
      if (data.killed) onMessage({ text: 'Гильд-рейд-босс повержен!', type: 'success' });
      await refreshPlayer();
      refreshGuildRaidBoss();
      return data as unknown as GuildRaidAttackResultView;
    } catch {
      onMessage({ text: 'Ошибка атаки гильд-рейд-босса', type: 'error' });
      return null;
    } finally {
      setGuildRaidBossLoading(false);
    }
  }, [player, apiCall, onMessage, refreshPlayer, refreshGuildRaidBoss]);

  // "?joinGuild=<id>" deep-link (см. webhook/route.ts) — тот же паттерн, что joinParty в page.tsx.
  const joinGuildChecked = useRef(false);
  useEffect(() => {
    if (screen !== 'game' || joinGuildChecked.current || !telegramIdRef.current) return;
    joinGuildChecked.current = true;
    const guildId = new URLSearchParams(window.location.search).get('joinGuild');
    if (!guildId) return;
    window.history.replaceState({}, '', window.location.pathname);
    apiCall('/api/guild/join', 'POST', { guildId }).then(data => {
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
      } else {
        setGuild(data.guild as GuildData);
        onNavigateTab('guild');
        onMessage({ text: 'Вы вступили в гильдию!', type: 'success' });
      }
    });
  }, [screen, apiCall, telegramIdRef, onMessage, onNavigateTab]);

  const handleCreateGuild = useCallback(async (name: string, tag: string) => {
    setLoading(true);
    try {
      const data = await apiCall('/api/guild/create', 'POST', { name, tag });
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
      } else {
        setGuild(data.guild as GuildData);
        onMessage({ text: 'Гильдия создана!', type: 'success' });
      }
    } catch {
      onMessage({ text: 'Не удалось создать гильдию', type: 'error' });
    }
    setLoading(false);
  }, [apiCall, onMessage, setLoading]);

  const handleLeaveGuild = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiCall('/api/guild/leave', 'POST');
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
      } else {
        setGuild(null);
      }
    } catch {
      onMessage({ text: 'Не удалось покинуть гильдию', type: 'error' });
    }
    setLoading(false);
  }, [apiCall, onMessage, setLoading]);

  return {
    guild, setGuild, guildLoading,
    worldBoss, worldBossLoading, handleAttackWorldBoss,
    fortress, fortressLoading, handleAssaultFortress,
    guildRaidBoss, guildRaidBossLoading, handleAttackGuildRaidBoss,
    handleCreateGuild, handleLeaveGuild,
  };
}
