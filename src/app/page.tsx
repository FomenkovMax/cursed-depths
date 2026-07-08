'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LOCATIONS, ENEMIES, CRAFTING_RECIPES } from '@/lib/game-data';
import { stageUnlockLevel } from '@/lib/combat-engine';
import { parseDeathWard } from '@/lib/conditional-ability-engine';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PlayerData,
  CombatLogEntry,
  GameScreen,
  GameTab,
  GameMessage,
  TelegramGlobal,
} from '@/lib/game-types';
import { LoadingScreen } from '@/components/game/LoadingScreen';
import { CharacterCreationScreen } from '@/components/game/CharacterCreationScreen';
import { GameHeader } from '@/components/game/GameHeader';
import { OverviewTab } from '@/components/game/OverviewTab';
import { CombatTab } from '@/components/game/CombatTab';
import { MapTab } from '@/components/game/MapTab';
import { InventoryTab } from '@/components/game/InventoryTab';
import { QuestsTab } from '@/components/game/QuestsTab';
import { CraftTab } from '@/components/game/CraftTab';
import { LeaderboardTab, type LeaderboardEntry } from '@/components/game/LeaderboardTab';

// ===== MAIN COMPONENT =====
export default function CursedDepths() {
  // Core state
  const [screen, setScreen] = useState<GameScreen>('loading');
  const [tab, setTab] = useState<GameTab>('overview');
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<GameMessage>(null);
  const [combatLog, setCombatLog] = useState<CombatLogEntry[]>([]);
  const [shaking, setShaking] = useState(false);
  const [levelUpAnimation, setLevelUpAnimation] = useState(false);
  const [floatingDamage, setFloatingDamage] = useState<{ id: number; text: string; color: string }[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

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
      .then(data => setLeaderboard(data.leaderboard || []))
      .catch(() => setMessage({ text: 'Не удалось загрузить таблицу лидеров', type: 'error' }))
      .finally(() => setLeaderboardLoading(false));
  }, [tab]);

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
      }
    } catch {
      // silent
    }
  }, []);

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
      }
    } catch {
      setMessage({ text: 'Ошибка исследования', type: 'error' });
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
        setMessage({ text: `Победа! +${data.xpGained} XP, +${data.goldGained} золота`, type: 'success' });
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
      }
    } catch {
      setMessage({ text: 'Ошибка получения награды', type: 'error' });
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

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <Tabs value={tab} onValueChange={v => setTab(v as GameTab)} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-7 bg-card rounded-none border-b border-border h-10 p-0">
            <TabsTrigger value="overview" className="text-xs py-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              🏠
            </TabsTrigger>
            <TabsTrigger value="combat" className="text-xs py-2 data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive relative">
              ⚔️
              {player?.inCombat && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="map" className="text-xs py-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              🗺️
            </TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs py-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              🎒
            </TabsTrigger>
            <TabsTrigger value="quests" className="text-xs py-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              📜
            </TabsTrigger>
            <TabsTrigger value="craft" className="text-xs py-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              ⚒️
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="text-xs py-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              🏆
            </TabsTrigger>
          </TabsList>

          <OverviewTab
            player={player}
            location={location}
            loading={loading}
            onExplore={handleExplore}
            onRest={handleRest}
            onTravel={handleTravel}
            onDaily={handleDaily}
            canClaimDaily={canClaimDaily()}
            onGoToCombat={() => setTab('combat')}
            onAllocateStat={handleAllocateStat}
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

          <InventoryTab player={player} loading={loading} onEquip={handleEquip} onUseItem={handleUseItem} />

          <QuestsTab player={player} loading={loading} onClaimQuest={handleClaimQuest} />

          <CraftTab player={player} loading={loading} hasMaterials={hasMaterials} onCraft={handleCraft} />

          <LeaderboardTab player={player} leaderboard={leaderboard} loading={leaderboardLoading} />
        </Tabs>
      </main>

      {/* Bottom safe area for iOS */}
      <div className="h-safe-area-inset-bottom" />
    </div>
  );
}
