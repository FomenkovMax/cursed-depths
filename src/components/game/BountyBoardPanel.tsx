import { useState } from 'react';
import { BountyStateView, BountyHuntResultView } from '@/lib/game-types';
import { BOSS_PORTRAIT_IMAGES } from '@/lib/asset-icons';

interface BountyBoardPanelProps {
  state: BountyStateView | null;
  loading: boolean;
  hunting: boolean;
  onHunt: () => Promise<BountyHuntResultView | null>;
}

const STAT_LABEL_RU: Record<string, string> = {
  strength: 'Сила', dexterity: 'Ловкость', vitality: 'Стойкость',
  intellect: 'Разум', willpower: 'Воля', instinct: 'Инстинкт',
};

/** Доска контрактов (lib/economy/bounty-board.ts) — одна попытка в день, d20+стат против Сложности,
 * гарантированный трофей из реального лут-стола цели при успехе. */
export function BountyBoardPanel({ state, loading, hunting, onHunt }: BountyBoardPanelProps) {
  const [result, setResult] = useState<BountyHuntResultView | null>(null);

  if (!state?.premiumActive) {
    return (
      <p className="text-[10px] text-muted-foreground text-center py-2">
        Доска контрактов доступна только с активным премиум-статусом.
      </p>
    );
  }

  if (!state.target) {
    return <p className="text-[10px] text-muted-foreground text-center py-2">Загрузка контракта...</p>;
  }

  const handleHunt = async () => {
    setResult(null);
    const r = await onHunt();
    if (r) setResult(r);
  };

  return (
    <div className="space-y-2">
      {/* Full-body портрет цели вместо обрезанной иконки 64×64 (тот же баг и тот же фикс, что и
          в WeeklyChallengeTab.tsx — портрет боссов хранится full-body 480×643, крохотный квадрат
          с object-top срезал всё, кроме макушки). */}
      <div className="rounded-lg border border-border/60 bg-secondary/10 overflow-hidden">
        {BOSS_PORTRAIT_IMAGES[state.target.enemyId] ? (
          <div className="relative w-full aspect-[3/4] max-h-64 overflow-hidden bg-secondary/20">
            <img src={BOSS_PORTRAIT_IMAGES[state.target.enemyId]} alt="" className="w-full h-full object-cover object-top" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-3 pt-8 pb-2">
              <div className="text-sm font-medium text-white">{state.target.nameRu}</div>
            </div>
          </div>
        ) : (
          <div className="pt-3 text-center">
            <div className="text-2xl">{state.target.icon}</div>
            <div className="text-sm font-medium">{state.target.nameRu}</div>
          </div>
        )}
        <div className="p-3 text-center space-y-1">
          <div className="text-[10px] text-muted-foreground">
            Проверка: {STAT_LABEL_RU[state.stat] ?? state.stat} против Сложности {state.dc} (d20 + модификатор)
          </div>
          <div className="text-[10px] text-gold">Награда: гарантированный трофей + 👑 {state.bonusGold} золота (× премиум-бонус)</div>
        </div>
      </div>

      {result && (
        <div className={`p-2 rounded-lg border text-center text-[10px] ${result.success ? 'bg-uncommon/10 border-uncommon/30 text-uncommon' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
          <div>🎲 {result.check.statLabel}: {result.check.roll}{result.check.modifier >= 0 ? '+' : ''}{result.check.modifier} = {result.check.total} (СЛ {result.check.dc}) — {result.check.success ? 'успех!' : 'провал.'}</div>
          <div className="mt-1">{result.message}</div>
        </div>
      )}

      <button
        type="button"
        onClick={handleHunt}
        disabled={loading || hunting || state.attempted}
        className="w-full h-9 text-xs rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {hunting ? 'Охотимся...' : state.attempted ? 'Попытка на сегодня использована' : '🏹 Начать охоту'}
      </button>
    </div>
  );
}
