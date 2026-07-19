import { useCallback, useRef, useState } from 'react';
import { ENEMIES } from '@/lib/game-data';
import { ApiCallFn, CombatLogEntry, CheckRollResultView, ExplorationEvent, GameMessage, GameTab, PlayerData, TrialJunctionView } from '@/lib/game-types';

interface UseCombatStateArgs {
  apiCall: ApiCallFn;
  player: PlayerData | null;
  setLoading: (loading: boolean) => void;
  onPlayerUpdate: (player: PlayerData) => void;
  onMessage: (message: GameMessage) => void;
  onNavigateTab: (tab: GameTab) => void;
}

/** Ядро сольного боевого цикла — исследование локации, вход в данж/Разлом/испытание, сам бой
 * (атака/способность/защита/бегство), плюс UI-транзиенты (тряска экрана, летящий урон, анимация
 * левел-апа, показ броска d20). Party-бой (lib/combat/party-combat-engine.ts) — отдельная
 * система, сюда не входит: свой файл page.tsx-стейта, свои роуты. Извлечено из page.tsx per
 * CLAUDE.md (аудит 1.4, A1, 3-й и последний инкремент после useSocialFeatures/
 * usePremiumFeatures) — тот же fetch/эффект/обработчик код, что и раньше. */
export function useCombatState({ apiCall, player, setLoading, onPlayerUpdate, onMessage, onNavigateTab }: UseCombatStateArgs) {
  const [combatLog, setCombatLog] = useState<CombatLogEntry[]>([]);
  const [shaking, setShaking] = useState(false);
  const [enemyHitFlash, setEnemyHitFlash] = useState(false);
  const [abilityCastGlow, setAbilityCastGlow] = useState(false);
  const [levelUpAnimation, setLevelUpAnimation] = useState(false);
  const [diceRoll, setDiceRoll] = useState<CheckRollResultView | null>(null);
  const [floatingDamage, setFloatingDamage] = useState<{ id: number; text: string; color: string }[]>([]);
  const [explorationEvent, setExplorationEvent] = useState<ExplorationEvent | null>(null);
  const [trialJunction, setTrialJunction] = useState<TrialJunctionView | null>(null);
  const floatIdRef = useRef(0);

  const addFloatingDamage = useCallback((text: string, color: string) => {
    const id = ++floatIdRef.current;
    setFloatingDamage(prev => [...prev, { id, text, color }]);
    setTimeout(() => {
      setFloatingDamage(prev => prev.filter(f => f.id !== id));
    }, 1000);
  }, []);

  // Левел-ап случается не только в бою — квест (quests/claim) и ежедневная награда (daily)
  // считают его по тем же формулам (см. соответствующие route.ts), поэтому page.tsx вызывает
  // это напрямую из handleClaimQuest/handleDaily, а не только изнутри этого хука.
  const triggerLevelUp = useCallback(() => {
    setLevelUpAnimation(true);
    setTimeout(() => setLevelUpAnimation(false), 1500);
  }, []);

  const handleExplore = useCallback(async () => {
    if (!player || player.inCombat) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/explore', 'POST');
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
      } else if (data.type === 'combat') {
        onPlayerUpdate(data.player as unknown as PlayerData);
        setCombatLog([{ text: data.message as string, turn: 0 }]);
        onNavigateTab('combat');
        onMessage({ text: data.message as string, type: 'info' });
      } else if (data.type === 'safe') {
        onPlayerUpdate(data.player as unknown as PlayerData);
        addFloatingDamage(`+${data.goldFound} 💰`, '#fbbf24');
        onMessage({ text: data.message as string, type: 'success' });
      } else if (data.type === 'explore') {
        onPlayerUpdate(data.player as unknown as PlayerData);
        addFloatingDamage(`+${data.goldFound} 💰`, '#fbbf24');
        onMessage({ text: data.message as string, type: 'success' });
      } else if (data.type === 'event') {
        onPlayerUpdate(data.player as unknown as PlayerData);
        setExplorationEvent(data.event as unknown as ExplorationEvent);
      }
    } catch {
      onMessage({ text: 'Ошибка исследования', type: 'error' });
    }
    setLoading(false);
  }, [player, apiCall, onMessage, onPlayerUpdate, onNavigateTab, setLoading, addFloatingDamage]);

  const handleEventChoice = useCallback(async (choiceId: string) => {
    if (!explorationEvent) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/explore/event', 'POST', { eventId: explorationEvent.id, choiceId });
      setExplorationEvent(null);
      if (data.checkResult) {
        setDiceRoll(data.checkResult as unknown as CheckRollResultView);
        setTimeout(() => setDiceRoll(null), 1600);
      }
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
      } else if (data.type === 'combat') {
        onPlayerUpdate(data.player as unknown as PlayerData);
        setCombatLog([{ text: data.message as string, turn: 0 }]);
        onNavigateTab('combat');
        onMessage({ text: data.message as string, type: 'info' });
      } else {
        onPlayerUpdate(data.player as unknown as PlayerData);
        const goldDelta = data.goldDelta as number;
        if (goldDelta > 0) addFloatingDamage(`+${goldDelta} 💰`, '#fbbf24');
        else if (goldDelta < 0) addFloatingDamage(`${goldDelta} 💰`, '#ef4444');
        onMessage({ text: data.message as string, type: data.negative ? 'error' : 'success' });
        if (data.leveledUp) {
          triggerLevelUp();
        }
      }
    } catch {
      setExplorationEvent(null);
      onMessage({ text: 'Ошибка события', type: 'error' });
    }
    setLoading(false);
  }, [explorationEvent, apiCall, onMessage, onPlayerUpdate, onNavigateTab, setLoading, addFloatingDamage, triggerLevelUp]);

  const handleStartDungeon = useCallback(async (dungeonId: string, heatLevel: number) => {
    if (!player || player.inCombat) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/dungeon/start', 'POST', { dungeonId, heatLevel });
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
      } else {
        onPlayerUpdate(data.player as unknown as PlayerData);
        setCombatLog([{ text: data.message as string, turn: 0 }]);
        onNavigateTab('combat');
        onMessage({ text: data.message as string, type: 'info' });
      }
    } catch {
      onMessage({ text: 'Ошибка входа в данж', type: 'error' });
    }
    setLoading(false);
  }, [player, apiCall, onMessage, onPlayerUpdate, onNavigateTab, setLoading]);

  const handleStartAbyss = useCallback(async () => {
    if (!player || player.inCombat) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/abyss/start', 'POST', {});
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
      } else {
        onPlayerUpdate(data.player as unknown as PlayerData);
        setCombatLog([{ text: data.message as string, turn: 0 }]);
        onNavigateTab('combat');
        onMessage({ text: data.message as string, type: 'info' });
      }
    } catch {
      onMessage({ text: 'Ошибка спуска в Разлом', type: 'error' });
    }
    setLoading(false);
  }, [player, apiCall, onMessage, onPlayerUpdate, onNavigateTab, setLoading]);

  // ===== TRIALS (lib/combat/trials.ts) — ветвящийся аналог данжей, см. combat/action.ts trial-ветку =====
  const handleStartTrial = useCallback(async (trialId: string) => {
    if (!player || player.inCombat) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/trial/start', 'POST', { trialId });
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
      } else {
        onPlayerUpdate(data.player as unknown as PlayerData);
        setTrialJunction((data.trialJunction as unknown as TrialJunctionView) ?? null);
        onMessage({ text: data.message as string, type: 'info' });
      }
    } catch {
      onMessage({ text: 'Ошибка входа в испытание', type: 'error' });
    }
    setLoading(false);
  }, [player, apiCall, onMessage, onPlayerUpdate, setLoading]);

  const handleTrialChoose = useCallback(async (direction: 'left' | 'right') => {
    if (!trialJunction) return;
    setLoading(true);
    try {
      const data = await apiCall('/api/trial/choose', 'POST', { direction });
      setTrialJunction(null);
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
      } else if (data.type === 'combat') {
        onPlayerUpdate(data.player as unknown as PlayerData);
        setCombatLog([{ text: data.message as string, turn: 0 }]);
        onNavigateTab('combat');
        onMessage({ text: data.message as string, type: 'info' });
      } else if (data.type === 'junction') {
        onPlayerUpdate(data.player as unknown as PlayerData);
        const goldDelta = data.goldDelta as number;
        if (goldDelta > 0) addFloatingDamage(`+${goldDelta} 💰`, '#fbbf24');
        onMessage({ text: data.message as string, type: 'success' });
        setTrialJunction((data.trialJunction as unknown as TrialJunctionView) ?? null);
      }
    } catch {
      setTrialJunction(null);
      onMessage({ text: 'Ошибка испытания', type: 'error' });
    }
    setLoading(false);
  }, [trialJunction, apiCall, onMessage, onPlayerUpdate, onNavigateTab, setLoading, addFloatingDamage]);

  const handleCombatAction = useCallback(async (action: string, itemId?: string, abilityId?: string) => {
    if (!player || !player.inCombat) return;
    setLoading(true);
    setShaking(true);
    setTimeout(() => setShaking(false), 300);
    // "Луч" на способность показываем сразу по нажатию — это визуализация каста, а не результата,
    // так что не ждём ответа сервера (иначе на медленной сети анимация будет с заметной задержкой).
    if (action === 'ability') {
      setAbilityCastGlow(true);
      setTimeout(() => setAbilityCastGlow(false), 700);
    }
    const prevEnemyHp = player.enemyHp ?? null;
    try {
      const body: Record<string, string> = { action };
      if (itemId) body.itemId = itemId;
      if (abilityId) body.abilityId = abilityId;
      const data = await apiCall('/api/combat/action', 'POST', body);

      if (data.combatLog) {
        setCombatLog(prev => [...prev, ...(data.combatLog as CombatLogEntry[])]);
      }

      if (data.player) {
        const updatedPlayer = data.player as unknown as PlayerData;
        // Реакция врага/босса на попадание — сравниваем HP до и после хода, а не парсим текст
        // журнала боя, чтобы не зависеть от формулировок (и работать одинаково для атаки,
        // способности и урона от предметов).
        const newEnemyHp = updatedPlayer.enemyHp ?? null;
        if (prevEnemyHp !== null && newEnemyHp !== null && newEnemyHp < prevEnemyHp) {
          setEnemyHitFlash(true);
          setTimeout(() => setEnemyHitFlash(false), 400);
        }
        onPlayerUpdate(updatedPlayer);
      }

      if (data.playerWon) {
        addFloatingDamage(`+${data.xpGained} XP`, '#60a5fa');
        addFloatingDamage(`+${data.goldGained} 💰`, '#fbbf24');
        if (data.dungeonCompleted) {
          onMessage({ text: `🏆 Данж пройден! +${data.xpGained} XP, +${data.goldGained} золота`, type: 'success' });
        } else if (data.trialCompleted) {
          onMessage({ text: `🏆 Испытание пройдено! +${data.xpGained} XP, +${data.goldGained} золота`, type: 'success' });
        } else if (data.dungeonRoomCleared) {
          onMessage({ text: `Комната пройдена! Следующий враг уже здесь...`, type: 'success' });
        } else if (data.trialJunction) {
          setTrialJunction(data.trialJunction as unknown as TrialJunctionView);
          onMessage({ text: 'Комната пройдена! Впереди развилка.', type: 'success' });
        } else {
          onMessage({ text: `Победа! +${data.xpGained} XP, +${data.goldGained} золота`, type: 'success' });
        }
      } else if (data.playerFled) {
        onMessage({ text: 'Вы сбежали из боя!', type: 'info' });
        onNavigateTab('overview');
      }

      if (data.combatOver && !data.playerWon && !data.playerFled) {
        onMessage({ text: 'Вы погибли... Вернитесь в таверну.', type: 'error' });
        onNavigateTab('overview');
      }

      if (data.leveledUp) {
        triggerLevelUp();
        onMessage({ text: `УРОВЕНЬ ПОВЫШЕН! Теперь уровень ${(data.player as unknown as PlayerData).level}!`, type: 'success' });
      }
    } catch {
      onMessage({ text: 'Ошибка боя', type: 'error' });
    }
    setLoading(false);
  }, [player, apiCall, onMessage, onPlayerUpdate, onNavigateTab, setLoading, addFloatingDamage, triggerLevelUp]);

  const enemy = player?.enemyId ? (ENEMIES.find(e => e.id === player.enemyId) ?? null) : null;

  return {
    combatLog, setCombatLog, shaking, enemyHitFlash, abilityCastGlow, levelUpAnimation, diceRoll, floatingDamage,
    explorationEvent, trialJunction, enemy,
    addFloatingDamage, triggerLevelUp, handleExplore, handleEventChoice, handleStartDungeon, handleStartAbyss,
    handleStartTrial, handleTrialChoose, handleCombatAction,
  };
}
