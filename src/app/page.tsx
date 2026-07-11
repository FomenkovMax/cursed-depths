'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LOCATIONS, ENEMIES, CRAFTING_RECIPES } from '@/lib/game-data';
import { stageUnlockLevel } from '@/lib/combat-engine';
import { parseDeathWard } from '@/lib/conditional-ability-engine';
import { Tabs } from '@/components/ui/tabs';
import { NavBar } from '@/components/game/NavBar';
import {
  PlayerData,
  CombatLogEntry,
  GameScreen,
  GameTab,
  GameMessage,
  TelegramGlobal,
  PartyData,
  PartyCombatStateResponse,
  ExplorationEvent,
  AchievementEntry,
  CodexEntryView,
  MarketListingView,
  StashItemView,
  PvpOpponentView,
  PvpLeagueView,
  PvpFightResultView,
  WorldBossStateView,
  WorldBossAttackResultView,
  FortressStateView,
  FortressAssaultResultView,
  GuildData,
} from '@/lib/game-types';
import { LoadingScreen } from '@/components/game/LoadingScreen';
import { CharacterCreationScreen } from '@/components/game/CharacterCreationScreen';
import { GameHeader } from '@/components/game/GameHeader';
import { OverviewTab } from '@/components/game/OverviewTab';
import { ExplorationEventModal } from '@/components/game/ExplorationEventModal';
import { AchievementsTab } from '@/components/game/AchievementsTab';
import { CodexTab } from '@/components/game/CodexTab';
import { MarketTab } from '@/components/game/MarketTab';
import { PvpTab } from '@/components/game/PvpTab';
import { CombatTab } from '@/components/game/CombatTab';
import { MapTab } from '@/components/game/MapTab';
import { InventoryTab } from '@/components/game/InventoryTab';
import { QuestsTab } from '@/components/game/QuestsTab';
import { CraftTab } from '@/components/game/CraftTab';
import { LeaderboardTab, type LeaderboardEntry, type SeasonWinnerEntry } from '@/components/game/LeaderboardTab';
import { PartyTab } from '@/components/game/PartyTab';
import { GuildTab } from '@/components/game/GuildTab';

// ===== MAIN COMPONENT =====
export default function CursedDepths() {
  // Core state
  const [screen, setScreen] = useState<GameScreen>('loading');
  const [tab, setTab] = useState<GameTab>('overview');
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<GameMessage>(null);
  const [adventureLog, setAdventureLog] = useState<{ id: number; text: string; type: 'info' | 'success' | 'error' }[]>([]);
  const adventureLogIdRef = useRef(0);
  const [combatLog, setCombatLog] = useState<CombatLogEntry[]>([]);
  const [shaking, setShaking] = useState(false);
  const [levelUpAnimation, setLevelUpAnimation] = useState(false);
  const [floatingDamage, setFloatingDamage] = useState<{ id: number; text: string; color: string }[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [currentSeason, setCurrentSeason] = useState<string | null>(null);
  const [previousSeason, setPreviousSeason] = useState<string | null>(null);
  const [previousSeasonWinners, setPreviousSeasonWinners] = useState<SeasonWinnerEntry[]>([]);
  const [achievements, setAchievements] = useState<AchievementEntry[]>([]);
  const [achievementsLoading, setAchievementsLoading] = useState(false);
  const [codexEntries, setCodexEntries] = useState<CodexEntryView[]>([]);
  const [codexLoading, setCodexLoading] = useState(false);
  const [marketListings, setMarketListings] = useState<MarketListingView[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [pvpOpponents, setPvpOpponents] = useState<PvpOpponentView[]>([]);
  const [pvpMyRating, setPvpMyRating] = useState(1000);
  const [pvpMyLeague, setPvpMyLeague] = useState<PvpLeagueView | null>(null);
  const [pvpMyWins, setPvpMyWins] = useState(0);
  const [pvpMyLosses, setPvpMyLosses] = useState(0);
  const [pvpLoading, setPvpLoading] = useState(false);
  const [worldBoss, setWorldBoss] = useState<WorldBossStateView | null>(null);
  const [worldBossLoading, setWorldBossLoading] = useState(false);
  const [fortress, setFortress] = useState<FortressStateView | null>(null);
  const [fortressLoading, setFortressLoading] = useState(false);
  const [stashItems, setStashItems] = useState<StashItemView[]>([]);
  const [stashCapacity, setStashCapacity] = useState(60);
  const [stashLoading, setStashLoading] = useState(false);
  const [party, setParty] = useState<PartyData | null>(null);
  const [guild, setGuild] = useState<GuildData | null>(null);
  const [guildLoading, setGuildLoading] = useState(false);
  const [partyCombatState, setPartyCombatState] = useState<PartyCombatStateResponse | null>(null);
  const [explorationEvent, setExplorationEvent] = useState<ExplorationEvent | null>(null);
  // Изученные рецепты тира 3 (game-data.ts CRAFTING_RECIPES) — отдельный стейт, а не поле
  // player: только GET /api/player включает player.recipes в ответ, остальные роуты
  // (explore/combat/travel) — нет, и setPlayer(data.player) после них затёр бы это поле,
  // если бы оно жило внутри PlayerData.
  const [learnedRecipeIds, setLearnedRecipeIds] = useState<Set<string>>(new Set());

  // Character creation state
  const [creationStep, setCreationStep] = useState(0);
  const [charName, setCharName] = useState('');
  const [charRace, setCharRace] = useState('');
  const [charClass, setCharClass] = useState('');

  // Telegram ID & initData (refs to avoid setState-in-effect lint issues)
  const telegramIdRef = useRef('');
  const initDataRef = useRef('');
  const floatIdRef = useRef(0);
  const initDone = useRef(false);

  // Журнал похождений на вкладке "Обзор" — та же нарративная обратная связь, что и toast в
  // `message`, но не исчезает через пару секунд, а копится в свиток (как история чата в
  // референсном боте). Подписываемся на `message`, а не переписываем все ~125 мест setMessage().
  useEffect(() => {
    if (!message) return;
    adventureLogIdRef.current += 1;
    setAdventureLog(prev => [{ id: adventureLogIdRef.current, text: message.text, type: message.type }, ...prev].slice(0, 20));
  }, [message]);

  // ===== LOAD PLAYER =====
  const loadPlayer = useCallback(async (tgId: string) => {
    try {
      const headers: Record<string, string> = { 'x-telegram-id': tgId };
      if (initDataRef.current) {
        headers['X-Telegram-Init-Data'] = initDataRef.current;
      }
      const res = await fetch('/api/player', { headers });
      const data = await res.json();

      // If auth failed (401), show error instead of silently going to creation
      if (res.status === 401) {
        console.error('[LoadPlayer] Auth failed:', data.error);
        setMessage({ text: 'Ошибка авторизации. Откройте приложение из Telegram.', type: 'error' });
        setScreen('creation');
        return;
      }

      // If server error, show error message
      if (!res.ok) {
        console.error('[LoadPlayer] Server error:', res.status, data.error);
        setMessage({ text: data.error || 'Ошибка загрузки данных', type: 'error' });
        setScreen('creation');
        return;
      }

      if (data.exists && data.player) {
        setPlayer(data.player);
        if (data.player.recipes) {
          setLearnedRecipeIds(new Set(data.player.recipes.map((r: { recipeId: string }) => r.recipeId)));
        }
        if (data.player.inCombat) {
          try {
            const logs = data.player.combatLog ? JSON.parse(data.player.combatLog) : [];
            setCombatLog(logs);
          } catch { setCombatLog([]); }
          setTab('combat');
        }
        setScreen('game');
      } else {
        setScreen('creation');
      }
    } catch (err) {
      console.error('[LoadPlayer] Network error:', err);
      setMessage({ text: 'Ошибка загрузки данных. Проверьте интернет-соединение.', type: 'error' });
      setScreen('creation');
    }
  }, []);

  // ===== TELEGRAM WEBAPP INIT =====
  const initTelegram = useCallback(() => {
    if (initDone.current) return;
    initDone.current = true;

    let resolvedId = '';
    const win = typeof window !== 'undefined' ? (window as unknown as TelegramGlobal) : null;

    if (win?.Telegram?.WebApp) {
      const tg = win.Telegram.WebApp;
      tg.ready();
      tg.expand();

      // Store the raw initData for HMAC validation on the backend
      if (tg.initData) {
        initDataRef.current = tg.initData;

        // Parse user ID directly from initData (most reliable method)
        try {
          const params = new URLSearchParams(tg.initData);
          const userStr = params.get('user');
          if (userStr) {
            const userObj = JSON.parse(userStr);
            if (userObj.id) {
              resolvedId = String(userObj.id);
              console.log('[Init] Parsed user ID from initData:', resolvedId);
            }
          }
        } catch (e) {
          console.warn('[Init] Failed to parse user from initData:', e);
        }
      }

      // Fallback: try initDataUnsafe if direct parsing failed
      if (!resolvedId && tg.initDataUnsafe?.user) {
        resolvedId = String(tg.initDataUnsafe.user.id);
        console.log('[Init] Got user ID from initDataUnsafe:', resolvedId);
      }
    } else {
      console.warn('[Init] window.Telegram.WebApp not available yet');
    }

    // In development mode, allow a test fallback
    if (!resolvedId && process.env.NODE_ENV === 'development') {
      resolvedId = 'test_dev_123';
      console.log('[Init] Dev mode: using test_dev_123');
    }

    console.log('[Init] Final resolved telegram ID:', resolvedId || '(empty - not in Telegram)');
    telegramIdRef.current = resolvedId;

    // If no Telegram ID resolved, show error instead of loading
    if (!resolvedId) {
      setScreen('creation');
      setMessage({ text: 'Приложение должно быть открыто из Telegram. Закройте и откройте через бота.', type: 'error' });
      return;
    }

    // Defer player loading to avoid synchronous setState in effect
    const timer = setTimeout(() => {
      loadPlayer(resolvedId);
    }, 0);

    return timer;
  }, [loadPlayer]);

  useEffect(() => {
    // Try immediately — if SDK script loaded before our code
    const result = initTelegram();
    if (initDone.current) {
      // SDK was available, we're done
      return () => { if (result) clearTimeout(result); };
    }

    // SDK not loaded yet — wait for it with a polling approach
    console.log('[Init] Waiting for Telegram WebApp SDK to load...');
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max (50 * 100ms)
    const pollInterval = setInterval(() => {
      attempts++;
      const win = typeof window !== 'undefined' ? (window as unknown as { Telegram?: { WebApp?: unknown } }) : null;
      if (win?.Telegram?.WebApp) {
        clearInterval(pollInterval);
        initTelegram();
      } else if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
        console.error('[Init] Telegram WebApp SDK not found after 5 seconds');
        // Show creation screen with error
        initDone.current = true;
        setScreen('creation');
        setMessage({ text: 'Не удалось загрузить Telegram SDK. Перезагрузите приложение через бота.', type: 'error' });
      }
    }, 100);

    return () => clearInterval(pollInterval);
  }, [initTelegram]);

  // ===== API HELPER =====
  const apiCall = useCallback(async (url: string, method = 'GET', body?: unknown) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-telegram-id': telegramIdRef.current,
    };
    // Send validated initData for proper server-side authentication
    if (initDataRef.current) {
      headers['X-Telegram-Init-Data'] = initDataRef.current;
    }
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    // If response is not OK, add status info to the error
    if (!res.ok && !data.error) {
      data.error = `Ошибка сервера (${res.status})`;
    }
    return data;
  }, []);

  // ===== LEADERBOARD =====
  useEffect(() => {
    if (tab !== 'leaderboard') return;
    setLeaderboardLoading(true);
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => {
        setLeaderboard(data.leaderboard || []);
        setCurrentSeason(data.currentSeason ?? null);
        setPreviousSeason(data.previousSeason ?? null);
        setPreviousSeasonWinners(data.previousSeasonWinners || []);
      })
      .catch(() => setMessage({ text: 'Не удалось загрузить таблицу лидеров', type: 'error' }))
      .finally(() => setLeaderboardLoading(false));
  }, [tab]);

  // ===== ACHIEVEMENTS =====
  useEffect(() => {
    if (tab !== 'achievements' || !telegramIdRef.current) return;
    setAchievementsLoading(true);
    apiCall('/api/achievements')
      .then(data => {
        if (data.achievements) setAchievements(data.achievements);
        if (data.newlyUnlocked?.length > 0) {
          const names = data.newlyUnlocked.map((a: { icon: string; nameRu: string }) => `${a.icon} ${a.nameRu}`).join(', ');
          setMessage({ text: `Новое достижение: ${names}!`, type: 'success' });
        }
      })
      .catch(() => setMessage({ text: 'Не удалось загрузить достижения', type: 'error' }))
      .finally(() => setAchievementsLoading(false));
  }, [tab, apiCall]);

  // ===== CODEX (лор-кодекс, см. lib/codex.ts) =====
  useEffect(() => {
    if (tab !== 'codex' || !telegramIdRef.current) return;
    setCodexLoading(true);
    apiCall('/api/codex')
      .then(data => {
        if (data.entries) setCodexEntries(data.entries);
        if (data.newlyUnlocked?.length > 0) {
          const names = data.newlyUnlocked.map((e: { icon: string; titleRu: string }) => `${e.icon} ${e.titleRu}`).join(', ');
          setMessage({ text: `Новая запись в кодексе: ${names}!`, type: 'success' });
        }
      })
      .catch(() => setMessage({ text: 'Не удалось загрузить кодекс', type: 'error' }))
      .finally(() => setCodexLoading(false));
  }, [tab, apiCall]);

  // ===== MARKET (аукцион игрок-игроку, lib/inventory-utils.ts MarketListing) =====
  const refreshMarket = useCallback(() => {
    setMarketLoading(true);
    apiCall('/api/market/listings')
      .then(data => { if (data.listings) setMarketListings(data.listings); })
      .catch(() => setMessage({ text: 'Не удалось загрузить аукцион', type: 'error' }))
      .finally(() => setMarketLoading(false));
  }, [apiCall]);

  useEffect(() => {
    if (tab !== 'market' || !telegramIdRef.current) return;
    refreshMarket();
  }, [tab, refreshMarket]);

  // ===== PVP ARENA (lib/pvp.ts) =====
  const refreshPvpOpponents = useCallback(() => {
    setPvpLoading(true);
    apiCall('/api/pvp/opponents')
      .then(data => {
        if (data.opponents) setPvpOpponents(data.opponents);
        if (typeof data.myRating === 'number') setPvpMyRating(data.myRating);
        if (data.myLeague) setPvpMyLeague(data.myLeague);
        if (typeof data.myWins === 'number') setPvpMyWins(data.myWins);
        if (typeof data.myLosses === 'number') setPvpMyLosses(data.myLosses);
      })
      .catch(() => setMessage({ text: 'Не удалось загрузить арену', type: 'error' }))
      .finally(() => setPvpLoading(false));
  }, [apiCall]);

  useEffect(() => {
    if (tab !== 'pvp' || !telegramIdRef.current) return;
    refreshPvpOpponents();
  }, [tab, refreshPvpOpponents]);

  const handlePvpChallenge = async (opponentId: string): Promise<PvpFightResultView | null> => {
    if (!player) return null;
    setPvpLoading(true);
    try {
      const data = await apiCall('/api/pvp/challenge', 'POST', { opponentId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
        return null;
      }
      setMessage({ text: data.won ? 'Победа на арене!' : 'Поражение на арене...', type: data.won ? 'success' : 'info' });
      await refreshPlayer();
      refreshPvpOpponents();
      return data as PvpFightResultView;
    } catch {
      setMessage({ text: 'Ошибка боя на арене', type: 'error' });
      return null;
    } finally {
      setPvpLoading(false);
    }
  };

  // ===== STASH fetch (панель "Хранилище" живёт внутри вкладки inventory, InventoryTab.tsx) =====
  const refreshStash = useCallback(() => {
    setStashLoading(true);
    apiCall('/api/stash')
      .then(data => {
        if (data.items) setStashItems(data.items);
        if (typeof data.capacity === 'number') setStashCapacity(data.capacity);
      })
      .catch(() => setMessage({ text: 'Не удалось загрузить хранилище', type: 'error' }))
      .finally(() => setStashLoading(false));
  }, [apiCall]);

  useEffect(() => {
    if (tab !== 'inventory' || !telegramIdRef.current) return;
    refreshStash();
  }, [tab, refreshStash]);

  // ===== GUILD ===== гильдия — постоянная группа, не боевая сессия, поэтому без поллинга
  // раз в 2 сек как у Party — достаточно подгружать при открытии вкладки.
  useEffect(() => {
    if (tab !== 'guild' || !telegramIdRef.current) return;
    setGuildLoading(true);
    apiCall('/api/guild/state')
      .then(data => { if (data.guild !== undefined) setGuild(data.guild); })
      .catch(() => setMessage({ text: 'Не удалось загрузить гильдию', type: 'error' }))
      .finally(() => setGuildLoading(false));
  }, [tab, apiCall]);

  // ===== WORLD BOSS (lib/world-boss.ts) — живёт на вкладке "guild", см. GuildTab.tsx =====
  const refreshWorldBoss = useCallback(() => {
    setWorldBossLoading(true);
    apiCall('/api/worldboss/state')
      .then(data => { if (data.boss) setWorldBoss(data); })
      .catch(() => setMessage({ text: 'Не удалось загрузить мирового босса', type: 'error' }))
      .finally(() => setWorldBossLoading(false));
  }, [apiCall]);

  useEffect(() => {
    if (tab !== 'guild' || !telegramIdRef.current) return;
    refreshWorldBoss();
  }, [tab, refreshWorldBoss]);

  const handleAttackWorldBoss = async (): Promise<WorldBossAttackResultView | null> => {
    if (!player) return null;
    setWorldBossLoading(true);
    try {
      const data = await apiCall('/api/worldboss/attack', 'POST', {});
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
        return null;
      }
      if (data.killed) setMessage({ text: 'Мировой босс повержен!', type: 'success' });
      await refreshPlayer();
      refreshWorldBoss();
      return data as WorldBossAttackResultView;
    } catch {
      setMessage({ text: 'Ошибка атаки мирового босса', type: 'error' });
      return null;
    } finally {
      setWorldBossLoading(false);
    }
  };

  // ===== FORTRESS (гильд-война за территорию — lib/fortress.ts) =====
  const refreshFortress = useCallback(() => {
    setFortressLoading(true);
    apiCall('/api/fortress/state')
      .then(data => { if (data.cycleId) setFortress(data); })
      .catch(() => setMessage({ text: 'Не удалось загрузить состояние Крепости', type: 'error' }))
      .finally(() => setFortressLoading(false));
  }, [apiCall]);

  useEffect(() => {
    if (tab !== 'guild' || !telegramIdRef.current) return;
    refreshFortress();
  }, [tab, refreshFortress]);

  const handleAssaultFortress = async (): Promise<FortressAssaultResultView | null> => {
    if (!player) return null;
    setFortressLoading(true);
    try {
      const data = await apiCall('/api/fortress/assault', 'POST', {});
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
        return null;
      }
      refreshFortress();
      return data as FortressAssaultResultView;
    } catch {
      setMessage({ text: 'Ошибка штурма Крепости', type: 'error' });
      return null;
    } finally {
      setFortressLoading(false);
    }
  };

  // Приглашение по Telegram deep-link: бот присылает кнопку web_app с URL вида
  // "?joinParty=<id>" (см. src/app/api/telegram/webhook/route.ts) — при первом входе в игру
  // с таким параметром автоматически вступаем в пати (сам переход по ссылке уже
  // подразумевает согласие) и открываем вкладку "Пати".
  const joinPartyChecked = useRef(false);
  useEffect(() => {
    if (screen !== 'game' || joinPartyChecked.current || !telegramIdRef.current) return;
    joinPartyChecked.current = true;
    const partyId = new URLSearchParams(window.location.search).get('joinParty');
    if (!partyId) return;
    window.history.replaceState({}, '', window.location.pathname);
    apiCall('/api/party/join', 'POST', { partyId }).then(data => {
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setParty(data.party);
        setTab('party');
        setMessage({ text: 'Вы вступили в пати!', type: 'success' });
      }
    });
  }, [screen, apiCall]);

  // То же самое для гильдии — "?joinGuild=<id>" (см. webhook/route.ts).
  const joinGuildChecked = useRef(false);
  useEffect(() => {
    if (screen !== 'game' || joinGuildChecked.current || !telegramIdRef.current) return;
    joinGuildChecked.current = true;
    const guildId = new URLSearchParams(window.location.search).get('joinGuild');
    if (!guildId) return;
    window.history.replaceState({}, '', window.location.pathname);
    apiCall('/api/guild/join', 'POST', { guildId }).then(data => {
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setGuild(data.guild);
        setTab('guild');
        setMessage({ text: 'Вы вступили в гильдию!', type: 'success' });
      }
    });
  }, [screen, apiCall]);

  // ===== FLOATING DAMAGE HELPER =====
  const addFloatingDamage = useCallback((text: string, color: string) => {
    const id = ++floatIdRef.current;
    setFloatingDamage(prev => [...prev, { id, text, color }]);
    setTimeout(() => {
      setFloatingDamage(prev => prev.filter(f => f.id !== id));
    }, 1000);
  }, []);

  // ===== REFRESH PLAYER =====
  const refreshPlayer = useCallback(async () => {
    if (!telegramIdRef.current) return;
    try {
      const headers: Record<string, string> = { 'x-telegram-id': telegramIdRef.current };
      if (initDataRef.current) {
        headers['X-Telegram-Init-Data'] = initDataRef.current;
      }
      const data = await fetch('/api/player', { headers }).then(r => r.json());
      if (data.player) {
        setPlayer(data.player);
        if (data.player.recipes) {
          setLearnedRecipeIds(new Set(data.player.recipes.map((r: { recipeId: string }) => r.recipeId)));
        }
      }
    } catch {
      // silent
    }
  }, []);

  // ===== PARTY (короткий поллинг вместо realtime-инфраструктуры — нет ни WebSocket, ни
  // Vercel-совместимого push-сервиса, поэтому "реальное время" реализовано как fetch раз в
  // ~2 секунды, пока открыта вкладка "Пати") =====
  const refreshParty = useCallback(async () => {
    const data = await apiCall('/api/party/state');
    if (data.party !== undefined) setParty(data.party);
  }, [apiCall]);

  const refreshPartyCombat = useCallback(async () => {
    const data: PartyCombatStateResponse = await apiCall('/api/party/combat/state');
    if (data.combat !== undefined) setPartyCombatState(data);
    // Каждый ход в пати-бою реально меняет HP/MP кого-то из живых участников (см.
    // party-combat-resolver.ts) — без этого шапка (GameHeader) у ЛЮБОГО зрителя (не только у
    // ходившего) оставалась замороженной на значении до начала боя, пока поллинг ждал
    // окончания всего боя, чтобы обновить player.
    await refreshPlayer();
  }, [apiCall, refreshPlayer]);

  useEffect(() => {
    if (!telegramIdRef.current || screen !== 'game') return;
    refreshParty();
    if (tab !== 'party') return;
    const interval = setInterval(refreshParty, 2000);
    return () => clearInterval(interval);
  }, [tab, screen, refreshParty]);

  useEffect(() => {
    if (!telegramIdRef.current || screen !== 'game' || tab !== 'party' || party?.status !== 'in_combat') {
      setPartyCombatState(null);
      return;
    }
    refreshPartyCombat();
    const interval = setInterval(refreshPartyCombat, 2000);
    return () => clearInterval(interval);
  }, [tab, screen, party?.status, refreshPartyCombat]);

  // ===== CREATE CHARACTER =====
  const createPlayer = async () => {
    if (!charName.trim() || !charRace || !charClass) {
      setMessage({ text: 'Заполните все поля!', type: 'error' });
      return;
    }
    if (!telegramIdRef.current) {
      setMessage({ text: 'Ошибка: не удалось определить ваш Telegram ID. Откройте приложение из Telegram.', type: 'error' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      console.log('[CreatePlayer] Creating character:', { name: charName.trim(), race: charRace, class: charClass, telegramId: telegramIdRef.current });
      const data = await apiCall('/api/player/create', 'POST', {
        // telegramId is NOT sent in body — backend gets it from auth headers
        name: charName.trim(),
        race: charRace,
        className: charClass,
      });
      console.log('[CreatePlayer] Response:', data);
      if (data.success && data.player) {
        setPlayer(data.player);
        setScreen('game');
        setMessage({ text: 'Персонаж создан! Добро пожаловать в Проклятые Глубины!', type: 'success' });
      } else {
        const errorMsg = data.error || 'Ошибка создания персонажа';
        console.error('[CreatePlayer] Error:', errorMsg);
        setMessage({ text: errorMsg, type: 'error' });
      }
    } catch (err) {
      console.error('[CreatePlayer] Exception:', err);
      setMessage({ text: 'Ошибка сервера. Проверьте интернет-соединение.', type: 'error' });
    }
    setLoading(false);
  };

  // ===== EXPLORE =====
  const handleExplore = async () => {
    if (!player || player.inCombat) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/explore', 'POST');
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else if (data.type === 'combat') {
        setPlayer(data.player);
        setCombatLog([{ text: data.message, turn: 0 }]);
        setTab('combat');
        setMessage({ text: data.message, type: 'info' });
      } else if (data.type === 'safe') {
        setPlayer(data.player);
        addFloatingDamage(`+${data.goldFound} 💰`, '#fbbf24');
        setMessage({ text: data.message, type: 'success' });
      } else if (data.type === 'explore') {
        setPlayer(data.player);
        addFloatingDamage(`+${data.goldFound} 💰`, '#fbbf24');
        setMessage({ text: data.message, type: 'success' });
      } else if (data.type === 'event') {
        setPlayer(data.player);
        setExplorationEvent(data.event);
      }
    } catch {
      setMessage({ text: 'Ошибка исследования', type: 'error' });
    }
    setLoading(false);
  };

  const handleEventChoice = async (choiceId: string) => {
    if (!explorationEvent) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/explore/event', 'POST', { eventId: explorationEvent.id, choiceId });
      setExplorationEvent(null);
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else if (data.type === 'combat') {
        setPlayer(data.player);
        setCombatLog([{ text: data.message, turn: 0 }]);
        setTab('combat');
        setMessage({ text: data.message, type: 'info' });
      } else {
        setPlayer(data.player);
        if (data.goldDelta > 0) addFloatingDamage(`+${data.goldDelta} 💰`, '#fbbf24');
        else if (data.goldDelta < 0) addFloatingDamage(`${data.goldDelta} 💰`, '#ef4444');
        setMessage({ text: data.message, type: data.negative ? 'error' : 'success' });
        if (data.leveledUp) {
          setLevelUpAnimation(true);
          setTimeout(() => setLevelUpAnimation(false), 1500);
        }
      }
    } catch {
      setExplorationEvent(null);
      setMessage({ text: 'Ошибка события', type: 'error' });
    }
    setLoading(false);
  };

  // ===== DUNGEON =====
  const handleStartDungeon = async (dungeonId: string) => {
    if (!player || player.inCombat) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/dungeon/start', 'POST', { dungeonId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setPlayer(data.player);
        setCombatLog([{ text: data.message, turn: 0 }]);
        setTab('combat');
        setMessage({ text: data.message, type: 'info' });
      }
    } catch {
      setMessage({ text: 'Ошибка входа в данж', type: 'error' });
    }
    setLoading(false);
  };

  const handleStartAbyss = async () => {
    if (!player || player.inCombat) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/abyss/start', 'POST', {});
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setPlayer(data.player);
        setCombatLog([{ text: data.message, turn: 0 }]);
        setTab('combat');
        setMessage({ text: data.message, type: 'info' });
      }
    } catch {
      setMessage({ text: 'Ошибка спуска в Разлом', type: 'error' });
    }
    setLoading(false);
  };

  // ===== COMBAT ACTION =====
  const handleCombatAction = async (action: string, itemId?: string, abilityId?: string) => {
    if (!player || !player.inCombat) return;
    setLoading(true);
    setShaking(true);
    setTimeout(() => setShaking(false), 300);
    try {
      const body: Record<string, string> = { action };
      if (itemId) body.itemId = itemId;
      if (abilityId) body.abilityId = abilityId;
      const data = await apiCall('/api/combat/action', 'POST', body);

      if (data.combatLog) {
        setCombatLog(prev => [...prev, ...data.combatLog]);
      }

      if (data.player) {
        setPlayer(data.player);
      }

      if (data.playerWon) {
        addFloatingDamage(`+${data.xpGained} XP`, '#60a5fa');
        addFloatingDamage(`+${data.goldGained} 💰`, '#fbbf24');
        if (data.dungeonCompleted) {
          setMessage({ text: `🏆 Данж пройден! +${data.xpGained} XP, +${data.goldGained} золота`, type: 'success' });
        } else if (data.dungeonRoomCleared) {
          setMessage({ text: `Комната пройдена! Следующий враг уже здесь...`, type: 'success' });
        } else {
          setMessage({ text: `Победа! +${data.xpGained} XP, +${data.goldGained} золота`, type: 'success' });
        }
      } else if (data.playerFled) {
        setMessage({ text: 'Вы сбежали из боя!', type: 'info' });
        setTab('overview');
      }

      if (data.combatOver && !data.playerWon && !data.playerFled) {
        setMessage({ text: 'Вы погибли... Вернитесь в таверну.', type: 'error' });
        setTab('overview');
      }

      if (data.leveledUp) {
        setLevelUpAnimation(true);
        setTimeout(() => setLevelUpAnimation(false), 1500);
        setMessage({ text: `УРОВЕНЬ ПОВЫШЕН! Теперь уровень ${data.player.level}!`, type: 'success' });
      }
    } catch {
      setMessage({ text: 'Ошибка боя', type: 'error' });
    }
    setLoading(false);
  };

  // ===== TRAVEL =====
  const handleTravel = async (locationId: string) => {
    if (!player || player.inCombat) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/travel', 'POST', { locationId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setPlayer(data.player);
        setMessage({ text: data.message, type: 'success' });
      }
    } catch {
      setMessage({ text: 'Ошибка путешествия', type: 'error' });
    }
    setLoading(false);
  };

  // ===== REST =====
  const handleRest = async () => {
    if (!player) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/player/rest', 'POST');
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setPlayer(data.player);
        setMessage({ text: data.message, type: 'success' });
      }
    } catch {
      setMessage({ text: 'Ошибка отдыха', type: 'error' });
    }
    setLoading(false);
  };

  // ===== DAILY REWARD =====
  const handleDaily = async () => {
    if (!player) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/daily', 'POST');
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setPlayer(data.player);
        setMessage({ text: data.message, type: 'success' });
        if (data.leveledUp) {
          setLevelUpAnimation(true);
          setTimeout(() => setLevelUpAnimation(false), 1500);
        }
      }
    } catch {
      setMessage({ text: 'Ошибка получения награды', type: 'error' });
    }
    setLoading(false);
  };

  // ===== EQUIP ITEM =====
  const handleEquip = async (inventoryId: string) => {
    if (!player) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/inventory/equip', 'POST', { inventoryId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setMessage({ text: data.message, type: 'success' });
        await refreshPlayer();
      }
    } catch {
      setMessage({ text: 'Ошибка экипировки', type: 'error' });
    }
    setLoading(false);
  };

  // ===== USE ITEM =====
  const handleUseItem = async (inventoryId: string) => {
    if (!player) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/inventory/use', 'POST', { inventoryId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setMessage({ text: data.message, type: 'success' });
        await refreshPlayer();
      }
    } catch {
      setMessage({ text: 'Ошибка использования предмета', type: 'error' });
    }
    setLoading(false);
  };

  // ===== SHOP (Торговый двор) =====
  const handleBuyItem = async (itemId: string) => {
    if (!player) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/shop/buy', 'POST', { itemId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setPlayer(data.player);
        setMessage({ text: data.message, type: 'success' });
      }
    } catch {
      setMessage({ text: 'Ошибка покупки', type: 'error' });
    }
    setLoading(false);
  };

  const handleSellItem = async (inventoryId: string) => {
    if (!player) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/shop/sell', 'POST', { inventoryId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setPlayer(data.player);
        setMessage({ text: data.message, type: 'success' });
      }
    } catch {
      setMessage({ text: 'Ошибка продажи', type: 'error' });
    }
    setLoading(false);
  };

  // ===== CRAFT =====
  const handleCraft = async (recipeId: string) => {
    if (!player) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/craft', 'POST', { recipeId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setMessage({ text: data.message, type: 'success' });
        await refreshPlayer();
      }
    } catch {
      setMessage({ text: 'Ошибка крафта', type: 'error' });
    }
    setLoading(false);
  };

  // ===== LEARN BLUEPRINT (тир 3 крафта — см. lib CRAFTING_RECIPES.requiresBlueprintId) =====
  const handleLearnBlueprint = async (inventoryId: string) => {
    if (!player) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/craft/learn', 'POST', { inventoryId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setMessage({ text: data.message, type: 'success' });
        if (data.player) setPlayer(data.player);
        if (data.recipeId) setLearnedRecipeIds(prev => new Set(prev).add(data.recipeId));
      }
    } catch {
      setMessage({ text: 'Ошибка изучения чертежа', type: 'error' });
    }
    setLoading(false);
  };

  // ===== STASH (сундук, отдельный от боевого инвентаря — lib/stash.ts) =====
  const handleStoreItem = async (inventoryId: string) => {
    if (!player) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/stash/store', 'POST', { inventoryId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setMessage({ text: data.message, type: 'success' });
        await refreshPlayer();
        refreshStash();
      }
    } catch {
      setMessage({ text: 'Ошибка перемещения в хранилище', type: 'error' });
    }
    setLoading(false);
  };

  const handleRetrieveItem = async (stashItemId: string) => {
    if (!player) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/stash/retrieve', 'POST', { stashItemId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setMessage({ text: data.message, type: 'success' });
        await refreshPlayer();
        refreshStash();
      }
    } catch {
      setMessage({ text: 'Ошибка извлечения из хранилища', type: 'error' });
    }
    setLoading(false);
  };

  // ===== APPLY CRAFT CURRENCY (Мастерская зачарования — lib/item-affixes.ts) =====
  const handleApplyCurrency = async (inventoryId: string, currencyItemId: string) => {
    if (!player) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/craft/currency', 'POST', { inventoryId, currencyItemId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setMessage({ text: data.message, type: 'success' });
        await refreshPlayer();
      }
    } catch {
      setMessage({ text: 'Ошибка применения крафт-валюты', type: 'error' });
    }
    setLoading(false);
  };

  // ===== TEMPER (заточка — lib/item-enhancement.ts) =====
  const handleTemper = async (inventoryId: string) => {
    if (!player) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/craft/temper', 'POST', { inventoryId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setMessage({ text: data.message, type: data.success ? 'success' : 'info' });
        await refreshPlayer();
      }
    } catch {
      setMessage({ text: 'Ошибка заточки', type: 'error' });
    }
    setLoading(false);
  };

  // ===== MARKET ACTIONS =====
  const handleMarketListItem = async (inventoryId: string, price: number) => {
    if (!player) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/market/list', 'POST', { inventoryId, price });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setMessage({ text: data.message, type: 'success' });
        await refreshPlayer();
        refreshMarket();
      }
    } catch {
      setMessage({ text: 'Ошибка выставления на аукцион', type: 'error' });
    }
    setLoading(false);
  };

  const handleMarketBuyItem = async (listingId: string) => {
    if (!player) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/market/buy', 'POST', { listingId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setMessage({ text: data.message, type: 'success' });
        await refreshPlayer();
        refreshMarket();
      }
    } catch {
      setMessage({ text: 'Ошибка покупки', type: 'error' });
    }
    setLoading(false);
  };

  const handleMarketCancelListing = async (listingId: string) => {
    if (!player) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/market/cancel', 'POST', { listingId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setMessage({ text: data.message, type: 'success' });
        await refreshPlayer();
        refreshMarket();
      }
    } catch {
      setMessage({ text: 'Ошибка снятия лота', type: 'error' });
    }
    setLoading(false);
  };

  // ===== CLAIM QUEST =====
  const handleClaimQuest = async (questId: string) => {
    if (!player) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/quests/claim', 'POST', { questId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setMessage({ text: data.message, type: 'success' });
        await refreshPlayer();
        // Клейм квеста считает level-up по тем же формулам, что combat/action и daily (см.
        // quests/claim/route.ts), но раньше UI никак это не показывал — тот же самый переход
        // уровня из боя или дейлика давал анимацию, а из квеста нет.
        if (data.leveledUp) {
          setLevelUpAnimation(true);
          setTimeout(() => setLevelUpAnimation(false), 1500);
        }
      }
    } catch {
      setMessage({ text: 'Ошибка получения награды', type: 'error' });
    }
    setLoading(false);
  };

  // ===== PARTY: CREATE / LEAVE =====
  const handleCreateParty = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/api/party/create', 'POST');
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setParty(data.party);
      }
    } catch {
      setMessage({ text: 'Не удалось создать пати', type: 'error' });
    }
    setLoading(false);
  };

  const handleLeaveParty = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/api/party/leave', 'POST');
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setParty(null);
      }
    } catch {
      setMessage({ text: 'Не удалось покинуть пати', type: 'error' });
    }
    setLoading(false);
  };

  // ===== GUILD: CREATE / LEAVE =====
  const handleCreateGuild = async (name: string, tag: string) => {
    setLoading(true);
    try {
      const data = await apiCall('/api/guild/create', 'POST', { name, tag });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setGuild(data.guild);
        setMessage({ text: 'Гильдия создана!', type: 'success' });
      }
    } catch {
      setMessage({ text: 'Не удалось создать гильдию', type: 'error' });
    }
    setLoading(false);
  };

  const handleLeaveGuild = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/api/guild/leave', 'POST');
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setGuild(null);
      }
    } catch {
      setMessage({ text: 'Не удалось покинуть гильдию', type: 'error' });
    }
    setLoading(false);
  };

  const handleStartPartyCombat = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/api/party/combat/start', 'POST');
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        await refreshParty();
        await refreshPartyCombat();
      }
    } catch {
      setMessage({ text: 'Не удалось начать бой', type: 'error' });
    }
    setLoading(false);
  };

  const handlePartyCombatAction = async (action: string, abilityId?: string) => {
    setLoading(true);
    try {
      const data = await apiCall('/api/party/combat/action', 'POST', { action, abilityId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        // Каждое действие в пати-бою реально меняет HP/MP звонившего (см.
        // party-combat-resolver.ts) — без этого шапка (GameHeader) и проверка "хватает ли
        // маны" на кнопках способностей в PartyTab читали устаревший player, замороженный на
        // значении до начала боя, пока бой не заканчивался.
        await Promise.all([refreshPartyCombat(), refreshPlayer()]);
        if (data.combatOver) {
          setMessage({ text: data.partyWon ? 'Победа! Награда получена всей пати.' : 'Пати повержена или разбежалась...', type: data.partyWon ? 'success' : 'error' });
          await refreshParty();
        }
      }
    } catch {
      setMessage({ text: 'Ошибка боевого действия', type: 'error' });
    }
    setLoading(false);
  };

  // ===== ALLOCATE STAT POINT =====
  const handleAllocateStat = async (stat: string) => {
    if (!player) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/player/allocate-stat', 'POST', { stat });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setPlayer(data.player);
      }
    } catch {
      setMessage({ text: 'Ошибка распределения очков', type: 'error' });
    }
    setLoading(false);
  };

  // ===== HELPER: Get available (active, unlocked) abilities for player =====
  const getAvailableAbilities = () => {
    if (!player) return [];
    return (player.class.abilities ?? []).filter(
      // Обереги от смерти (Последняя воля, Несокрушимый и т.п.) срабатывают сами при смертельном
      // ударе — их нельзя скастовать вручную, см. lib/conditional-ability-engine.ts.
      a => a.type === 'active' && player.level >= stageUnlockLevel(a.stage) && parseDeathWard(a.description) === null
    );
  };

  // ===== HELPER: Get current location info =====
  const getCurrentLocation = () => {
    if (!player) return null;
    return LOCATIONS.find(l => l.id === player.locationId) || LOCATIONS[0];
  };

  // ===== HELPER: Get current enemy info =====
  const getCurrentEnemy = () => {
    if (!player?.enemyId) return null;
    return ENEMIES.find(e => e.id === player.enemyId) || null;
  };

  // ===== SAFE ACCESSORS =====
  const playerInventory = player?.inventory || [];

  // ===== HELPER: Can daily be claimed =====
  const canClaimDaily = () => {
    if (!player?.lastDailyReward) return true;
    const today = new Date().toISOString().split('T')[0];
    return player.lastDailyReward !== today;
  };

  // ===== HELPER: Check if player has materials for recipe =====
  const hasMaterials = (recipe: typeof CRAFTING_RECIPES[0]) => {
    if (!player) return false;
    for (const mat of recipe.materials) {
      const invItem = playerInventory.find(i => i.itemId === mat.itemId);
      if (!invItem || invItem.quantity < mat.quantity) return false;
    }
    return true;
  };

  // ===== HELPER: Полная проверка доступности рецепта — материалы + уровень + чертёж =====
  const canCraftRecipe = (recipe: typeof CRAFTING_RECIPES[0]) => {
    if (!player) return false;
    if (player.level < recipe.minLevel) return false;
    if (recipe.requiresBlueprintId && !learnedRecipeIds.has(recipe.id)) return false;
    return hasMaterials(recipe);
  };

  // ===== RENDER: LOADING SCREEN =====
  if (screen === 'loading') {
    return <LoadingScreen />;
  }

  // ===== RENDER: CHARACTER CREATION =====
  if (screen === 'creation') {
    return (
      <CharacterCreationScreen
        message={message}
        onDismissMessage={() => setMessage(null)}
        creationStep={creationStep}
        setCreationStep={setCreationStep}
        charName={charName}
        setCharName={setCharName}
        charRace={charRace}
        setCharRace={setCharRace}
        charClass={charClass}
        setCharClass={setCharClass}
        loading={loading}
        onCreatePlayer={createPlayer}
      />
    );
  }

  // ===== RENDER: MAIN GAME =====
  const location = getCurrentLocation();
  const enemy = getCurrentEnemy();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GameHeader player={player} locationIcon={location?.icon} locationName={location?.nameRu} />

      {/* Message toast area */}
      {message && (
        <div
          className={`mx-4 mt-2 p-2 rounded-lg text-sm text-center animate-fade-in cursor-pointer ${
            message.type === 'success' ? 'bg-uncommon/20 text-uncommon border border-uncommon/30' :
            message.type === 'error' ? 'bg-destructive/20 text-destructive border border-destructive/30' :
            'bg-primary/20 text-primary border border-primary/30'
          }`}
          onClick={() => setMessage(null)}
        >
          {message.text}
        </div>
      )}

      {/* Level up overlay */}
      {levelUpAnimation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="animate-level-up text-center">
            <div className="text-6xl mb-2">⬆️</div>
            <div className="text-3xl font-bold text-gold">УРОВЕНЬ UP!</div>
          </div>
        </div>
      )}

      <ExplorationEventModal event={explorationEvent} loading={loading} onChoose={handleEventChoice} />

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <Tabs value={tab} onValueChange={v => setTab(v as GameTab)} className="h-full flex flex-col">
          <NavBar tab={tab} onChangeTab={setTab} inCombat={!!player?.inCombat} />

          <OverviewTab
            player={player}
            location={location}
            loading={loading}
            adventureLog={adventureLog}
            onExplore={handleExplore}
            onRest={handleRest}
            onTravel={handleTravel}
            onDaily={handleDaily}
            canClaimDaily={canClaimDaily()}
            onGoToCombat={() => setTab('combat')}
            onAllocateStat={handleAllocateStat}
            onBuyItem={handleBuyItem}
            onSellItem={handleSellItem}
            onStartDungeon={handleStartDungeon}
            onStartAbyss={handleStartAbyss}
          />

          <CombatTab
            player={player}
            enemy={enemy}
            shaking={shaking}
            floatingDamage={floatingDamage}
            combatLog={combatLog}
            loading={loading}
            availableAbilities={getAvailableAbilities()}
            onCombatAction={handleCombatAction}
            onGoToOverview={() => setTab('overview')}
          />

          <MapTab player={player} location={location} loading={loading} onTravel={handleTravel} />

          <InventoryTab
            player={player}
            loading={loading}
            onEquip={handleEquip}
            onUseItem={handleUseItem}
            onLearnBlueprint={handleLearnBlueprint}
            stashItems={stashItems}
            stashCapacity={stashCapacity}
            stashLoading={stashLoading}
            onStoreItem={handleStoreItem}
            onRetrieveItem={handleRetrieveItem}
          />

          <QuestsTab player={player} loading={loading} onClaimQuest={handleClaimQuest} />

          <CraftTab player={player} loading={loading} canCraftRecipe={canCraftRecipe} learnedRecipeIds={learnedRecipeIds} onCraft={handleCraft} onApplyCurrency={handleApplyCurrency} onTemper={handleTemper} />

          <LeaderboardTab
            player={player}
            leaderboard={leaderboard}
            loading={leaderboardLoading}
            currentSeason={currentSeason}
            previousSeason={previousSeason}
            previousSeasonWinners={previousSeasonWinners}
          />

          <PartyTab
            playerId={player?.id ?? null}
            party={party}
            combatState={partyCombatState}
            loading={loading}
            botUsername={process.env.NEXT_PUBLIC_BOT_USERNAME ?? null}
            availableAbilities={getAvailableAbilities()}
            playerMp={player?.mp ?? 0}
            onCreateParty={handleCreateParty}
            onLeaveParty={handleLeaveParty}
            onStartCombat={handleStartPartyCombat}
            onCombatAction={handlePartyCombatAction}
          />

          <AchievementsTab achievements={achievements} loading={achievementsLoading} />

          <GuildTab
            playerId={player?.id ?? null}
            guild={guild}
            loading={guildLoading}
            botUsername={process.env.NEXT_PUBLIC_BOT_USERNAME ?? null}
            onCreateGuild={handleCreateGuild}
            onLeaveGuild={handleLeaveGuild}
            worldBoss={worldBoss}
            worldBossLoading={worldBossLoading}
            onAttackWorldBoss={handleAttackWorldBoss}
            fortress={fortress}
            fortressLoading={fortressLoading}
            onAssaultFortress={handleAssaultFortress}
          />

          <CodexTab entries={codexEntries} loading={codexLoading} />

          <MarketTab
            player={player}
            listings={marketListings}
            loading={marketLoading}
            onListItem={handleMarketListItem}
            onBuyItem={handleMarketBuyItem}
            onCancelListing={handleMarketCancelListing}
          />

          <PvpTab
            opponents={pvpOpponents}
            myRating={pvpMyRating}
            myLeague={pvpMyLeague}
            myWins={pvpMyWins}
            myLosses={pvpMyLosses}
            loading={pvpLoading}
            onChallenge={handlePvpChallenge}
          />
        </Tabs>
      </main>

      {/* Bottom safe area for iOS */}
      <div className="h-safe-area-inset-bottom" />
    </div>
  );
}
