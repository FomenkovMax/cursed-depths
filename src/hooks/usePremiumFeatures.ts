import { useCallback, useEffect, useState } from 'react';
import {
  GameMessage,
  GameScreen,
  GameTab,
  PlayerData,
  PremiumShopStateView,
  PetsStateView,
  TitlesStateView,
  BattlePassStateView,
  WaypointsStateView,
  ExpeditionStateView,
  BountyStateView,
  BountyHuntResultView,
  FortuneSpinResultView,
  TelegramGlobal,
} from '@/lib/game-types';

interface UsePremiumFeaturesArgs {
  apiCall: (url: string, method?: string, body?: unknown) => Promise<Record<string, unknown> & { error?: string; message?: string }>;
  telegramIdRef: React.RefObject<string>;
  screen: GameScreen;
  tab: GameTab;
  player: PlayerData | null;
  onPlayerUpdate: (player: PlayerData) => void;
  onMessage: (message: GameMessage) => void;
  refreshPlayer: () => Promise<void>;
}

/** Восемь премиум/полу-премиум механик, живущих на вкладках "Премиум"/"Карта"/"Обзор" —
 * магазин Осколков (+колесо фортуны +смена расы), питомцы, титулы, боевой пропуск, быстрое
 * перемещение, экспедиции, доска контрактов (lib/premium/*.ts, lib/economy/pets.ts,
 * lib/social/titles.ts, lib/economy/bounty-board.ts). Извлечено из page.tsx per CLAUDE.md
 * (аудит 1.4, A1, 2-й инкремент после useSocialFeatures) — все fetch/эффект/обработчик
 * остались теми же, просто перенесены в хук. */
export function usePremiumFeatures({
  apiCall, telegramIdRef, screen, tab, player, onPlayerUpdate, onMessage, refreshPlayer,
}: UsePremiumFeaturesArgs) {
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

  // ===== PREMIUM SHOP (Осколки Короны за Telegram Stars — lib/premium/premium-shop.ts) =====
  const refreshPremiumState = useCallback(() => {
    setPremiumLoading(true);
    apiCall('/api/shop/premium/state')
      .then(data => { if (data.shardPacks) setPremiumState(data as unknown as PremiumShopStateView); })
      .catch(() => onMessage({ text: 'Не удалось загрузить магазин', type: 'error' }))
      .finally(() => setPremiumLoading(false));
  }, [apiCall, onMessage]);

  useEffect(() => {
    if (tab !== 'premium' || !telegramIdRef.current) return;
    refreshPremiumState();
  }, [tab, refreshPremiumState, telegramIdRef]);

  // Баланс Осколков Короны в GameHeader должен быть виден сразу после входа, а не только
  // после первого открытия вкладки "Премиум" — отдельный триггер на screen==='game'.
  useEffect(() => {
    if (screen !== 'game' || !telegramIdRef.current) return;
    refreshPremiumState();
  }, [screen, refreshPremiumState, telegramIdRef]);

  // ===== ПИТОМЦЫ-КОМПАНЬОНЫ (lib/economy/pets.ts) — тот же паттерн загрузки, что и премиум-магазин:
  // сразу при входе (для activePetId в GameHeader/OverviewTab) и при каждом открытии вкладки. =====
  const refreshPetsState = useCallback(() => {
    setPetsLoading(true);
    apiCall('/api/pets/state')
      .then(data => { if (data.catalog) setPetsState(data as unknown as PetsStateView); })
      .catch(() => onMessage({ text: 'Не удалось загрузить питомцев', type: 'error' }))
      .finally(() => setPetsLoading(false));
  }, [apiCall, onMessage]);

  useEffect(() => {
    if (tab !== 'premium' || !telegramIdRef.current) return;
    refreshPetsState();
  }, [tab, refreshPetsState, telegramIdRef]);

  useEffect(() => {
    if (screen !== 'game' || !telegramIdRef.current) return;
    refreshPetsState();
  }, [screen, refreshPetsState, telegramIdRef]);

  const handleBuyPet = useCallback(async (petId: string) => {
    if (!player) return;
    setBuyingPetId(petId);
    try {
      const data = await apiCall('/api/pets/buy', 'POST', { petId });
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
      } else {
        onPlayerUpdate(data.player as unknown as PlayerData);
        onMessage({ text: data.message ?? '', type: 'success' });
        refreshPetsState();
      }
    } catch {
      onMessage({ text: 'Ошибка покупки питомца', type: 'error' });
    } finally {
      setBuyingPetId(null);
    }
  }, [player, apiCall, onMessage, onPlayerUpdate, refreshPetsState]);

  const handleActivatePet = useCallback(async (petId: string | null) => {
    if (!player) return;
    setActivatingPetId(petId ?? 'none');
    try {
      const data = await apiCall('/api/pets/activate', 'POST', { petId });
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
      } else {
        onPlayerUpdate(data.player as unknown as PlayerData);
        refreshPetsState();
      }
    } catch {
      onMessage({ text: 'Ошибка активации питомца', type: 'error' });
    } finally {
      setActivatingPetId(null);
    }
  }, [player, apiCall, onMessage, onPlayerUpdate, refreshPetsState]);

  // ===== ТИТУЛЫ (lib/social/titles.ts) — тот же паттерн загрузки, что питомцы: сразу при входе (для
  // GameHeader) и при каждом открытии премиум-вкладки. Премиум-эксклюзив целиком — без него
  // /api/titles/state отдаёт пустой каталог. =====
  const refreshTitlesState = useCallback(() => {
    setTitlesLoading(true);
    apiCall('/api/titles/state')
      .then(data => { if (data.premiumActive !== undefined) setTitlesState(data as unknown as TitlesStateView); })
      .catch(() => onMessage({ text: 'Не удалось загрузить титулы', type: 'error' }))
      .finally(() => setTitlesLoading(false));
  }, [apiCall, onMessage]);

  useEffect(() => {
    if (tab !== 'premium' || !telegramIdRef.current) return;
    refreshTitlesState();
  }, [tab, refreshTitlesState, telegramIdRef]);

  useEffect(() => {
    if (screen !== 'game' || !telegramIdRef.current) return;
    refreshTitlesState();
  }, [screen, refreshTitlesState, telegramIdRef]);

  const handleEquipTitle = useCallback(async (titleId: string | null) => {
    if (!player) return;
    setEquippingTitleId(titleId ?? 'none');
    try {
      const data = await apiCall('/api/titles/equip', 'POST', { titleId });
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
      } else {
        onPlayerUpdate(data.player as unknown as PlayerData);
        refreshTitlesState();
      }
    } catch {
      onMessage({ text: 'Ошибка экипировки титула', type: 'error' });
    } finally {
      setEquippingTitleId(null);
    }
  }, [player, apiCall, onMessage, onPlayerUpdate, refreshTitlesState]);

  // ===== БОЕВОЙ ПРОПУСК (lib/premium/battle-pass.ts) — тот же паттерн загрузки, что титулы: только
  // на премиум-вкладке, полный премиум-лок. =====
  const refreshBattlePassState = useCallback(() => {
    setBattlePassLoading(true);
    apiCall('/api/battlepass/state')
      .then(data => { if (data.premiumActive !== undefined) setBattlePassState(data as unknown as BattlePassStateView); })
      .catch(() => onMessage({ text: 'Не удалось загрузить Боевой пропуск', type: 'error' }))
      .finally(() => setBattlePassLoading(false));
  }, [apiCall, onMessage]);

  useEffect(() => {
    if (tab !== 'premium' || !telegramIdRef.current) return;
    refreshBattlePassState();
  }, [tab, refreshBattlePassState, telegramIdRef]);

  // Кошелёк (OverviewTab) показывает очки Боевого пропуска сразу на первом экране — та же
  // подгрузка при входе, что уже есть у premiumState/petsState, не только при заходе на вкладку.
  useEffect(() => {
    if (screen !== 'game' || !telegramIdRef.current) return;
    refreshBattlePassState();
  }, [screen, refreshBattlePassState, telegramIdRef]);

  const handleClaimTier = useCallback(async (tier: number) => {
    if (!player) return;
    setClaimingTier(tier);
    try {
      const data = await apiCall('/api/battlepass/claim', 'POST', { tier });
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
      } else {
        onMessage({ text: data.message ?? '', type: 'success' });
        await refreshPlayer();
        refreshBattlePassState();
      }
    } catch {
      onMessage({ text: 'Ошибка получения награды', type: 'error' });
    } finally {
      setClaimingTier(null);
    }
  }, [player, apiCall, onMessage, refreshPlayer, refreshBattlePassState]);

  // ===== БЫСТРОЕ ПЕРЕМЕЩЕНИЕ (lib/economy/fast-travel.ts) — премиум-эксклюзивный телепорт между уже
  // посещёнными локациями, живёт на вкладке "Карта". =====
  const refreshWaypointsState = useCallback(() => {
    setWaypointsLoading(true);
    apiCall('/api/travel/waypoints')
      .then(data => { if (data.premiumActive !== undefined) setWaypointsState(data as unknown as WaypointsStateView); })
      .catch(() => onMessage({ text: 'Не удалось загрузить точки телепорта', type: 'error' }))
      .finally(() => setWaypointsLoading(false));
  }, [apiCall, onMessage]);

  useEffect(() => {
    if (tab !== 'map' || !telegramIdRef.current) return;
    refreshWaypointsState();
  }, [tab, refreshWaypointsState, telegramIdRef]);

  const handleFastTravel = useCallback(async (locationId: string) => {
    if (!player) return;
    setFastTravellingTo(locationId);
    try {
      const data = await apiCall('/api/travel/fast', 'POST', { locationId });
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
      } else {
        onMessage({ text: data.message ?? '', type: 'success' });
        onPlayerUpdate(data.player as unknown as PlayerData);
        refreshWaypointsState();
      }
    } catch {
      onMessage({ text: 'Ошибка быстрого перемещения', type: 'error' });
    } finally {
      setFastTravellingTo(null);
    }
  }, [player, apiCall, onMessage, onPlayerUpdate, refreshWaypointsState]);

  // ===== ЭКСПЕДИЦИИ (lib/premium/expeditions.ts) — премиум-эксклюзивный офлайн-таймер, не блокирует
  // остальную игру. Тот же паттерн загрузки состояния, что и у премиум-магазина/питомцев. =====
  const refreshExpeditionState = useCallback(() => {
    setExpeditionLoading(true);
    apiCall('/api/expedition/state')
      .then(data => { if (data.tiers) setExpeditionState(data as unknown as ExpeditionStateView); })
      .catch(() => onMessage({ text: 'Не удалось загрузить экспедиции', type: 'error' }))
      .finally(() => setExpeditionLoading(false));
  }, [apiCall, onMessage]);

  useEffect(() => {
    if ((tab !== 'premium' && tab !== 'overview') || !telegramIdRef.current) return;
    refreshExpeditionState();
  }, [tab, refreshExpeditionState, telegramIdRef]);

  const handleStartExpedition = useCallback(async (tierId: string) => {
    if (!player) return;
    setStartingExpeditionId(tierId);
    try {
      const data = await apiCall('/api/expedition/start', 'POST', { tierId });
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
      } else {
        onPlayerUpdate(data.player as unknown as PlayerData);
        onMessage({ text: data.message ?? '', type: 'success' });
        refreshExpeditionState();
      }
    } catch {
      onMessage({ text: 'Ошибка отправки экспедиции', type: 'error' });
    } finally {
      setStartingExpeditionId(null);
    }
  }, [player, apiCall, onMessage, onPlayerUpdate, refreshExpeditionState]);

  const handleClaimExpedition = useCallback(async () => {
    if (!player) return;
    setClaimingExpedition(true);
    try {
      const data = await apiCall('/api/expedition/claim', 'POST', {});
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
      } else {
        onPlayerUpdate(data.player as unknown as PlayerData);
        onMessage({ text: data.message ?? '', type: 'success' });
        refreshExpeditionState();
      }
    } catch {
      onMessage({ text: 'Ошибка получения награды экспедиции', type: 'error' });
    } finally {
      setClaimingExpedition(false);
    }
  }, [player, apiCall, onMessage, onPlayerUpdate, refreshExpeditionState]);

  // ===== ДОСКА КОНТРАКТОВ (lib/economy/bounty-board.ts) — премиум-эксклюзивная ежедневная охота,
  // одна попытка в день, тот же паттерн загрузки состояния, что и у остального премиум-контента. =====
  const refreshBountyState = useCallback(() => {
    setBountyLoading(true);
    apiCall('/api/bounty/state')
      .then(data => { if (typeof data.premiumActive === 'boolean') setBountyState(data as unknown as BountyStateView); })
      .catch(() => onMessage({ text: 'Не удалось загрузить доску контрактов', type: 'error' }))
      .finally(() => setBountyLoading(false));
  }, [apiCall, onMessage]);

  useEffect(() => {
    if ((tab !== 'premium' && tab !== 'overview') || !telegramIdRef.current) return;
    refreshBountyState();
  }, [tab, refreshBountyState, telegramIdRef]);

  const handleHunt = useCallback(async (): Promise<BountyHuntResultView | null> => {
    if (!player) return null;
    setHunting(true);
    try {
      const data = await apiCall('/api/bounty/hunt', 'POST', {});
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
        return null;
      }
      onPlayerUpdate(data.player as unknown as PlayerData);
      refreshBountyState();
      return data as unknown as BountyHuntResultView;
    } catch {
      onMessage({ text: 'Ошибка охоты', type: 'error' });
      return null;
    } finally {
      setHunting(false);
    }
  }, [player, apiCall, onMessage, onPlayerUpdate, refreshBountyState]);

  const handleBuyShardPack = useCallback(async (packId: string) => {
    if (!player) return;
    setBuyingPackId(packId);
    try {
      const data = await apiCall('/api/shop/premium/invoice', 'POST', { packId });
      if (data.error || !data.invoiceUrl) {
        onMessage({ text: data.error || 'Не удалось создать счёт', type: 'error' });
        setBuyingPackId(null);
        return;
      }
      const win = typeof window !== 'undefined' ? (window as unknown as TelegramGlobal) : null;
      const tg = win?.Telegram?.WebApp;
      if (tg?.openInvoice) {
        tg.openInvoice(data.invoiceUrl as string, (status) => {
          setBuyingPackId(null);
          if (status === 'paid') {
            onMessage({ text: 'Оплата прошла! Осколки уже начислены.', type: 'success' });
            refreshPremiumState();
          } else if (status === 'failed') {
            onMessage({ text: 'Оплата не прошла.', type: 'error' });
          }
        });
      } else {
        // Вне Telegram WebView (напр. обычный браузер при разработке) — открываем ссылку напрямую.
        window.open(data.invoiceUrl as string, '_blank');
        setBuyingPackId(null);
      }
    } catch {
      onMessage({ text: 'Ошибка создания счёта', type: 'error' });
      setBuyingPackId(null);
    }
  }, [player, apiCall, onMessage, refreshPremiumState]);

  const handleRedeemSku = useCallback(async (skuId: string) => {
    if (!player) return;
    setPremiumLoading(true);
    try {
      const data = await apiCall('/api/shop/premium/redeem', 'POST', { skuId });
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
      } else {
        onPlayerUpdate(data.player as unknown as PlayerData);
        onMessage({ text: data.message ?? '', type: 'success' });
        refreshPremiumState();
      }
    } catch {
      onMessage({ text: 'Ошибка покупки', type: 'error' });
    } finally {
      setPremiumLoading(false);
    }
  }, [player, apiCall, onMessage, onPlayerUpdate, refreshPremiumState]);

  // Возвращает выпавший приз вызывающему (FortuneWheelVisual) — сама анимация довода колеса до
  // нужного сектора и показ результата после её завершения происходит уже внутри компонента,
  // здесь только сетевой запрос и обновление состояния игрока/валюты.
  const handleSpinFortuneWheel = useCallback(async (): Promise<FortuneSpinResultView | null> => {
    if (!player) return null;
    setSpinningWheel(true);
    try {
      const data = await apiCall('/api/fortune/spin', 'POST', {});
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
        return null;
      }
      onPlayerUpdate(data.player as unknown as PlayerData);
      refreshPremiumState();
      return data.reward as unknown as FortuneSpinResultView;
    } catch {
      onMessage({ text: 'Ошибка вращения колеса', type: 'error' });
      return null;
    } finally {
      setSpinningWheel(false);
    }
  }, [player, apiCall, onMessage, onPlayerUpdate, refreshPremiumState]);

  const handleChangeRace = useCallback(async (raceSlug: string, classSlug: string) => {
    if (!player) return;
    setChangingRace(true);
    try {
      const data = await apiCall('/api/player/change-race', 'POST', { raceSlug, classSlug });
      if (data.error) {
        onMessage({ text: data.error, type: 'error' });
      } else {
        onPlayerUpdate(data.player as unknown as PlayerData);
        onMessage({ text: data.message ?? '', type: 'success' });
        refreshPremiumState();
      }
    } catch {
      onMessage({ text: 'Ошибка смены расы', type: 'error' });
    } finally {
      setChangingRace(false);
    }
  }, [player, apiCall, onMessage, onPlayerUpdate, refreshPremiumState]);

  return {
    premiumState, premiumLoading, buyingPackId, spinningWheel, changingRace,
    handleBuyShardPack, handleRedeemSku, handleSpinFortuneWheel, handleChangeRace, refreshPremiumState,
    petsState, petsLoading, buyingPetId, activatingPetId, handleBuyPet, handleActivatePet,
    titlesState, titlesLoading, equippingTitleId, handleEquipTitle,
    battlePassState, battlePassLoading, claimingTier, handleClaimTier,
    waypointsState, waypointsLoading, fastTravellingTo, handleFastTravel,
    expeditionState, expeditionLoading, startingExpeditionId, claimingExpedition,
    handleStartExpedition, handleClaimExpedition,
    bountyState, bountyLoading, hunting, handleHunt,
  };
}
