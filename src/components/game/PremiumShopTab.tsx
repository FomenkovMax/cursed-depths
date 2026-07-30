import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PremiumShopStateView, PlayerData, FortuneSpinResultView, PetsStateView, ExpeditionStateView, BountyStateView, BountyHuntResultView, TitlesStateView, BattlePassStateView } from '@/lib/game-types';
import { FortuneWheelVisual } from '@/components/game/FortuneWheel';
import { RaceChangePanel } from '@/components/game/RaceChangePanel';
import { PetsPanel } from '@/components/game/PetsPanel';
import { ExpeditionPanel } from '@/components/game/ExpeditionPanel';
import { BountyBoardPanel } from '@/components/game/BountyBoardPanel';
import { TitlesPanel } from '@/components/game/TitlesPanel';
import { BattlePassPanel } from '@/components/game/BattlePassPanel';
import { TabBanner } from '@/components/game/TabBanner';
import { TAB_BANNER_IMAGES } from '@/lib/asset-icons';

interface PremiumShopTabProps {
  state: PremiumShopStateView | null;
  loading: boolean;
  buyingPackId: string | null;
  onBuyPack: (packId: string) => void;
  onRedeemSku: (skuId: string) => void;
  player: PlayerData | null;
  spinningWheel: boolean;
  onSpinWheel: () => Promise<FortuneSpinResultView | null>;
  changingRace: boolean;
  onChangeRace: (raceSlug: string, classSlug: string) => void;
  petsState: PetsStateView | null;
  petsLoading: boolean;
  buyingPetId: string | null;
  activatingPetId: string | null;
  onBuyPet: (petId: string) => void;
  onActivatePet: (petId: string | null) => void;
  expeditionState: ExpeditionStateView | null;
  expeditionLoading: boolean;
  startingExpeditionId: string | null;
  claimingExpedition: boolean;
  onStartExpedition: (tierId: string) => void;
  onClaimExpedition: () => void;
  bountyState: BountyStateView | null;
  bountyLoading: boolean;
  hunting: boolean;
  onHunt: () => Promise<BountyHuntResultView | null>;
  titlesState: TitlesStateView | null;
  titlesLoading: boolean;
  equippingTitleId: string | null;
  onEquipTitle: (titleId: string | null) => void;
  battlePassState: BattlePassStateView | null;
  battlePassLoading: boolean;
  claimingTier: number | null;
  onClaimTier: (tier: number) => void;
}

function formatPremiumUntil(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export function PremiumShopTab({
  state, loading, buyingPackId, onBuyPack, onRedeemSku,
  player, spinningWheel, onSpinWheel,
  changingRace, onChangeRace,
  petsState, petsLoading, buyingPetId, activatingPetId, onBuyPet, onActivatePet,
  expeditionState, expeditionLoading, startingExpeditionId, claimingExpedition, onStartExpedition, onClaimExpedition,
  bountyState, bountyLoading, hunting, onHunt,
  titlesState, titlesLoading, equippingTitleId, onEquipTitle,
  battlePassState, battlePassLoading, claimingTier, onClaimTier,
}: PremiumShopTabProps) {
  const races = state?.raceChange.races ?? [];

  return (
    <TabsContent value="premium" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
      <TabBanner
        src={TAB_BANNER_IMAGES.premium}
        title="Осколки Короны"
        subtitle="Осколки доспеха короля, отказавшегося умирать по правилам Столпов"
      />

      <Card className="border-gold/50 bg-gold/5">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-gold">👑 {state?.crownShards ?? 0}</div>
            <div className="text-[10px] text-muted-foreground">Осколков Короны</div>
          </div>
          <div className="text-right">
            {state?.premiumActive ? (
              <>
                <Badge className="bg-gold/20 text-gold text-[10px]">⭐ Премиум активен</Badge>
                <div className="text-[10px] text-muted-foreground mt-1">до {formatPremiumUntil(state.premiumUntil)}</div>
              </>
            ) : (
              <span className="text-[10px] text-muted-foreground">Премиум не активен</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Покупка Осколков за Telegram Stars — единственный разрешённый способ платить за
          цифровые товары внутри Telegram (см. lib/premium/premium-shop.ts). Реальные деньги идут
          только здесь; каталог ниже тратит уже начисленные Осколки. */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">⭐ Купить Осколки</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          {state?.shardPacks.map(pack => (
            <div key={pack.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/20 border border-border/60">
              <span className="text-2xl">{pack.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{pack.nameRu}</div>
                <div className="text-[10px] text-gold">👑 {pack.shards} Осколков</div>
              </div>
              <Button
                size="sm"
                className="h-8 text-xs shrink-0"
                disabled={loading || buyingPackId === pack.id}
                onClick={() => onBuyPack(pack.id)}
              >
                {buyingPackId === pack.id ? '...' : `⭐ ${pack.stars}`}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Каталог за Осколки — премиум-статус/гарантированный крафт/расширение хранилища. */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">🛒 Магазин</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          {state?.catalog.map(sku => {
            const affordable = (state?.crownShards ?? 0) >= sku.costShards;
            return (
              <div key={sku.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/20 border border-border/60">
                <span className="text-2xl">{sku.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{sku.nameRu}</div>
                  <div className="text-[10px] text-muted-foreground">{sku.descriptionRu}</div>
                </div>
                <Button
                  size="sm"
                  variant={affordable ? 'default' : 'outline'}
                  className={`h-8 text-xs shrink-0 ${!affordable ? 'border-border text-muted-foreground' : ''}`}
                  disabled={loading || !affordable}
                  onClick={() => onRedeemSku(sku.id)}
                >
                  👑 {sku.costShards}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Колесо фортуны — бесплатный прокрут(ы) в день + платный за Осколки (lib/economy/fortune-wheel.ts).
          Лучшие призы выпадают ооооочень редко — тот же хардкорный принцип, что и в общем лут-столе. */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">🎡 Колесо фортуны</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-3">
          <div className="text-[10px] text-muted-foreground text-center">
            Бесплатных прокрутов сегодня: {state?.fortuneWheel.freeSpinsLeftToday ?? 0} из {state?.fortuneWheel.freeSpinsPerDay ?? 1}
            {' '}(премиум получает {state ? state.fortuneWheel.freeSpinsPerDay : 2} в день). Платный прокрут — 👑 {state?.fortuneWheel.paidSpinCost ?? 50}.
          </div>
          <FortuneWheelVisual
            segments={state?.fortuneWheel.segments ?? []}
            disabled={spinningWheel || !player}
            onSpin={onSpinWheel}
          />
        </CardContent>
      </Card>

      {/* Смена расы — раса меняется вместе с классом (классы жёстко привязаны к расе), вложенные
          очки характеристик переносятся (api/player/change-race). */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">🧬 Смена расы</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <RaceChangePanel
            player={player}
            races={races}
            costShards={state?.raceChange.costShards ?? 400}
            crownShards={state?.crownShards ?? 0}
            changingRace={changingRace}
            onChangeRace={onChangeRace}
          />
        </CardContent>
      </Card>

      {/* Питомцы-компаньоны — коллекционные, покупаются за Осколки (lib/economy/pets.ts), активный
          даёт пассивный бонус к статам в бою. Владеть можно многими сразу — коллекционирование
          ради самого коллекционирования, а не только ради сильнейшего бонуса. */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">🐾 Питомцы-компаньоны</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <PetsPanel
            state={petsState}
            loading={petsLoading}
            buyingPetId={buyingPetId}
            activatingPetId={activatingPetId}
            onBuyPet={onBuyPet}
            onActivatePet={onActivatePet}
          />
        </CardContent>
      </Card>

      {/* Экспедиции — премиум-эксклюзивная офлайн-механика (lib/premium/expeditions.ts): отправить героя
          в отлучку на время и вернуться за наградой, не блокирует остальную игру. */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">🎒 Экспедиции</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <ExpeditionPanel
            state={expeditionState}
            loading={expeditionLoading}
            starting={startingExpeditionId}
            claiming={claimingExpedition}
            onStart={onStartExpedition}
            onClaim={onClaimExpedition}
          />
        </CardContent>
      </Card>

      {/* Доска контрактов — премиум-эксклюзивная ежедневная охота (lib/economy/bounty-board.ts): одна
          попытка в день, d20+Инстинкт против Сложности, гарантированный трофей при успехе. */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">📜 Доска контрактов</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <BountyBoardPanel
            state={bountyState}
            loading={bountyLoading}
            hunting={hunting}
            onHunt={onHunt}
          />
        </CardContent>
      </Card>

      {/* Титулы — премиум-эксклюзивная витринная механика (lib/social/titles.ts): статический каталог,
          "разблокирован" считается по уже существующей статистике игрока, никакого бонуса к
          статам, чистое отображение рядом с именем в шапке. */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">🏵️ Титулы</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <TitlesPanel
            state={titlesState}
            loading={titlesLoading}
            equippingTitleId={equippingTitleId}
            onEquipTitle={onEquipTitle}
          />
        </CardContent>
      </Card>

      {/* Боевой пропуск — премиум-эксклюзивная сезонная прогрессия (lib/premium/battle-pass.ts): очки за
          победы в бою (только пока премиум активен), тиры с наградами, месячный цикл. */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">🎫 Боевой пропуск</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <BattlePassPanel
            state={battlePassState}
            loading={battlePassLoading}
            claimingTier={claimingTier}
            onClaimTier={onClaimTier}
          />
        </CardContent>
      </Card>
    </TabsContent>
  );
}
