import { useState } from 'react';
import { RARITY_COLORS } from '@/lib/game-data';
import { FortuneWheelSegmentView, FortuneSpinResultView } from '@/lib/game-types';

const WHEEL_SIZE = 220;
const ICON_RADIUS = 82;
const SPIN_DURATION_MS = 3200;
const EXTRA_SPINS = 5; // сколько полных оборотов "для эффекта" поверх довода до нужного сектора

function segmentColor(kind: FortuneWheelSegmentView['kind'], rarity: string | null): string {
  if (kind === 'item' && rarity) return RARITY_COLORS[rarity] ?? '#6c54b6';
  if (kind === 'premium_days') return '#f59e0b';
  if (kind === 'shards') return '#fbbf24';
  if (kind === 'gold') return '#eab308';
  if (kind === 'stash_slots') return '#14b8a6';
  return '#4b5563'; // nothing
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface FortuneWheelVisualProps {
  segments: FortuneWheelSegmentView[];
  disabled: boolean;
  onSpin: () => Promise<FortuneSpinResultView | null>;
}

/** Визуальное колесо — размер сектора одинаковый для всех призов ради читаемости, реальная
 * вероятность (см. lib/economy/fortune-wheel.ts FORTUNE_WHEEL.weight) сильно отличается от визуального
 * размера, как и в любом другом колесе фортуны с редкими призами. */
export function FortuneWheelVisual({ segments, disabled, onSpin }: FortuneWheelVisualProps) {
  const [rotation, setRotation] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [revealed, setRevealed] = useState<FortuneSpinResultView | null>(null);

  const n = segments.length || 1;
  const step = 360 / n;
  const gradient = segments
    .map((seg, i) => {
      const color = hexToRgba(segmentColor(seg.kind, seg.rarity), i % 2 === 0 ? 0.55 : 0.32);
      return `${color} ${i * step}deg ${(i + 1) * step}deg`;
    })
    .join(', ');

  const handleClick = async () => {
    if (animating || disabled || segments.length === 0) return;
    setRevealed(null);
    const reward = await onSpin();
    if (!reward) return;

    const targetIdx = Math.max(0, segments.findIndex(s => s.id === reward.id));
    const targetAngle = targetIdx * step + step / 2;
    const currentMod = ((rotation % 360) + 360) % 360;
    const desiredMod = (360 - targetAngle + 360) % 360;
    let delta = desiredMod - currentMod;
    if (delta <= 0) delta += 360;

    setAnimating(true);
    setRotation(prev => prev + delta + 360 * EXTRA_SPINS);
    setTimeout(() => {
      setAnimating(false);
      setRevealed(reward);
    }, SPIN_DURATION_MS);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
        {/* Указатель — треугольник остриём вниз, целится в сектор наверху колеса */}
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-1 z-10"
          style={{ width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: '15px solid #fbbf24' }}
        />
        <div
          className="w-full h-full rounded-full border-4 border-gold/60 relative shadow-lg shadow-gold/10"
          style={{
            background: `conic-gradient(${gradient})`,
            transform: `rotate(${rotation}deg)`,
            transition: animating ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.12, 0.67, 0.14, 1)` : 'none',
          }}
        >
          {segments.map((seg, i) => {
            const angle = i * step + step / 2;
            return (
              <div
                key={seg.id}
                className="absolute top-1/2 left-1/2 flex items-center justify-center"
                style={{
                  width: 32,
                  height: 32,
                  marginLeft: -16,
                  marginTop: -16,
                  transform: `rotate(${angle}deg) translateY(-${ICON_RADIUS}px) rotate(${-angle}deg)`,
                }}
              >
                <span className="text-xl leading-none">{seg.icon}</span>
              </div>
            );
          })}
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background border-2 border-gold/60 flex items-center justify-center text-xl">
          🎡
        </div>
      </div>

      {revealed && !animating && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-gold/10 border border-gold/30 w-full max-w-xs">
          <span className="text-xl">{revealed.icon}</span>
          <div className="text-xs">
            <span className="font-medium">{revealed.nameRu}</span>
            {revealed.itemWon && <span className="text-muted-foreground"> — {revealed.itemWon}</span>}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={animating || disabled || segments.length === 0}
        className="w-full max-w-xs h-9 text-xs rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
      >
        {animating ? 'Крутится...' : '🎡 Крутить колесо'}
      </button>
    </div>
  );
}
