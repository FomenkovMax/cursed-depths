'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RACES, CLASSES, LOCATIONS, ENEMIES, ITEMS, CRAFTING_RECIPES, RARITY_COLORS, RARITY_NAMES_RU } from '@/lib/game-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

// ===== TYPES =====
interface PlayerData {
  id: string;
  telegramId: string;
  name: string;
  race: string;
  class: string;
  level: number;
  xp: number;
  xpToNext: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  gold: number;
  locationId: string;
  inCombat: boolean;
  enemyId: string | null;
  enemyHp: number | null;
  enemyMaxHp: number | null;
  combatLog: string | null;
  lastDailyReward: string | null;
  inventory: InventoryItem[];
  quests: QuestData[];
}

interface InventoryItem {
  id: string;
  itemId: string;
  name: string;
  type: string;
  rarity: string;
  equipped: boolean;
  slot: string | null;
  stats: string | null;
  quantity: number;
  icon: string | null;
}

interface QuestData {
  id: string;
  questId: string;
  type: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  reward: string;
  expiresAt: string | null;
  createdAt: string;
}

interface CombatLogEntry {
  text: string;
  turn: number;
}

type GameScreen = 'loading' | 'creation' | 'game';
type GameTab = 'overview' | 'combat' | 'map' | 'inventory' | 'quests' | 'craft';

// ===== STAT NAMES RU =====
const STAT_NAMES_RU: Record<string, string> = {
  strength: 'Сила',
  dexterity: 'Ловкость',
  constitution: 'Выносливость',
  intelligence: 'Интеллект',
  wisdom: 'Мудрость',
  charisma: 'Харизма',
};

const STAT_SHORT_RU: Record<string, string> = {
  strength: 'СИЛ',
  dexterity: 'ЛОВ',
  constitution: 'ВЫН',
  intelligence: 'ИНТ',
  wisdom: 'МДР',
  charisma: 'ХАР',
};

const ITEM_TYPE_RU: Record<string, string> = {
  weapon: 'Оружие',
  armor: 'Броня',
  accessory: 'Аксессуар',
  consumable: 'Расходуемое',
  material: 'Материал',
  quest: 'Квестовый предмет',
};

const SLOT_RU: Record<string, string> = {
  weapon: 'Оружие',
  chest: 'Нагрудник',
  accessory1: 'Аксессуар',
};

// ===== MAIN COMPONENT =====
export default function CursedDepths() {
  // Core state
  const [screen, setScreen] = useState<GameScreen>('loading');
  const [tab, setTab] = useState<GameTab>('overview');
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [combatLog, setCombatLog] = useState<CombatLogEntry[]>([]);
  const [shaking, setShaking] = useState(false);
  const [levelUpAnimation, setLevelUpAnimation] = useState(false);
  const [floatingDamage, setFloatingDamage] = useState<{ id: number; text: string; color: string }[]>([]);

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
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    let resolvedId = 'test_dev_123';

    if (typeof window !== 'undefined' && (window as unknown as { Telegram?: unknown }).Telegram) {
      const tg = (window as unknown as { Telegram: { WebApp: { ready: () => void; expand: () => void; initData?: string; initDataUnsafe?: { user?: { id: number } } } } }).Telegram.WebApp;
      tg.ready();
      tg.expand();

      // Store the raw initData for HMAC validation on the backend
      if (tg.initData) {
        initDataRef.current = tg.initData;
      }

      const user = tg.initDataUnsafe?.user;
      if (user) {
        resolvedId = String(user.id);
      }
    }

    telegramIdRef.current = resolvedId;

    // Defer player loading to avoid synchronous setState in effect
    const timer = setTimeout(() => {
      loadPlayer(resolvedId);
    }, 0);

    return () => clearTimeout(timer);
  }, [loadPlayer]);

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
    setLoading(true);
    try {
      console.log('[CreatePlayer] Creating character:', { name: charName.trim(), race: charRace, class: charClass, telegramId: telegramIdRef.current });
      const data = await apiCall('/api/player/create', 'POST', {
        telegramId: telegramIdRef.current,
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
  const handleCombatAction = async (action: string, itemId?: string) => {
    if (!player || !player.inCombat) return;
    setLoading(true);
    setShaking(true);
    setTimeout(() => setShaking(false), 300);
    try {
      const body: Record<string, string> = { action };
      if (itemId) body.itemId = itemId;
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

  // ===== HELPER: Parse item stats =====
  const parseStats = (statsStr: string | null): Record<string, number> => {
    if (!statsStr) return {};
    try { return JSON.parse(statsStr); } catch { return {}; }
  };

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
      const invItem = player.inventory.find(i => i.itemId === mat.itemId);
      if (!invItem || invItem.quantity < mat.quantity) return false;
    }
    return true;
  };

  // ===== RENDER: LOADING SCREEN =====
  if (screen === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="text-6xl mb-4 animate-pulse">👑</div>
        <h1 className="text-2xl font-bold text-primary mb-2">Cursed Depths</h1>
        <p className="text-muted-foreground text-sm">Загрузка проклятых глубин...</p>
        <div className="mt-4 w-48">
          <Progress value={60} className="h-2" />
        </div>
      </div>
    );
  }

  // ===== RENDER: CHARACTER CREATION =====
  if (screen === 'creation') {
    const raceData = RACES.find(r => r.id === charRace);
    const classData = CLASSES.find(c => c.id === charClass);

    return (
      <div className="min-h-screen bg-background p-4 flex flex-col">
        <div className="text-center mb-6 pt-4">
          <div className="text-5xl mb-2">👑</div>
          <h1 className="text-2xl font-bold text-primary">Cursed Depths</h1>
          <p className="text-muted-foreground text-sm mt-1">Проклятые Глубины</p>
        </div>

        {/* Message toast in creation screen */}
        {message && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm text-center animate-fade-in cursor-pointer ${
              message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
              message.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              'bg-primary/20 text-primary border border-primary/30'
            }`}
            onClick={() => setMessage(null)}
          >
            {message.text}
          </div>
        )}

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {['Имя', 'Раса', 'Класс', 'Готово'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                i <= creationStep ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
              }`}>
                {i < creationStep ? '✓' : i + 1}
              </div>
              {i < 3 && <div className={`w-8 h-0.5 ${i < creationStep ? 'bg-primary' : 'bg-secondary'}`} />}
            </div>
          ))}
        </div>

        <Card className="flex-1 border-border">
          <CardContent className="p-4">
            {/* Step 0: Name */}
            {creationStep === 0 && (
              <div className="animate-fade-in">
                <h2 className="text-lg font-bold mb-4 text-center">Как вас зовут, искатель?</h2>
                <Input
                  value={charName}
                  onChange={e => setCharName(e.target.value)}
                  placeholder="Введите имя персонажа..."
                  className="bg-secondary border-border text-foreground text-center text-lg h-12"
                  maxLength={20}
                  onKeyDown={e => { if (e.key === 'Enter' && charName.trim()) setCreationStep(1); }}
                />
                <p className="text-muted-foreground text-xs mt-2 text-center">Это имя будет известно по всем Проклятым Глубинам</p>
              </div>
            )}

            {/* Step 1: Race */}
            {creationStep === 1 && (
              <div className="animate-fade-in">
                <h2 className="text-lg font-bold mb-3 text-center">Выберите расу</h2>
                <ScrollArea className="h-[45vh]">
                  <div className="grid gap-2 pr-2">
                    {RACES.map(race => (
                      <button
                        key={race.id}
                        onClick={() => setCharRace(race.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          charRace === race.id
                            ? 'border-primary bg-primary/10 animate-glow'
                            : 'border-border bg-card hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{race.icon}</span>
                          <div className="flex-1">
                            <div className="font-bold text-sm">{race.nameRu}</div>
                            <div className="text-xs text-muted-foreground">{race.descriptionRu}</div>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {Object.entries(race.bonuses).map(([stat, val]) => (
                                <Badge key={stat} variant="outline" className="text-[10px] h-5 px-1">
                                  {STAT_SHORT_RU[stat]} +{val}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Step 2: Class */}
            {creationStep === 2 && (
              <div className="animate-fade-in">
                <h2 className="text-lg font-bold mb-3 text-center">Выберите класс</h2>
                <ScrollArea className="h-[45vh]">
                  <div className="grid gap-2 pr-2">
                    {CLASSES.map(cls => (
                      <button
                        key={cls.id}
                        onClick={() => setCharClass(cls.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          charClass === cls.id
                            ? 'border-primary bg-primary/10 animate-glow'
                            : 'border-border bg-card hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{cls.icon}</span>
                          <div className="flex-1">
                            <div className="font-bold text-sm">{cls.nameRu}</div>
                            <div className="text-xs text-muted-foreground">{cls.descriptionRu}</div>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] h-5 px-1 text-hp">
                                HP: {cls.baseHp}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] h-5 px-1 text-mp">
                                MP: {cls.baseMp}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] h-5 px-1 text-gold">
                                {STAT_NAMES_RU[cls.primaryStat]}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Step 3: Confirm */}
            {creationStep === 3 && (
              <div className="animate-fade-in">
                <h2 className="text-lg font-bold mb-3 text-center">Подтвердите выбор</h2>
                <Card className="border-primary/50 bg-card mb-4">
                  <CardContent className="p-4">
                    <div className="text-center mb-4">
                      <div className="text-4xl mb-2">{raceData?.icon} {classData?.icon}</div>
                      <h3 className="text-xl font-bold text-primary">{charName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {raceData?.nameRu} • {classData?.nameRu}
                      </p>
                    </div>
                    <Separator className="my-3 bg-border" />
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      {raceData && Object.entries(raceData.bonuses).map(([stat, val]) => {
                        const base = 10 + val;
                        return (
                          <div key={stat} className="bg-secondary/50 rounded p-2">
                            <div className="text-xs text-muted-foreground">{STAT_SHORT_RU[stat]}</div>
                            <div className="font-bold">{base}</div>
                          </div>
                        );
                      })}
                    </div>
                    <Separator className="my-3 bg-border" />
                    <div className="flex justify-center gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-hp font-bold">{classData?.baseHp}</div>
                        <div className="text-xs text-muted-foreground">HP</div>
                      </div>
                      <div className="text-center">
                        <div className="text-mp font-bold">{classData?.baseMp}</div>
                        <div className="text-xs text-muted-foreground">MP</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <p className="text-xs text-muted-foreground text-center">
                  Нажав &quot;Начать приключение&quot;, вы вступаете в мир Проклятых Глубин
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation buttons - sticky at bottom */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm py-3 px-4 flex gap-2 border-t border-border mt-auto">
          {creationStep > 0 && (
            <Button
              variant="outline"
              className="flex-1 border-border"
              onClick={() => setCreationStep(prev => prev - 1)}
            >
              Назад
            </Button>
          )}
          {creationStep < 3 && (
            <Button
              className="flex-1"
              disabled={
                (creationStep === 0 && !charName.trim()) ||
                (creationStep === 1 && !charRace) ||
                (creationStep === 2 && !charClass)
              }
              onClick={() => setCreationStep(prev => prev + 1)}
            >
              Далее
            </Button>
          )}
          {creationStep === 3 && (
            <Button
              className="flex-1"
              disabled={loading}
              onClick={createPlayer}
            >
              {loading ? 'Создание...' : '⚔️ Начать приключение'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ===== RENDER: MAIN GAME =====
  const location = getCurrentLocation();
  const enemy = getCurrentEnemy();
  const hpPercent = player ? Math.max(0, (player.hp / player.maxHp) * 100) : 0;
  const mpPercent = player ? Math.max(0, (player.mp / player.maxMp) * 100) : 0;
  const xpPercent = player ? Math.max(0, (player.xp / player.xpToNext) * 100) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{RACES.find(r => r.id === player?.race)?.icon || '👤'}</span>
            <div>
              <div className="font-bold text-sm text-foreground leading-tight">{player?.name}</div>
              <div className="text-[10px] text-muted-foreground">
                Ур. {player?.level} {RACES.find(r => r.id === player?.race)?.nameRu} {CLASSES.find(c => c.id === player?.class)?.nameRu}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-xs">💰</span>
              <span className="text-xs font-bold text-gold">{player?.gold || 0}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {location?.icon} {location?.nameRu?.split(' ').slice(0, 2).join(' ')}
            </div>
          </div>
        </div>

        {/* HP/MP/XP bars */}
        <div className="mt-1.5 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] w-6 text-hp font-bold">HP</span>
            <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${hpPercent}%`,
                  backgroundColor: hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground w-14 text-right">{player?.hp}/{player?.maxHp}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] w-6 text-mp font-bold">MP</span>
            <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-mp rounded-full transition-all duration-500"
                style={{ width: `${mpPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground w-14 text-right">{player?.mp}/{player?.maxMp}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] w-6 text-xp font-bold">XP</span>
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-xp rounded-full transition-all duration-500"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground w-14 text-right">{player?.xp}/{player?.xpToNext}</span>
          </div>
        </div>
      </header>

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
          <TabsList className="grid w-full grid-cols-6 bg-card rounded-none border-b border-border h-10 p-0">
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
          </TabsList>

          {/* ===== OVERVIEW TAB ===== */}
          <TabsContent value="overview" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
            {/* Location card */}
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{location?.icon}</span>
                  <div>
                    <h3 className="font-bold text-sm">{location?.nameRu}</h3>
                    <p className="text-xs text-muted-foreground">{location?.descriptionRu}</p>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="w-full h-11"
                    onClick={handleExplore}
                    disabled={loading || player?.inCombat || (player?.hp ?? 0) <= 0}
                  >
                    🔍 Исследовать
                  </Button>
                  {player?.locationId === 'town' ? (
                    <Button
                      variant="outline"
                      className="w-full h-11 border-border"
                      onClick={handleRest}
                      disabled={loading || player?.inCombat}
                    >
                      🍺 Отдохнуть
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full h-11 border-border"
                      onClick={() => handleTravel('town')}
                      disabled={loading || player?.inCombat}
                    >
                      🏠 В таверну
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full h-11 border-border"
                    onClick={handleDaily}
                    disabled={loading || !canClaimDaily()}
                  >
                    🎁 Ежедневное
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-11 border-border"
                    onClick={() => setTab('combat')}
                    disabled={!player?.inCombat}
                  >
                    ⚔️ В бой!
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Character stats */}
            <Card className="border-border">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm">Характеристики</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="grid grid-cols-3 gap-2">
                  {(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const).map(stat => (
                    <div key={stat} className="bg-secondary/50 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-muted-foreground">{STAT_SHORT_RU[stat]}</div>
                      <div className="font-bold text-sm">{player?.[stat] || 0}</div>
                      <div className="text-[10px] text-muted-foreground">
                        ({Math.floor(((player?.[stat] || 10) - 10) / 2) >= 0 ? '+' : ''}{Math.floor(((player?.[stat] || 10) - 10) / 2)})
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Equipped gear */}
            <Card className="border-border">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm">Экипировка</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                {player?.inventory.filter(i => i.equipped).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center">Ничего не экипировано</p>
                ) : (
                  <div className="space-y-2">
                    {player?.inventory.filter(i => i.equipped).map(item => {
                      const stats = parseStats(item.stats);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 border"
                          style={{ borderColor: RARITY_COLORS[item.rarity] + '50' }}
                        >
                          <span className="text-lg">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate" style={{ color: RARITY_COLORS[item.rarity] }}>
                              {item.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {SLOT_RU[item.slot || ''] || ITEM_TYPE_RU[item.type]}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {Object.entries(stats).map(([k, v]) => (
                              <Badge key={k} variant="outline" className="text-[10px] h-4 px-1">
                                {k === 'attack' ? 'АТК' : k === 'defense' ? 'ЗАЩ' : k === 'hp' ? 'HP' : k === 'mp' ? 'MP' : k} +{v}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Death state */}
            {player?.hp !== undefined && player.hp <= 0 && (
              <Card className="border-destructive/50 bg-destructive/10">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl mb-2">💀</div>
                  <p className="text-sm text-destructive font-bold">Вы погибли!</p>
                  <p className="text-xs text-muted-foreground mt-1">Вернитесь в таверну для восстановления</p>
                  <Button
                    className="mt-3"
                    onClick={() => { handleTravel('town').then(() => handleRest()); }}
                    disabled={loading}
                  >
                    🏠 Вернуться в таверну
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ===== COMBAT TAB ===== */}
          <TabsContent value="combat" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
            {player?.inCombat && enemy ? (
              <>
                {/* Enemy card */}
                <Card className={`border-destructive/50 ${shaking ? 'animate-shake' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{enemy.icon}</span>
                        <div>
                          <h3 className="font-bold text-sm" style={{ color: enemy.isBoss ? '#f59e0b' : '#ef4444' }}>
                            {enemy.nameRu}
                            {enemy.isBoss && <Badge className="ml-1 text-[10px] h-4 bg-gold/20 text-gold">БОСС</Badge>}
                          </h3>
                          <div className="text-[10px] text-muted-foreground">
                            AC {enemy.ac} • АТК +{enemy.attack} • Урон {enemy.damage}
                          </div>
                        </div>
                      </div>
                      {/* Floating damage numbers */}
                      <div className="relative">
                        {floatingDamage.map(fd => (
                          <div key={fd.id} className="animate-float-up absolute -top-4 right-0 font-bold text-lg" style={{ color: fd.color }}>
                            {fd.text}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Enemy HP bar */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-hp font-bold w-6">HP</span>
                      <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-hp rounded-full transition-all duration-500"
                          style={{ width: `${player.enemyMaxHp ? Math.max(0, (player.enemyHp! / player.enemyMaxHp) * 100) : 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {player.enemyHp}/{player.enemyMaxHp}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Combat log */}
                <Card className="border-border">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm">Журнал боя</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <ScrollArea className="h-32">
                      <div className="space-y-1">
                        {combatLog.map((entry, i) => (
                          <p key={i} className={`text-xs leading-relaxed ${
                            entry.text.includes('критический') || entry.text.includes('КРИТ') ? 'text-gold font-bold' :
                            entry.text.includes('повержен') || entry.text.includes('Победа') ? 'text-uncommon font-bold' :
                            entry.text.includes('погибли') ? 'text-destructive font-bold' :
                            entry.text.includes('атакует') && entry.text.includes('Урон') ? 'text-destructive' :
                            entry.text.includes('Вы атакуете') || entry.text.includes('заклинание') ? 'text-primary' :
                            'text-muted-foreground'
                          }`}>
                            {entry.text}
                          </p>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Combat actions */}
                <Card className="border-border">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        className="h-12"
                        onClick={() => handleCombatAction('attack')}
                        disabled={loading}
                      >
                        ⚔️ Атака
                      </Button>
                      <Button
                        className="h-12 bg-mp/80 hover:bg-mp"
                        onClick={() => handleCombatAction('spell')}
                        disabled={loading || (player?.mp ?? 0) < 3}
                      >
                        🔮 Заклинание
                        <span className="text-[10px] ml-1 opacity-70">3 MP</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-12 border-border"
                        onClick={() => handleCombatAction('flee')}
                        disabled={loading}
                      >
                        🏃 Побег
                      </Button>

                      {/* Use item in combat */}
                      {player.inventory.filter(i => i.type === 'consumable').length > 0 && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">Использовать предмет:</p>
                          <ScrollArea className="max-h-24">
                            <div className="flex gap-1 flex-wrap">
                              {player.inventory.filter(i => i.type === 'consumable').map(item => {
                                const stats = parseStats(item.stats);
                                return (
                                  <Button
                                    key={item.id}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs border-border"
                                    onClick={() => handleCombatAction('use_item', item.itemId)}
                                    disabled={loading}
                                  >
                                    {item.icon} {item.name} {item.quantity > 1 ? `x${item.quantity}` : ''}
                                  </Button>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              /* No combat */
              <Card className="border-border">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-3">⚔️</div>
                  <h3 className="font-bold mb-1">Нет активного боя</h3>
                  <p className="text-sm text-muted-foreground mb-4">Исследуйте локацию, чтобы найти врагов</p>
                  <Button onClick={() => setTab('overview')} variant="outline" className="border-border">
                    🏠 На главную
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ===== MAP TAB ===== */}
          <TabsContent value="map" className="flex-1 overflow-y-auto p-4 space-y-3 m-0">
            <div className="text-center mb-2">
              <h3 className="font-bold text-sm">Карта Проклятых Глубин</h3>
              <p className="text-xs text-muted-foreground">Выберите локацию для путешествия</p>
            </div>

            {LOCATIONS.map(loc => {
              const isCurrentLocation = player?.locationId === loc.id;
              const isConnected = location?.connections.includes(loc.id);
              const canTravel = isConnected && !player?.inCombat && loc.level <= (player?.level ?? 0) + 2;
              const levelLocked = loc.level > (player?.level ?? 0) + 2;

              return (
                <Card
                  key={loc.id}
                  className={`border-border transition-all ${
                    isCurrentLocation ? 'border-primary bg-primary/10 animate-glow' :
                    canTravel ? 'hover:border-primary/50 cursor-pointer' :
                    'opacity-60'
                  }`}
                  onClick={() => canTravel && !isCurrentLocation ? handleTravel(loc.id) : undefined}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{loc.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm truncate">{loc.nameRu}</h4>
                          {isCurrentLocation && (
                            <Badge className="text-[10px] h-4 bg-primary/20 text-primary">Вы здесь</Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{loc.descriptionRu}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] h-4 px-1">
                            Ур. {loc.level}+
                          </Badge>
                          {levelLocked && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 text-destructive border-destructive/30">
                              🔒 Ур. {loc.level - 2}+
                            </Badge>
                          )}
                          {loc.connections.map(cId => {
                            const cLoc = LOCATIONS.find(l => l.id === cId);
                            return cLoc ? (
                              <span key={cId} className="text-[10px] text-muted-foreground">→ {cLoc.icon}</span>
                            ) : null;
                          })}
                        </div>
                      </div>
                      {!isCurrentLocation && canTravel && (
                        <Button size="sm" className="h-8 text-xs shrink-0" disabled={loading}>
                          🚶
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* ===== INVENTORY TAB ===== */}
          <TabsContent value="inventory" className="flex-1 overflow-y-auto p-4 space-y-3 m-0">
            {/* Equipped section */}
            <Card className="border-border">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm">Экипировано</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                {player?.inventory.filter(i => i.equipped).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">Ничего не экипировано</p>
                ) : (
                  <div className="space-y-2">
                    {player?.inventory.filter(i => i.equipped).map(item => {
                      const stats = parseStats(item.stats);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 border animate-pulse-border"
                          style={{ borderColor: RARITY_COLORS[item.rarity] + '50' }}
                        >
                          <span className="text-lg">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate" style={{ color: RARITY_COLORS[item.rarity] }}>
                              {item.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {SLOT_RU[item.slot || ''] || ITEM_TYPE_RU[item.type]} • {RARITY_NAMES_RU[item.rarity]}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {Object.entries(stats).map(([k, v]) => (
                              <span key={k} className="text-[10px] text-uncommon">+{v} {k === 'attack' ? '⚔️' : k === 'defense' ? '🛡️' : k === 'hp' ? '❤️' : k === 'mp' ? '💧' : ''}</span>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] px-2 border-border ml-1"
                              onClick={() => handleEquip(item.id)}
                              disabled={loading}
                            >
                              Снять
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* All items section */}
            <Card className="border-border">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm">
                  Инвентарь ({player?.inventory.filter(i => !i.equipped).length || 0} предметов)
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                {player?.inventory.filter(i => !i.equipped).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">Инвентарь пуст</p>
                ) : (
                  <ScrollArea className="max-h-96">
                    <div className="space-y-2 pr-2">
                      {player?.inventory.filter(i => !i.equipped).map(item => {
                        const stats = parseStats(item.stats);
                        const canEquip = ['weapon', 'armor', 'accessory'].includes(item.type);
                        const canUse = item.type === 'consumable';
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 p-2 rounded-lg bg-secondary/20 border transition-all hover:bg-secondary/40"
                            style={{ borderColor: RARITY_COLORS[item.rarity] + '30' }}
                          >
                            <span className="text-lg">{item.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate" style={{ color: RARITY_COLORS[item.rarity] }}>
                                {item.name} {item.quantity > 1 ? `x${item.quantity}` : ''}
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-muted-foreground">
                                  {ITEM_TYPE_RU[item.type]} • {RARITY_NAMES_RU[item.rarity]}
                                </span>
                              </div>
                              {Object.keys(stats).length > 0 && (
                                <div className="flex gap-1 mt-0.5 flex-wrap">
                                  {Object.entries(stats).map(([k, v]) => (
                                    <Badge key={k} variant="outline" className="text-[9px] h-4 px-1">
                                      {k === 'attack' ? 'АТК' : k === 'defense' ? 'ЗАЩ' : k === 'healHp' ? 'ЛечHP' : k === 'healMp' ? 'ЛечMP' : k === 'damage' ? 'Урон' : k} +{v}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              {canEquip && (
                                <Button
                                  size="sm"
                                  className="h-6 text-[10px] px-2"
                                  onClick={() => handleEquip(item.id)}
                                  disabled={loading}
                                >
                                  Надеть
                                </Button>
                              )}
                              {canUse && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px] px-2 border-border"
                                  onClick={() => handleUseItem(item.id)}
                                  disabled={loading}
                                >
                                  Исп.
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== QUESTS TAB ===== */}
          <TabsContent value="quests" className="flex-1 overflow-y-auto p-4 space-y-3 m-0">
            <div className="text-center mb-2">
              <h3 className="font-bold text-sm">Квесты</h3>
              <p className="text-xs text-muted-foreground">Выполняйте задания для наград</p>
            </div>

            {player?.quests.length === 0 ? (
              <Card className="border-border">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl mb-2">📜</div>
                  <p className="text-sm text-muted-foreground">Нет активных квестов</p>
                  <p className="text-xs text-muted-foreground mt-1">Исследуйте подземелья, чтобы получить задания</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="max-h-[70vh]">
                <div className="space-y-2 pr-2">
                  {player?.quests.map(quest => {
                    const reward = parseStats(quest.reward);
                    const progressPercent = Math.min(100, (quest.progress / quest.target) * 100);
                    return (
                      <Card
                        key={quest.id}
                        className={`border-border ${
                          quest.claimed ? 'opacity-50' :
                          quest.completed ? 'border-gold/50 bg-gold/5' : ''
                        }`}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2">
                            <span className="text-xl mt-0.5">
                              {quest.type === 'daily' ? '📅' : quest.type === 'kill' ? '⚔️' : quest.type === 'explore' ? '🗺️' : quest.type === 'craft' ? '⚒️' : '📜'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm">{quest.title}</h4>
                              <p className="text-[10px] text-muted-foreground">{quest.description}</p>

                              {/* Progress bar */}
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      quest.completed ? 'bg-gold' : 'bg-primary'
                                    }`}
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  {quest.progress}/{quest.target}
                                </span>
                              </div>

                              {/* Reward */}
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-[10px] text-muted-foreground">Награда:</span>
                                {reward.xp > 0 && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1 text-xp">+{reward.xp} XP</Badge>
                                )}
                                {reward.gold > 0 && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1 text-gold">+{reward.gold} 💰</Badge>
                                )}
                                {quest.claimed && (
                                  <Badge className="text-[10px] h-4 bg-muted text-muted-foreground">Получено</Badge>
                                )}
                              </div>

                              {/* Claim button */}
                              {quest.completed && !quest.claimed && (
                                <Button
                                  size="sm"
                                  className="mt-2 h-7 text-xs bg-gold/80 hover:bg-gold text-background"
                                  onClick={() => handleClaimQuest(quest.id)}
                                  disabled={loading}
                                >
                                  🎁 Получить награду
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* ===== CRAFT TAB ===== */}
          <TabsContent value="craft" className="flex-1 overflow-y-auto p-4 space-y-3 m-0">
            <div className="text-center mb-2">
              <h3 className="font-bold text-sm">⚒️ Кузница</h3>
              <p className="text-xs text-muted-foreground">Создавайте предметы из материалов</p>
            </div>

            {/* Current materials */}
            <Card className="border-border">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm">Ваши материалы</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                {player?.inventory.filter(i => i.type === 'material').length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center">Нет материалов</p>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {player?.inventory.filter(i => i.type === 'material').map(item => (
                      <div key={item.id} className="flex items-center gap-1 bg-secondary/30 rounded px-2 py-1">
                        <span className="text-sm">{item.icon}</span>
                        <span className="text-xs" style={{ color: RARITY_COLORS[item.rarity] }}>
                          {item.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recipes */}
            <ScrollArea className="max-h-[55vh]">
              <div className="space-y-2 pr-2">
                {CRAFTING_RECIPES.map(recipe => {
                  const canCraft = hasMaterials(recipe);
                  const resultItem = ITEMS.find(i => i.id === recipe.result.itemId);

                  return (
                    <Card key={recipe.id} className={`border-border ${canCraft ? '' : 'opacity-60'}`}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{recipe.icon}</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm">{recipe.nameRu}</h4>

                            {/* Materials needed */}
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {recipe.materials.map(mat => {
                                const matItem = ITEMS.find(i => i.id === mat.itemId);
                                const invItem = player?.inventory.find(i => i.itemId === mat.itemId);
                                const hasEnough = (invItem?.quantity || 0) >= mat.quantity;
                                return (
                                  <Badge
                                    key={mat.itemId}
                                    variant="outline"
                                    className={`text-[10px] h-5 px-1 ${hasEnough ? 'text-uncommon border-uncommon/30' : 'text-destructive border-destructive/30'}`}
                                  >
                                    {matItem?.icon} {matItem?.nameRu} x{mat.quantity}
                                    {!hasEnough && ` (${invItem?.quantity || 0})`}
                                  </Badge>
                                );
                              })}
                            </div>

                            {/* Result */}
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] text-muted-foreground">Результат:</span>
                              {resultItem && (
                                <span className="text-xs font-medium" style={{ color: RARITY_COLORS[resultItem.rarity] }}>
                                  {resultItem.icon} {resultItem.nameRu}
                                  {recipe.result.quantity > 1 ? ` x${recipe.result.quantity}` : ''}
                                </span>
                              )}
                            </div>

                            {/* Craft button */}
                            <Button
                              size="sm"
                              className="mt-2 h-7 text-xs"
                              disabled={!canCraft || loading}
                              onClick={() => handleCraft(recipe.id)}
                            >
                              ⚒️ Создать
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </main>

      {/* Bottom safe area for iOS */}
      <div className="h-safe-area-inset-bottom" />
    </div>
  );
}
