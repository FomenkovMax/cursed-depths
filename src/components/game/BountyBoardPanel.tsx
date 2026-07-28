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
      <div className="p-3 rounded-lg border border-border/60 bg-secondary/10 text-center space-y-1">
        {BOSS_PORTRAIT_IMAGES[state.target.enemyId] ? (
          <img src={BOSS_PORTRAIT_IMAGES[state.target.enemyId]} alt="" className="w-16 h-16 mx-auto rounded object-cover object-top" />
        ) : (
          <div className="text-2xl">{state.target.icon}</div>
        )}
        <div className="text-sm font-medium">{state.target.nameRu}</div>
        <div className="text-[10px] text-muted-foreground">
          Проверка: {STAT_LABEL_RU[state.stat] ?? state.stat} против Сложности {state.dc} (d20 + модификатор)
        </div>
        <div className="text-[10px] text-gold">Награда: гарантированный трофей + 👑 {state.bonusGold} золота (× премиум-бонус)</div>
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
