'use client';

import type { CSSProperties } from 'react';
import { ItemIconTile } from '@/components/game/ItemIconTile';
import type { InventoryItem } from '@/lib/game-types';
import { SLOT_RU } from '@/lib/game-types';
import { PAPER_DOLL_SLOTS, resolveDollSlot, type PaperDollSlotKey } from '@/lib/character-viewer/paperDollSlots';

interface PaperDollProps {
  equipped: InventoryItem[];
  onSelect: (item: InventoryItem) => void;
  /** Портрет текущей эволюции класса (lib/character-portrait.ts) — full-body арт (исходник
   * 480×643), служит фоном силуэта вместо плоских CSS-фигур ниже. Опционален: для классов без
   * покрытия (не должно случаться, 26/26 уже есть) откатывается на прежний CSS-силуэт. */
  portraitSrc?: string;
}

// Полупрозрачные силуэты-подсказки формы предмета для пустого слота — вместо generic-эмодзи
// (👤👕🤚 и т.п., одинаковых для любого предмета этого типа независимо от слота). Чистый SVG,
// без новых ассетов: даёт тот же эффект "рунический контур подсказывает, что сюда встанет",
// что и в референсе, но нулевой стоимостью на арт-пайплайн.
function SlotSilhouette({ slot }: { slot: PaperDollSlotKey }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  switch (slot) {
    case 'head':
      return (
        <svg viewBox="0 0 24 24" className="w-6 h-6">
          <path {...common} d="M6 13c0-4.4 2.7-8 6-8s6 3.6 6 8v3H6v-3z" />
          <path {...common} d="M4 16h16M9 13v3M15 13v3" />
        </svg>
      );
    case 'body':
      return (
        <svg viewBox="0 0 24 24" className="w-6 h-6">
          <path {...common} d="M8 4l4 2 4-2 3 3-2 3v10H7V10L5 7z" />
          <path {...common} d="M12 8v11" />
        </svg>
      );
    case 'hands':
      return (
        <svg viewBox="0 0 24 24" className="w-6 h-6">
          <path {...common} d="M9 21v-8a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v8H9z" />
          <path {...common} d="M9 13V6a1.5 1.5 0 0 1 3 0v5M12 12V5a1.5 1.5 0 0 1 3 0v6" />
        </svg>
      );
    case 'legs':
      return (
        <svg viewBox="0 0 24 24" className="w-6 h-6">
          <path {...common} d="M9 3h6v10l2 5v3h-5v-5l-2-5V3z" />
          <path {...common} d="M9 3l-1 10-2 5v3h5" />
        </svg>
      );
    case 'weapon':
      return (
        <svg viewBox="0 0 24 24" className="w-6 h-6">
          <path {...common} d="M12 2v14" />
          <path {...common} d="M8 14h8M10 16h4v5h-4z" />
        </svg>
      );
    case 'amulet':
      return (
        <svg viewBox="0 0 24 24" className="w-6 h-6">
          <path {...common} d="M9 3h6l1 4-4 3-4-3z" />
          <path {...common} d="M12 10l4 8-4 3-4-3z" />
        </svg>
      );
    case 'ring1':
    case 'ring2':
      return (
        <svg viewBox="0 0 24 24" className="w-6 h-6">
          <circle {...common} cx="12" cy="14" r="6" />
          <path {...common} d="M9 8l3-4 3 4" />
        </svg>
      );
    default:
      return null;
  }
}

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

/** Портрет персонажа в полный рост: реальный full-body арт класса (portraitSrc) как фон, полностью
 * открытый в центре кадра — иконки надетых предметов расставлены по левому/правому краю
 * (paperDollSlots.ts), а не поверх фигуры, чтобы не перекрывать портрет. Без portraitSrc (не
 * должно случаться — 26/26 классов покрыты) откатывается на прежний CSS-силуэт, чтобы ничего не
 * заглушить. Обновляется вслед за player.inventory. */
export function PaperDoll({ equipped, onSelect, portraitSrc }: PaperDollProps) {
  const bySlot = new Map<PaperDollSlotKey, InventoryItem>();
  for (const item of equipped) {
    const slot = resolveDollSlot(item.slot);
    if (slot) bySlot.set(slot, item);
  }

  return (
    <div
      className="relative w-full rounded-lg bg-secondary/10 border border-border/60 overflow-hidden"
      style={{ aspectRatio: portraitSrc ? '480 / 643' : '1 / 1' }}
    >
      {portraitSrc ? (
        <img src={portraitSrc} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
      ) : (
        SILHOUETTE_SHAPES.map((shape, i) => (
          <div key={i} className={shape.className} style={shape.style} />
        ))
      )}

      {PAPER_DOLL_SLOTS.map(({ slot, top, side }) => {
        const item = bySlot.get(slot);
        return (
          <div
            key={slot}
            className="absolute flex flex-col items-center gap-0.5 w-12"
            style={{ top, [side]: '3%', transform: 'translateY(-50%)' }}
          >
            {item ? (
              <ItemIconTile item={item} equipped onClick={() => onSelect(item)} />
            ) : (
              <div className="aspect-square w-full rounded-lg border border-dashed border-white/40 bg-black/50 backdrop-blur-[1px] flex items-center justify-center text-white/50">
                <SlotSilhouette slot={slot} />
              </div>
            )}
            <span className="text-[8px] text-white/80 text-center leading-none drop-shadow">{SLOT_RU[slot] ?? slot}</span>
          </div>
        );
      })}
    </div>
  );
}
