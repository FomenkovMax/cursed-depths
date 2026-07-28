// Раскладка 2D-портрета персонажа (src/components/game/character-viewer/PaperDoll) — привязка
// слотов экипировки к позициям (% от контейнера) вокруг full-body портрета. Настоящих
// иллюстрированных 2D-арт-ассетов экипировки в проекте нет (только эмодзи/AI-иконки предметов,
// как везде в инвентаре) — раскладка держит компоновку "кто где", сам предмет представлен его
// настоящей иконкой (ItemIconTile).
//
// Слоты стоят по краям (left/right), а не поверх центра кадра — раньше "amulet"/"body" сидели
// прямо по центру на лице/торсе и перекрывали портрет (фидбек "вещи перекрывают арт"). Портрет
// теперь остаётся полностью открытым по центру, иконки фланкируют его как в большинстве мобильных
// ARPG (Diablo Immortal, AFK Journey и т.п.), а не накладываются на фигуру.

export type PaperDollSlotKey = 'weapon' | 'head' | 'body' | 'hands' | 'legs' | 'ring1' | 'ring2' | 'amulet';

export const PAPER_DOLL_SLOTS: { slot: PaperDollSlotKey; top: string; side: 'left' | 'right' }[] = [
  { slot: 'head', top: '8%', side: 'left' },
  { slot: 'amulet', top: '8%', side: 'right' },
  { slot: 'weapon', top: '33%', side: 'left' },
  { slot: 'body', top: '33%', side: 'right' },
  { slot: 'ring1', top: '58%', side: 'left' },
  { slot: 'hands', top: '58%', side: 'right' },
  { slot: 'ring2', top: '83%', side: 'left' },
  { slot: 'legs', top: '83%', side: 'right' },
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
