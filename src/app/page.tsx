'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LOCATIONS, ENEMIES, CRAFTING_RECIPES } from '@/lib/game-data';
import { stageUnlockLevel } from '@/lib/combat/combat-engine';
import { parseDeathWard } from '@/lib/combat/conditional-ability-engine';
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
  CheckRollResultView,
  TrialJunctionView,
  AchievementEntry,
  CodexEntryView,
  MarketListingView,
  StashItemView,
  PvpOpponentView,
  PvpLeagueView,
  PvpFightResultView,
  PvpSeasonRewardView,
  WorldBossStateView,
  WorldBossAttackResultView,
  FortressStateView,
  FortressAssaultResultView,
  GuildData,
  PremiumShopStateView,
  FortuneSpinResultView,
  PetsStateView,
  ExpeditionStateView,
  BountyStateView,
  BountyHuntResultView,
  GuildRaidBossStateView,
  GuildRaidAttackResultView,
  TrophyRoomStateView,
  TitlesStateView,
  AuctionStateView,
  BattlePassStateView,
  WaypointsStateView,
} from '@/lib/game-types';
import { LoadingScreen } from '@/components/game/LoadingScreen';
import { CharacterCreationScreen } from '@/components/game/CharacterCreationScreen';
import { GameHeader } from '@/components/game/GameHeader';
import { OverviewTab } from '@/components/game/OverviewTab';
import { RespecModal } from '@/components/game/RespecModal';
import { ExplorationEventModal } from '@/components/game/ExplorationEventModal';
import { TrialJunctionModal } from '@/components/game/TrialJunctionModal';
import { useRespec } from '@/hooks/useRespec';
import { useGuildUpgrades } from '@/hooks/useGuildUpgrades';
import { AchievementsTab } from '@/components/game/AchievementsTab';
import { TrophyRoomTab } from '@/components/game/TrophyRoomTab';
import { CodexTab } from '@/components/game/CodexTab';
import { MarketTab } from '@/components/game/MarketTab';
import { AuctionTab } from '@/components/game/AuctionTab';
import { PvpTab } from '@/components/game/PvpTab';
import { CombatTab } from '@/components/game/CombatTab';
import { MapTab } from '@/components/game/MapTab';
import { InventoryTab } from '@/components/game/InventoryTab';
import { QuestsTab } from '@/components/game/QuestsTab';
import { CraftTab } from '@/components/game/CraftTab';
import { LeaderboardTab, type LeaderboardEntry, type SeasonWinnerEntry } from '@/components/game/LeaderboardTab';
import { PartyTab } from '@/components/game/PartyTab';
import { GuildTab } from '@/components/game/GuildTab';
import { PremiumShopTab } from '@/components/game/PremiumShopTab';

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
  const [diceRoll, setDiceRoll] = useState<CheckRollResultView | null>(null);
  const [floatingDamage, setFloatingDamage] = useState<{ id: number; text: string; color: string }[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [currentSeason, setCurrentSeason] = useState<string | null>(null);
  const [previousSeason, setPreviousSeason] = useState<string | null>(null);
  const [previousSeasonWinners, setPreviousSeasonWinners] = useState<SeasonWinnerEntry[]>([]);
  const [achievements, setAchievements] = useState<AchievementEntry[]>([]);
  const [achievementsLoading, setAchievementsLoading] = useState(false);
  const [trophyRoom, setTrophyRoom] = useState<TrophyRoomStateView | null>(null);
  const [trophyRoomLoading, setTrophyRoomLoading] = useState(false);
  const [codexEntries, setCodexEntries] = useState<CodexEntryView[]>([]);
  const [codexLoading, setCodexLoading] = useState(false);
  const [marketListings, setMarketListings] = useState<MarketListingView[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [auctionState, setAuctionState] = useState<AuctionStateView | null>(null);
  const [auctionLoading, setAuctionLoading] = useState(false);
  const [pvpOpponents, setPvpOpponents] = useState<PvpOpponentView[]>([]);
  const [pvpMyRating, setPvpMyRating] = useState(1000);
  const [pvpMyLeague, setPvpMyLeague] = useState<PvpLeagueView | null>(null);
  const [pvpMyWins, setPvpMyWins] = useState(0);
  const [pvpMyLosses, setPvpMyLosses] = useState(0);
  const [pvpSeasonId, setPvpSeasonId] = useState<string | null>(null);
  const [pvpDaysUntilSeasonEnd, setPvpDaysUntilSeasonEnd] = useState<number | null>(null);
  const [pvpPreviousSeasonTop3, setPvpPreviousSeasonTop3] = useState<PvpSeasonRewardView[]>([]);
  const [pvpLoading, setPvpLoading] = useState(false);
  const [worldBoss, setWorldBoss] = useState<WorldBossStateView | null>(null);
  const [worldBossLoading, setWorldBossLoading] = useState(false);
  const [fortress, setFortress] = useState<FortressStateView | null>(null);
  const [fortressLoading, setFortressLoading] = useState(false);
  const [guildRaidBoss, setGuildRaidBoss] = useState<GuildRaidBossStateView | null>(null);
  const [guildRaidBossLoading, setGuildRaidBossLoading] = useState(false);
  const [premiumState, setPremiumState] = useState<PremiumShopStateView | null>(null);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [buyingPackId, setBuyingPackId] = useState<string | null>(null);
  const [spinningWheel, setSpinningWheel] = useState(false);
  const [changingRace, setChangingRace] = useState(false);
  const [petsState, setPetsState] = useState<PetsStateView | null>(null);
  const [petsLoading, setPetsLoading] = useState(false);
  const [buyingPetId, setBuyingPetId] = useState<string | null>(null);
  const [activatingPetId, setActivatingPetId] = useState<string | null>(null);
  const [titlesState, setTitlesState] = useState<TitlesStateView | null>(null);
  const [titlesLoading, setTitlesLoading] = useState(false);
  const [equippingTitleId, setEquippingTitleId] = useState<string | null>(null);
  const [battlePassState, setBattlePassState] = useState<BattlePassStateView | null>(null);
  const [battlePassLoading, setBattlePassLoading] = useState(false);
  const [claimingTier, setClaimingTier] = useState<number | null>(null);
  const [waypointsState, setWaypointsState] = useState<WaypointsStateView | null>(null);
  const [waypointsLoading, setWaypointsLoading] = useState(false);
  const [fastTravellingTo, setFastTravellingTo] = useState<string | null>(null);
  const [expeditionState, setExpeditionState] = useState<ExpeditionStateView | null>(null);
  const [expeditionLoading, setExpeditionLoading] = useState(false);
  const [startingExpeditionId, setStartingExpeditionId] = useState<string | null>(null);
  const [claimingExpedition, setClaimingExpedition] = useState(false);
  const [bountyState, setBountyState] = useState<BountyStateView | null>(null);
  const [bountyLoading, setBountyLoading] = useState(false);
  const [hunting, setHunting] = useState(false);
  const [stashItems, setStashItems] = useState<StashItemView[]>([]);
  const [stashCapacity, setStashCapacity] = useState(60);
  const [stashLoading, setStashLoading] = useState(false);
  const [party, setParty] = useState<PartyData | null>(null);
  const [guild, setGuild] = useState<GuildData | null>(null);
  const [guildLoading, setGuildLoading] = useState(false);
  const [partyCombatState, setPartyCombatState] = useState<PartyCombatStateResponse | null>(null);
  const [explorationEvent, setExplorationEvent] = useState<ExplorationEvent | null>(null);
  const [trialJunction, setTrialJunction] = useState<TrialJunctionView | null>(null);
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

  const respec = useRespec({ apiCall, onPlayerUpdate: setPlayer, onMessage: setMessage });
  const guildUpgrades = useGuildUpgrades({ apiCall, onPlayerUpdate: setPlayer, onGuildUpdate: setGuild, onMessage: setMessage });

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

  // ===== TROPHY ROOM (lib/social/boss-trophies.ts) — коллекция боссов, свободна для всех, награда премиум =====
  useEffect(() => {
    if (tab !== 'trophies' || !telegramIdRef.current) return;
    setTrophyRoomLoading(true);
    apiCall('/api/trophies/state')
      .then(data => { if (data.trophies) setTrophyRoom(data); })
      .catch(() => setMessage({ text: 'Не удалось загрузить комнату трофеев', type: 'error' }))
      .finally(() => setTrophyRoomLoading(false));
  }, [tab, apiCall]);

  // ===== CODEX (лор-кодекс, см. lib/social/codex.ts) =====
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

  // ===== MARKET (аукцион игрок-игроку, lib/economy/inventory-utils.ts MarketListing) =====
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

  // ===== АУКЦИОННЫЙ ДОМ (lib/economy/auction-house.ts) — премиум-эксклюзивная альтернатива Рынку выше:
  // отложенные ставки вместо мгновенной покупки. =====
  const refreshAuction = useCallback(() => {
    setAuctionLoading(true);
    apiCall('/api/auction/listings')
      .then(data => { if (data.premiumActive !== undefined) setAuctionState(data); })
      .catch(() => setMessage({ text: 'Не удалось загрузить аукционный дом', type: 'error' }))
      .finally(() => setAuctionLoading(false));
  }, [apiCall]);

  useEffect(() => {
    if (tab !== 'auction' || !telegramIdRef.current) return;
    refreshAuction();
  }, [tab, refreshAuction]);

  // ===== PVP ARENA (lib/combat/pvp.ts) =====
  const refreshPvpOpponents = useCallback(() => {
    setPvpLoading(true);
    apiCall('/api/pvp/opponents')
      .then(data => {
        if (data.opponents) setPvpOpponents(data.opponents);
        if (typeof data.myRating === 'number') setPvpMyRating(data.myRating);
        if (data.myLeague) setPvpMyLeague(data.myLeague);
        if (typeof data.myWins === 'number') setPvpMyWins(data.myWins);
        if (typeof data.myLosses === 'number') setPvpMyLosses(data.myLosses);
        if (data.seasonId) setPvpSeasonId(data.seasonId);
        if (typeof data.daysUntilSeasonEnd === 'number') setPvpDaysUntilSeasonEnd(data.daysUntilSeasonEnd);
        if (data.previousSeasonTop3) setPvpPreviousSeasonTop3(data.previousSeasonTop3);
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

  // ===== WORLD BOSS (lib/social/world-boss.ts) — живёт на вкладке "guild", см. GuildTab.tsx =====
  const refreshWorldBoss = useCallback(() => {
    setWorldBossLoading(true);
    apiCall('/api/worldboss/state')
      .then(data => { if (data.boss) setWorldBoss(data); })
      .catch(() => setMessage({ text: 'Не удалось загрузить мирового босса', type: 'error' }))
      .finally(() => setWorldBossLoading(false));
  }, [apiCall]);

  useEffect(() => {
    // Экран "Сегодня" на вкладке "Обзор" тоже показывает статус мирового босса — тот же
    // приём, что уже есть у premiumState/battlePassState: подгружаем не только на "своей"
    // вкладке, чтобы агрегатор не был пустым до первого визита в "Гильдию".
    if ((tab !== 'guild' && tab !== 'overview') || !telegramIdRef.current) return;
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

  // ===== FORTRESS (гильд-война за территорию — lib/social/fortress.ts) =====
  const refreshFortress = useCallback(() => {
    setFortressLoading(true);
    apiCall('/api/fortress/state')
      .then(data => { if (data.cycleId) setFortress(data); })
      .catch(() => setMessage({ text: 'Не удалось загрузить состояние Крепости', type: 'error' }))
      .finally(() => setFortressLoading(false));
  }, [apiCall]);

  useEffect(() => {
    if ((tab !== 'guild' && tab !== 'overview') || !telegramIdRef.current) return;
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

  // ===== GUILD RAID BOSS (еженедельная КООП-цель гильдии, премиум-эксклюзив — lib/social/guild-raid-boss.ts) =====
  const refreshGuildRaidBoss = useCallback(() => {
    setGuildRaidBossLoading(true);
    apiCall('/api/guildraid/state')
      .then(data => { if (data.inGuild !== undefined) setGuildRaidBoss(data); })
      .catch(() => setMessage({ text: 'Не удалось загрузить гильд-рейд-босса', type: 'error' }))
      .finally(() => setGuildRaidBossLoading(false));
  }, [apiCall]);

  useEffect(() => {
    if ((tab !== 'guild' && tab !== 'overview') || !telegramIdRef.current) return;
    refreshGuildRaidBoss();
  }, [tab, refreshGuildRaidBoss]);

  const handleAttackGuildRaidBoss = async (): Promise<GuildRaidAttackResultView | null> => {
    if (!player) return null;
    setGuildRaidBossLoading(true);
    try {
      const data = await apiCall('/api/guildraid/attack', 'POST', {});
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
        return null;
      }
      if (data.killed) setMessage({ text: 'Гильд-рейд-босс повержен!', type: 'success' });
      await refreshPlayer();
      refreshGuildRaidBoss();
      return data as GuildRaidAttackResultView;
    } catch {
      setMessage({ text: 'Ошибка атаки гильд-рейд-босса', type: 'error' });
      return null;
    } finally {
      setGuildRaidBossLoading(false);
    }
  };

  // ===== PREMIUM SHOP (Осколки Короны за Telegram Stars — lib/premium/premium-shop.ts) =====
  const refreshPremiumState = useCallback(() => {
    setPremiumLoading(true);
    apiCall('/api/shop/premium/state')
      .then(data => { if (data.shardPacks) setPremiumState(data); })
      .catch(() => setMessage({ text: 'Не удалось загрузить магазин', type: 'error' }))
      .finally(() => setPremiumLoading(false));
  }, [apiCall]);

  useEffect(() => {
    if (tab !== 'premium' || !telegramIdRef.current) return;
    refreshPremiumState();
  }, [tab, refreshPremiumState]);

  // Баланс Осколков Короны в GameHeader должен быть виден сразу после входа, а не только
  // после первого открытия вкладки "Премиум" — отдельный триггер на screen==='game'.
  useEffect(() => {
    if (screen !== 'game' || !telegramIdRef.current) return;
    refreshPremiumState();
  }, [screen, refreshPremiumState]);

  // ===== ПИТОМЦЫ-КОМПАНЬОНЫ (lib/economy/pets.ts) — тот же паттерн загрузки, что и премиум-магазин:
  // сразу при входе (для activePetId в GameHeader/OverviewTab) и при каждом открытии вкладки. =====
  const refreshPetsState = useCallback(() => {
    setPetsLoading(true);
    apiCall('/api/pets/state')
      .then(data => { if (data.catalog) setPetsState(data); })
      .catch(() => setMessage({ text: 'Не удалось загрузить питомцев', type: 'error' }))
      .finally(() => setPetsLoading(false));
  }, [apiCall]);

  useEffect(() => {
    if (tab !== 'premium' || !telegramIdRef.current) return;
    refreshPetsState();
  }, [tab, refreshPetsState]);

  useEffect(() => {
    if (screen !== 'game' || !telegramIdRef.current) return;
    refreshPetsState();
  }, [screen, refreshPetsState]);

  const handleBuyPet = async (petId: string) => {
    if (!player) return;
    setBuyingPetId(petId);
    try {
      const data = await apiCall('/api/pets/buy', 'POST', { petId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setPlayer(data.player);
        setMessage({ text: data.message, type: 'success' });
        refreshPetsState();
      }
    } catch {
      setMessage({ text: 'Ошибка покупки питомца', type: 'error' });
    } finally {
      setBuyingPetId(null);
    }
  };

  const handleActivatePet = async (petId: string | null) => {
    if (!player) return;
    setActivatingPetId(petId ?? 'none');
    try {
      const data = await apiCall('/api/pets/activate', 'POST', { petId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setPlayer(data.player);
        refreshPetsState();
      }
    } catch {
      setMessage({ text: 'Ошибка активации питомца', type: 'error' });
    } finally {
      setActivatingPetId(null);
    }
  };

  // ===== ТИТУЛЫ (lib/social/titles.ts) — тот же паттерн загрузки, что питомцы: сразу при входе (для
  // GameHeader) и при каждом открытии премиум-вкладки. Премиум-эксклюзив целиком — без него
  // /api/titles/state отдаёт пустой каталог. =====
  const refreshTitlesState = useCallback(() => {
    setTitlesLoading(true);
    apiCall('/api/titles/state')
      .then(data => { if (data.premiumActive !== undefined) setTitlesState(data); })
      .catch(() => setMessage({ text: 'Не удалось загрузить титулы', type: 'error' }))
      .finally(() => setTitlesLoading(false));
  }, [apiCall]);

  useEffect(() => {
    if (tab !== 'premium' || !telegramIdRef.current) return;
    refreshTitlesState();
  }, [tab, refreshTitlesState]);

  useEffect(() => {
    if (screen !== 'game' || !telegramIdRef.current) return;
    refreshTitlesState();
  }, [screen, refreshTitlesState]);

  const handleEquipTitle = async (titleId: string | null) => {
    if (!player) return;
    setEquippingTitleId(titleId ?? 'none');
    try {
      const data = await apiCall('/api/titles/equip', 'POST', { titleId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setPlayer(data.player);
        refreshTitlesState();
      }
    } catch {
      setMessage({ text: 'Ошибка экипировки титула', type: 'error' });
    } finally {
      setEquippingTitleId(null);
    }
  };

  // ===== БОЕВОЙ ПРОПУСК (lib/premium/battle-pass.ts) — тот же паттерн загрузки, что титулы: только
  // на премиум-вкладке, полный премиум-лок. =====
  const refreshBattlePassState = useCallback(() => {
    setBattlePassLoading(true);
    apiCall('/api/battlepass/state')
      .then(data => { if (data.premiumActive !== undefined) setBattlePassState(data); })
      .catch(() => setMessage({ text: 'Не удалось загрузить Боевой пропуск', type: 'error' }))
      .finally(() => setBattlePassLoading(false));
  }, [apiCall]);

  useEffect(() => {
    if (tab !== 'premium' || !telegramIdRef.current) return;
    refreshBattlePassState();
  }, [tab, refreshBattlePassState]);

  // Кошелёк (OverviewTab) показывает очки Боевого пропуска сразу на первом экране — та же
  // подгрузка при входе, что уже есть у premiumState/petsState, не только при заходе на вкладку.
  useEffect(() => {
    if (screen !== 'game' || !telegramIdRef.current) return;
    refreshBattlePassState();
  }, [screen, refreshBattlePassState]);

  const handleClaimTier = async (tier: number) => {
    if (!player) return;
    setClaimingTier(tier);
    try {
      const data = await apiCall('/api/battlepass/claim', 'POST', { tier });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setMessage({ text: data.message, type: 'success' });
        await refreshPlayer();
        refreshBattlePassState();
      }
    } catch {
      setMessage({ text: 'Ошибка получения награды', type: 'error' });
    } finally {
      setClaimingTier(null);
    }
  };

  // ===== БЫСТРОЕ ПЕРЕМЕЩЕНИЕ (lib/economy/fast-travel.ts) — премиум-эксклюзивный телепорт между уже
  // посещёнными локациями, живёт на вкладке "Карта". =====
  const refreshWaypointsState = useCallback(() => {
    setWaypointsLoading(true);
    apiCall('/api/travel/waypoints')
      .then(data => { if (data.premiumActive !== undefined) setWaypointsState(data); })
      .catch(() => setMessage({ text: 'Не удалось загрузить точки телепорта', type: 'error' }))
      .finally(() => setWaypointsLoading(false));
  }, [apiCall]);

  useEffect(() => {
    if (tab !== 'map' || !telegramIdRef.current) return;
    refreshWaypointsState();
  }, [tab, refreshWaypointsState]);

  const handleFastTravel = async (locationId: string) => {
    if (!player) return;
    setFastTravellingTo(locationId);
    try {
      const data = await apiCall('/api/travel/fast', 'POST', { locationId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setMessage({ text: data.message, type: 'success' });
        setPlayer(data.player);
        refreshWaypointsState();
      }
    } catch {
      setMessage({ text: 'Ошибка быстрого перемещения', type: 'error' });
    } finally {
      setFastTravellingTo(null);
    }
  };

  // ===== ЭКСПЕДИЦИИ (lib/premium/expeditions.ts) — премиум-эксклюзивный офлайн-таймер, не блокирует
  // остальную игру. Тот же паттерн загрузки состояния, что и у премиум-магазина/питомцев. =====
  const refreshExpeditionState = useCallback(() => {
    setExpeditionLoading(true);
    apiCall('/api/expedition/state')
      .then(data => { if (data.tiers) setExpeditionState(data); })
      .catch(() => setMessage({ text: 'Не удалось загрузить экспедиции', type: 'error' }))
      .finally(() => setExpeditionLoading(false));
  }, [apiCall]);

  useEffect(() => {
    if ((tab !== 'premium' && tab !== 'overview') || !telegramIdRef.current) return;
    refreshExpeditionState();
  }, [tab, refreshExpeditionState]);

  const handleStartExpedition = async (tierId: string) => {
    if (!player) return;
    setStartingExpeditionId(tierId);
    try {
      const data = await apiCall('/api/expedition/start', 'POST', { tierId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setPlayer(data.player);
        setMessage({ text: data.message, type: 'success' });
        refreshExpeditionState();
      }
    } catch {
      setMessage({ text: 'Ошибка отправки экспедиции', type: 'error' });
    } finally {
      setStartingExpeditionId(null);
    }
  };

  const handleClaimExpedition = async () => {
    if (!player) return;
    setClaimingExpedition(true);
    try {
      const data = await apiCall('/api/expedition/claim', 'POST', {});
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setPlayer(data.player);
        setMessage({ text: data.message, type: 'success' });
        refreshExpeditionState();
      }
    } catch {
      setMessage({ text: 'Ошибка получения награды экспедиции', type: 'error' });
    } finally {
      setClaimingExpedition(false);
    }
  };

  // ===== ДОСКА КОНТРАКТОВ (lib/economy/bounty-board.ts) — премиум-эксклюзивная ежедневная охота,
  // одна попытка в день, тот же паттерн загрузки состояния, что и у остального премиум-контента. =====
  const refreshBountyState = useCallback(() => {
    setBountyLoading(true);
    apiCall('/api/bounty/state')
      .then(data => { if (typeof data.premiumActive === 'boolean') setBountyState(data); })
      .catch(() => setMessage({ text: 'Не удалось загрузить доску контрактов', type: 'error' }))
      .finally(() => setBountyLoading(false));
  }, [apiCall]);

  useEffect(() => {
    if ((tab !== 'premium' && tab !== 'overview') || !telegramIdRef.current) return;
    refreshBountyState();
  }, [tab, refreshBountyState]);

  const handleHunt = async (): Promise<BountyHuntResultView | null> => {
    if (!player) return null;
    setHunting(true);
    try {
      const data = await apiCall('/api/bounty/hunt', 'POST', {});
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
        return null;
      }
      setPlayer(data.player);
      refreshBountyState();
      return data as BountyHuntResultView;
    } catch {
      setMessage({ text: 'Ошибка охоты', type: 'error' });
      return null;
    } finally {
      setHunting(false);
    }
  };

  const handleBuyShardPack = async (packId: string) => {
    if (!player) return;
    setBuyingPackId(packId);
    try {
      const data = await apiCall('/api/shop/premium/invoice', 'POST', { packId });
      if (data.error || !data.invoiceUrl) {
        setMessage({ text: data.error || 'Не удалось создать счёт', type: 'error' });
        setBuyingPackId(null);
        return;
      }
      const win = typeof window !== 'undefined' ? (window as unknown as TelegramGlobal) : null;
      const tg = win?.Telegram?.WebApp;
      if (tg?.openInvoice) {
        tg.openInvoice(data.invoiceUrl, (status) => {
          setBuyingPackId(null);
          if (status === 'paid') {
            setMessage({ text: 'Оплата прошла! Осколки уже начислены.', type: 'success' });
            refreshPremiumState();
          } else if (status === 'failed') {
            setMessage({ text: 'Оплата не прошла.', type: 'error' });
          }
        });
      } else {
        // Вне Telegram WebView (напр. обычный браузер при разработке) — открываем ссылку напрямую.
        window.open(data.invoiceUrl, '_blank');
        setBuyingPackId(null);
      }
    } catch {
      setMessage({ text: 'Ошибка создания счёта', type: 'error' });
      setBuyingPackId(null);
    }
  };

  const handleRedeemSku = async (skuId: string) => {
    if (!player) return;
    setPremiumLoading(true);
    try {
      const data = await apiCall('/api/shop/premium/redeem', 'POST', { skuId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setPlayer(data.player);
        setMessage({ text: data.message, type: 'success' });
        refreshPremiumState();
      }
    } catch {
      setMessage({ text: 'Ошибка покупки', type: 'error' });
    } finally {
      setPremiumLoading(false);
    }
  };

  // Возвращает выпавший приз вызывающему (FortuneWheelVisual) — сама анимация довода колеса до
  // нужного сектора и показ результата после её завершения происходит уже внутри компонента,
  // здесь только сетевой запрос и обновление состояния игрока/валюты.
  const handleSpinFortuneWheel = async (): Promise<FortuneSpinResultView | null> => {
    if (!player) return null;
    setSpinningWheel(true);
    try {
      const data = await apiCall('/api/fortune/spin', 'POST', {});
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
        return null;
      }
      setPlayer(data.player);
      refreshPremiumState();
      return data.reward as FortuneSpinResultView;
    } catch {
      setMessage({ text: 'Ошибка вращения колеса', type: 'error' });
      return null;
    } finally {
      setSpinningWheel(false);
    }
  };

  const handleChangeRace = async (raceSlug: string, classSlug: string) => {
    if (!player) return;
    setChangingRace(true);
    try {
      const data = await apiCall('/api/player/change-race', 'POST', { raceSlug, classSlug });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setPlayer(data.player);
        setMessage({ text: data.message, type: 'success' });
        refreshPremiumState();
      }
    } catch {
      setMessage({ text: 'Ошибка смены расы', type: 'error' });
    } finally {
      setChangingRace(false);
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
      if (data.checkResult) {
        setDiceRoll(data.checkResult);
        setTimeout(() => setDiceRoll(null), 1600);
      }
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
  const handleStartDungeon = async (dungeonId: string, heatLevel: number) => {
    if (!player || player.inCombat) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/dungeon/start', 'POST', { dungeonId, heatLevel });
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

  // ===== TRIALS (lib/combat/trials.ts) — ветвящийся аналог данжей, см. combat/action.ts trial-ветку =====
  const handleStartTrial = async (trialId: string) => {
    if (!player || player.inCombat) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/trial/start', 'POST', { trialId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setPlayer(data.player);
        setTrialJunction(data.trialJunction ?? null);
        setMessage({ text: data.message, type: 'info' });
      }
    } catch {
      setMessage({ text: 'Ошибка входа в испытание', type: 'error' });
    }
    setLoading(false);
  };

  const handleTrialChoose = async (direction: 'left' | 'right') => {
    if (!trialJunction) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/trial/choose', 'POST', { direction });
      setTrialJunction(null);
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else if (data.type === 'combat') {
        setPlayer(data.player);
        setCombatLog([{ text: data.message, turn: 0 }]);
        setTab('combat');
        setMessage({ text: data.message, type: 'info' });
      } else if (data.type === 'junction') {
        setPlayer(data.player);
        if (data.goldDelta > 0) addFloatingDamage(`+${data.goldDelta} 💰`, '#fbbf24');
        setMessage({ text: data.message, type: 'success' });
        setTrialJunction(data.trialJunction ?? null);
      }
    } catch {
      setTrialJunction(null);
      setMessage({ text: 'Ошибка испытания', type: 'error' });
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
        } else if (data.trialCompleted) {
          setMessage({ text: `🏆 Испытание пройдено! +${data.xpGained} XP, +${data.goldGained} золота`, type: 'success' });
        } else if (data.dungeonRoomCleared) {
          setMessage({ text: `Комната пройдена! Следующий враг уже здесь...`, type: 'success' });
        } else if (data.trialJunction) {
          setTrialJunction(data.trialJunction);
          setMessage({ text: 'Комната пройдена! Впереди развилка.', type: 'success' });
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

  // ===== STASH (сундук, отдельный от боевого инвентаря — lib/economy/stash.ts) =====
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

  // ===== APPLY CRAFT CURRENCY (Мастерская зачарования — lib/economy/item-affixes.ts) =====
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

  // ===== TEMPER (заточка — lib/economy/item-enhancement.ts) =====
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

  // ===== ТОЧЕЧНЫЙ РЕБРОС ОДНОГО АФФИКСА (Мастерская зачарования, за Осколки Короны) =====
  const [enchanting, setEnchanting] = useState(false);
  const handleEnchantAffix = async (inventoryId: string, affixIndex: number) => {
    if (!player) return;
    setEnchanting(true);
    try {
      const data = await apiCall('/api/craft/enchant', 'POST', { inventoryId, affixIndex });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setMessage({ text: data.message, type: 'success' });
        await refreshPlayer();
        refreshPremiumState();
      }
    } catch {
      setMessage({ text: 'Ошибка зачарования', type: 'error' });
    }
    setEnchanting(false);
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

  // ===== АУКЦИОННЫЙ ДОМ ACTIONS =====
  const handleAuctionListItem = async (inventoryId: string, startingPriceValue: number, durationHours: number) => {
    if (!player) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/auction/list', 'POST', { inventoryId, startingPrice: startingPriceValue, durationHours });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setMessage({ text: data.message, type: 'success' });
        await refreshPlayer();
        refreshAuction();
      }
    } catch {
      setMessage({ text: 'Ошибка выставления лота', type: 'error' });
    }
    setLoading(false);
  };

  const handleAuctionBid = async (auctionId: string, amount: number) => {
    if (!player) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/auction/bid', 'POST', { auctionId, amount });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setMessage({ text: data.message, type: 'success' });
        await refreshPlayer();
        refreshAuction();
      }
    } catch {
      setMessage({ text: 'Ошибка ставки', type: 'error' });
    }
    setLoading(false);
  };

  const handleAuctionCancel = async (auctionId: string) => {
    if (!player) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/auction/cancel', 'POST', { auctionId });
      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setMessage({ text: data.message, type: 'success' });
        await refreshPlayer();
        refreshAuction();
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
      // ударе — их нельзя скастовать вручную, см. lib/combat/conditional-ability-engine.ts.
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
      <GameHeader
        player={player}
        locationIcon={location?.icon}
        locationName={location?.nameRu}
        crownShards={premiumState?.crownShards ?? 0}
        activePetId={petsState?.activePetId ?? null}
        activeTitleId={titlesState?.activeTitleId ?? null}
        onOpenPremium={() => setTab('premium')}
      />

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

      {/* Проверка характеристики (rollStatCheck) — крупная цифра + цветовой код успех/провал,
          BG3-подача броска (аудит 3, BG3 "переносимо в Telegram") поверх уже посчитанного
          d20+модификатор vs СЛ, который раньше был виден только мелким текстом в тосте. */}
      {diceRoll && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="animate-level-up text-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{diceRoll.statLabel}</div>
            <div className={`text-5xl font-bold ${diceRoll.success ? 'text-uncommon' : 'text-destructive'}`}>
              {diceRoll.total}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              🎲{diceRoll.roll} {diceRoll.modifier >= 0 ? '+' : ''}{diceRoll.modifier} vs СЛ {diceRoll.dc}
            </div>
            <div className={`text-lg font-bold mt-1 ${diceRoll.success ? 'text-uncommon' : 'text-destructive'}`}>
              {diceRoll.success ? 'Успех!' : 'Провал'}
            </div>
          </div>
        </div>
      )}

      <ExplorationEventModal event={explorationEvent} loading={loading} onChoose={handleEventChoice} />
      <TrialJunctionModal junction={trialJunction} loading={loading} onChoose={handleTrialChoose} />
      <RespecModal
        open={respec.open}
        player={player}
        crownShards={premiumState?.crownShards ?? 0}
        submitting={respec.submitting}
        onClose={() => respec.setOpen(false)}
        onSubmit={respec.submit}
      />

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
            onStartTrial={handleStartTrial}
            activePetId={petsState?.activePetId ?? null}
            crownShards={premiumState?.crownShards ?? 0}
            battlePassXp={battlePassState?.premiumActive ? battlePassState.xp : null}
            worldBoss={worldBoss}
            fortress={fortress}
            guildRaidBoss={guildRaidBoss}
            expeditionState={expeditionState}
            bountyState={bountyState}
            onNavigateTab={setTab}
            onOpenRespec={() => respec.setOpen(true)}
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

          <MapTab
            player={player}
            location={location}
            loading={loading}
            onTravel={handleTravel}
            waypointsState={waypointsState}
            waypointsLoading={waypointsLoading}
            fastTravellingTo={fastTravellingTo}
            onFastTravel={handleFastTravel}
          />

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

          <CraftTab
            player={player}
            loading={loading}
            canCraftRecipe={canCraftRecipe}
            learnedRecipeIds={learnedRecipeIds}
            onCraft={handleCraft}
            onApplyCurrency={handleApplyCurrency}
            onTemper={handleTemper}
            crownShards={premiumState?.crownShards ?? 0}
            onEnchantAffix={handleEnchantAffix}
            enchanting={enchanting}
          />

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

          <TrophyRoomTab state={trophyRoom} loading={trophyRoomLoading} />

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
            guildRaidBoss={guildRaidBoss}
            guildRaidBossLoading={guildRaidBossLoading}
            onAttackGuildRaidBoss={handleAttackGuildRaidBoss}
            playerGold={player?.gold ?? 0}
            donatingTreasury={guildUpgrades.donating}
            onDonateTreasury={guildUpgrades.donate}
            unlockingUpgradeId={guildUpgrades.unlockingId}
            onUnlockUpgrade={guildUpgrades.unlock}
          />

          <PremiumShopTab
            state={premiumState}
            loading={premiumLoading}
            buyingPackId={buyingPackId}
            onBuyPack={handleBuyShardPack}
            onRedeemSku={handleRedeemSku}
            player={player}
            spinningWheel={spinningWheel}
            onSpinWheel={handleSpinFortuneWheel}
            changingRace={changingRace}
            onChangeRace={handleChangeRace}
            petsState={petsState}
            petsLoading={petsLoading}
            buyingPetId={buyingPetId}
            activatingPetId={activatingPetId}
            onBuyPet={handleBuyPet}
            onActivatePet={handleActivatePet}
            expeditionState={expeditionState}
            expeditionLoading={expeditionLoading}
            startingExpeditionId={startingExpeditionId}
            claimingExpedition={claimingExpedition}
            onStartExpedition={handleStartExpedition}
            onClaimExpedition={handleClaimExpedition}
            bountyState={bountyState}
            bountyLoading={bountyLoading}
            hunting={hunting}
            onHunt={handleHunt}
            titlesState={titlesState}
            titlesLoading={titlesLoading}
            equippingTitleId={equippingTitleId}
            onEquipTitle={handleEquipTitle}
            battlePassState={battlePassState}
            battlePassLoading={battlePassLoading}
            claimingTier={claimingTier}
            onClaimTier={handleClaimTier}
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

          <AuctionTab
            player={player}
            state={auctionState}
            loading={auctionLoading}
            onListItem={handleAuctionListItem}
            onBid={handleAuctionBid}
            onCancelAuction={handleAuctionCancel}
          />

          <PvpTab
            opponents={pvpOpponents}
            myRating={pvpMyRating}
            myLeague={pvpMyLeague}
            myWins={pvpMyWins}
            myLosses={pvpMyLosses}
            seasonId={pvpSeasonId}
            daysUntilSeasonEnd={pvpDaysUntilSeasonEnd}
            previousSeasonTop3={pvpPreviousSeasonTop3}
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
