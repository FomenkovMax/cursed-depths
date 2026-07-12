import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayerData, STAT_SHORT_RU } from '@/lib/game-types';
import { RESPEC_STAT_FIELDS, totalRespecBudget, type RespecStatField } from '@/lib/economy/respec';
import { RESPEC_COST_SHARDS } from '@/lib/premium/premium-shop';

interface RespecModalProps {
  open: boolean;
  player: PlayerData | null;
  crownShards: number;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (allocations: Record<RespecStatField, number>) => void;
}

const RACE_BASE_FIELD: Record<RespecStatField, 'baseStrength' | 'baseDexterity' | 'baseVitality' | 'baseIntellect' | 'baseWillpower' | 'baseInstinct'> = {
  strength: 'baseStrength',
  dexterity: 'baseDexterity',
  vitality: 'baseVitality',
  intellect: 'baseIntellect',
  willpower: 'baseWillpower',
  instinct: 'baseInstinct',
};

/** Respec-превью: стартует с текущего распределения игрока (не с нуля), даёт живой предпросмотр
 * итоговых статов и пулов ХП/МП ДО подтверждения — в отличие от обычной траты очка по одному
 * (api/player/allocate-stat), где каждый клик сразу необратим. */
export function RespecModal({ open, player, crownShards, submitting, onClose, onSubmit }: RespecModalProps) {
  const raceBase = useMemo(() => {
    if (!player) return null;
    const base = {} as Record<RespecStatField, number>;
    for (const field of RESPEC_STAT_FIELDS) base[field] = player.race[RACE_BASE_FIELD[field]];
    return base;
  }, [player]);

  const [allocations, setAllocations] = useState<Record<RespecStatField, number> | null>(null);
  // "Adjusting state during render" (не в useEffect, во избежание лишнего цикла рендеров) —
  // черновое распределение пересчитывается заново каждый раз, когда модалка ПЕРЕХОДИТ в
  // открытое состояние, начиная с текущего распределения игрока, а не с нуля.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open && player && raceBase) {
      const initial = {} as Record<RespecStatField, number>;
      for (const field of RESPEC_STAT_FIELDS) {
        initial[field] = Math.max(0, player[field] - raceBase[field]);
      }
      setAllocations(initial);
    }
  }

  if (!player || !raceBase || !allocations) {
    return (
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="max-w-sm" />
      </Dialog>
    );
  }

  const budget = totalRespecBudget(player.statPoints, {
    strength: player.strength, dexterity: player.dexterity, vitality: player.vitality,
    intellect: player.intellect, willpower: player.willpower, instinct: player.instinct,
  }, raceBase);
  const spent = RESPEC_STAT_FIELDS.reduce((sum, f) => sum + allocations[f], 0);
  const remaining = budget - spent;

  const newMaxHp = 50 + (raceBase.vitality + allocations.vitality) * 5;
  const newMaxMp = 100 + (raceBase.willpower + allocations.willpower) * 2;

  const isFree = player.respecAvailable;
  const canAfford = isFree || crownShards >= RESPEC_COST_SHARDS;

  const adjust = (field: RespecStatField, delta: number) => {
    setAllocations(prev => {
      if (!prev) return prev;
      const next = Math.max(0, prev[field] + delta);
      if (delta > 0) {
        if (remaining <= 0) return prev;
        const nextSpent = spent + 1;
        if (next / nextSpent > 0.6) return prev;
      }
      return { ...prev, [field]: next };
    });
  };

  const reset = () => {
    const zeroed = {} as Record<RespecStatField, number>;
    for (const field of RESPEC_STAT_FIELDS) zeroed[field] = 0;
    setAllocations(zeroed);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="text-2xl">🔄</span>
            Respec — перераспределение очков
          </DialogTitle>
          <DialogDescription className="text-sm text-foreground">
            Предпросмотр: измените распределение и посмотрите итог до подтверждения. Не более 60% очков в одну характеристику.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 mt-1">
          {RESPEC_STAT_FIELDS.map(field => (
            <div key={field} className="flex items-center gap-2 bg-secondary/30 rounded-lg p-2">
              <span className="text-xs font-medium w-10 shrink-0">{STAT_SHORT_RU[field]}</span>
              <Button size="sm" variant="outline" className="h-6 w-6 p-0 border-border" disabled={allocations[field] <= 0} onClick={() => adjust(field, -1)}>−</Button>
              <span className="text-sm font-bold tabular-nums w-10 text-center">{raceBase[field] + allocations[field]}</span>
              <Button size="sm" variant="outline" className="h-6 w-6 p-0 border-border" disabled={remaining <= 0} onClick={() => adjust(field, 1)}>+</Button>
              <span className="text-[10px] text-muted-foreground ml-auto">вложено {allocations[field]}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs mt-1">
          <span className="text-muted-foreground">Свободно очков: <span className="text-foreground font-bold">{remaining}</span></span>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground" onClick={reset}>Сбросить всё</Button>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-muted-foreground bg-secondary/20 rounded-lg p-2 mt-1">
          <span>❤️ ХП: {newMaxHp}</span>
          <span>💧 МП: {newMaxMp}</span>
        </div>

        <div className="flex items-center justify-between mt-2">
          <Badge variant="outline" className={`text-[10px] h-5 ${isFree ? 'text-uncommon border-uncommon/40' : 'text-gold border-gold/40'}`}>
            {isFree ? 'Бесплатно (первый respec)' : `👑 ${RESPEC_COST_SHARDS} (у вас ${crownShards})`}
          </Badge>
          <Button
            disabled={submitting || !canAfford}
            onClick={() => onSubmit(allocations)}
          >
            Подтвердить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
