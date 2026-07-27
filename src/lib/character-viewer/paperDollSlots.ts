// Раскладка 2D-портрета персонажа (src/components/game/character-viewer/PaperDoll) — привязка
// слотов экипировки к позициям (% от контейнера) над силуэтом фигуры. Настоящих иллюстрированных
// 2D-арт-ассетов персонажа/экипировки в проекте нет (только эмодзи-иконки предметов, как везде в
// инвентаре) — силуэт держит компоновку "кто где", сам предмет представлен его реальной иконкой.

export type PaperDollSlotKey = 'weapon' | 'head' | 'body' | 'hands' | 'legs' | 'ring1' | 'ring2' | 'amulet';

export const PAPER_DOLL_SLOTS: { slot: PaperDollSlotKey; top: string; left: string }[] = [
  { slot: 'head', top: '10%', left: '50%' },
  { slot: 'amulet', top: '30%', left: '50%' },
  { slot: 'weapon', top: '48%', left: '18%' },
  { slot: 'body', top: '48%', left: '50%' },
  { slot: 'hands', top: '48%', left: '82%' },
  { slot: 'ring1', top: '68%', left: '32%' },
  { slot: 'ring2', top: '68%', left: '68%' },
  { slot: 'legs', top: '88%', left: '50%' },
];

const LEGACY_SLOT_ALIAS: Record<string, PaperDollSlotKey> = {
  chest: 'body',
  accessory1: 'ring1',
  accessory2: 'ring2',
};

export function resolveDollSlot(slot: string | null): PaperDollSlotKey | null {
  if (!slot) return null;
  if (PAPER_DOLL_SLOTS.some(s => s.slot === slot)) return slot as PaperDollSlotKey;
  return LEGACY_SLOT_ALIAS[slot] ?? null;
}
