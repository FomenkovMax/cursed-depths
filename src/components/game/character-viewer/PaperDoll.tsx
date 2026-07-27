'use client';

import type { CSSProperties } from 'react';
import { ItemIconTile } from '@/components/game/ItemIconTile';
import type { InventoryItem } from '@/lib/game-types';
import { SLOT_RU } from '@/lib/game-types';
import { PAPER_DOLL_SLOTS, resolveDollSlot, type PaperDollSlotKey } from '@/lib/character-viewer/paperDollSlots';

interface PaperDollProps {
  equipped: InventoryItem[];
  onSelect: (item: InventoryItem) => void;
}

const SLOT_PLACEHOLDER_ICON: Record<PaperDollSlotKey, string> = {
  head: '👤', body: '👕', hands: '🤚', legs: '🦵', weapon: '⚔️', amulet: '📿', ring1: '💍', ring2: '💍',
};

// Силуэт — условные CSS-прямоугольники/круг, не иллюстрация: держат компоновку "где на теле
// какой слот", сам предмет представлен настоящей иконкой (ItemIconTile), как везде в инвентаре.
const SILHOUETTE_SHAPES: { className: string; style: CSSProperties }[] = [
  { className: 'absolute rounded-full bg-secondary/40 border border-border/50', style: { width: '16%', aspectRatio: '1 / 1', top: '4%', left: '50%', transform: 'translateX(-50%)' } },
  { className: 'absolute rounded-2xl bg-secondary/40 border border-border/50', style: { width: '30%', height: '32%', top: '24%', left: '50%', transform: 'translateX(-50%)' } },
  { className: 'absolute rounded-full bg-secondary/40 border border-border/50', style: { width: '10%', height: '26%', top: '30%', left: '22%', transform: 'translateX(-50%)' } },
  { className: 'absolute rounded-full bg-secondary/40 border border-border/50', style: { width: '10%', height: '26%', top: '30%', left: '78%', transform: 'translateX(-50%)' } },
  { className: 'absolute rounded-full bg-secondary/40 border border-border/50', style: { width: '13%', height: '28%', top: '58%', left: '38%', transform: 'translateX(-50%)' } },
  { className: 'absolute rounded-full bg-secondary/40 border border-border/50', style: { width: '13%', height: '28%', top: '58%', left: '62%', transform: 'translateX(-50%)' } },
];

/** 2D-портрет персонажа: силуэт фигуры из CSS-примитивов + иконки надетых предметов, разложенные
 * анатомически (голова сверху, оружие/перчатки по бокам рук, кольца у кистей, ноги внизу).
 * Обновляется вслед за player.inventory, как и раньше — просто перерисовывается по новому
 * пропу equipped, без какого-либо отдельного состояния. */
export function PaperDoll({ equipped, onSelect }: PaperDollProps) {
  const bySlot = new Map<PaperDollSlotKey, InventoryItem>();
  for (const item of equipped) {
    const slot = resolveDollSlot(item.slot);
    if (slot) bySlot.set(slot, item);
  }

  return (
    <div className="relative w-full aspect-square rounded-lg bg-secondary/10 border border-border/60 overflow-hidden">
      {SILHOUETTE_SHAPES.map((shape, i) => (
        <div key={i} className={shape.className} style={shape.style} />
      ))}

      {PAPER_DOLL_SLOTS.map(({ slot, top, left }) => {
        const item = bySlot.get(slot);
        return (
          <div
            key={slot}
            className="absolute flex flex-col items-center gap-0.5 w-12"
            style={{ top, left, transform: 'translate(-50%, -50%)' }}
          >
            {item ? (
              <ItemIconTile item={item} equipped onClick={() => onSelect(item)} />
            ) : (
              <div className="aspect-square w-full rounded-lg border border-dashed border-border/50 bg-background/40 flex items-center justify-center text-muted-foreground/40 text-sm">
                {SLOT_PLACEHOLDER_ICON[slot]}
              </div>
            )}
            <span className="text-[8px] text-muted-foreground text-center leading-none">{SLOT_RU[slot] ?? slot}</span>
          </div>
        );
      })}
    </div>
  );
}
