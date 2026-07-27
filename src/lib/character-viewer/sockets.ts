// Геометрия 3D-вьюпорта персонажа (src/components/game/character-viewer) — привязка слотов
// экипировки к точкам крепления на условной гуманоидной фигуре и заглушки-примитивы для
// предметов без реальной GLB-модели (Item.model3d не задан почти ни у одного предмета, пока
// не произведены настоящие ассеты — см. аудит в задаче "3D-инвентарь").

export type EquipSlotKey = 'weapon' | 'head' | 'body' | 'hands' | 'legs' | 'ring1' | 'ring2' | 'amulet';

// Локальные офсеты точек крепления на фигуре высотой ~2 юнита (ноги на y=0, макушка на
// y≈1.9) — подобраны на глаз под будущий базовый риг. Это НЕ кости скелета: реального рига
// пока нет (см. аудит), это фиксированные позиции в локальных координатах модели персонажа.
// Когда появится риг с именованными костями, эта карта заменяется на bone-attachment внутри
// CharacterModel.tsx, сигнатура остальных компонентов не меняется.
export const SLOT_TO_SOCKET: Record<EquipSlotKey, [number, number, number]> = {
  head: [0, 1.78, 0],
  amulet: [0, 1.42, 0.34],
  body: [0, 1.1, 0],
  weapon: [0.5, 0.95, 0.12],
  hands: [-0.5, 0.7, 0.1],
  ring1: [0.32, 0.5, 0.1],
  ring2: [-0.32, 0.5, 0.1],
  legs: [0, 0.45, 0],
};

// Устаревшие значения slot (см. src/lib/game-types.ts SLOT_RU) — предметы, экипированные до
// перехода на 7 слотов, могли сохранить старые имена в БД. Сводим их к актуальному сокету
// вместо того, чтобы молча не рисовать такой предмет во вьюпорте.
const LEGACY_SLOT_ALIAS: Record<string, EquipSlotKey> = {
  chest: 'body',
  accessory1: 'ring1',
  accessory2: 'ring2',
};

export function resolveSocketSlot(slot: string | null): EquipSlotKey | null {
  if (!slot) return null;
  if (slot in SLOT_TO_SOCKET) return slot as EquipSlotKey;
  return LEGACY_SLOT_ALIAS[slot] ?? null;
}

export type PlaceholderShape = 'box' | 'sphere' | 'cone' | 'cylinder' | 'torus';

// Форма и размер примитива-заглушки на слот — используется, когда у предмета нет
// Item.model3d. Подобрано так, чтобы силуэт слота узнавался даже без реальной модели
// (сфера на голове, конус-"клинок" в руке и т.д.).
export const SLOT_PLACEHOLDER_SHAPE: Record<EquipSlotKey, PlaceholderShape> = {
  head: 'sphere',
  amulet: 'torus',
  body: 'box',
  weapon: 'cone',
  hands: 'box',
  ring1: 'torus',
  ring2: 'torus',
  legs: 'cylinder',
};

// Заглушки для head/body/amulet намеренно крупнее соответствующей части базовой фигуры
// (BASE_HEAD_RADIUS/BASE_BODY_RADIUS выше) — иначе "надетый" примитив полностью тонет внутри
// капсулы/сферы тела и остаётся невидимым, а вся точка вьюпорта в том, чтобы силуэт менялся
// по факту экипировки.
export const SLOT_PLACEHOLDER_SIZE: Record<EquipSlotKey, [number, number, number]> = {
  head: [0.32, 0.32, 0.32],
  amulet: [0.13, 0.04, 0.13],
  body: [0.74, 0.62, 0.52],
  weapon: [0.11, 0.65, 0.11],
  hands: [0.16, 0.16, 0.16],
  ring1: [0.07, 0.025, 0.07],
  ring2: [0.07, 0.025, 0.07],
  legs: [0.42, 0.75, 0.28],
};

// Базовая фигура персонажа (заглушка до появления реального рига) — капсула, силуэт
// узнаваем как "гуманоид", без привязки к конкретной расе/классу (вне скоупа MVP).
export const BASE_BODY_RADIUS = 0.32;
export const BASE_BODY_HEIGHT = 1.3; // высота цилиндрической части капсулы, не считая колпачков
export const BASE_BODY_CENTER_Y = 1.0;
export const BASE_HEAD_RADIUS = 0.24;
export const BASE_HEAD_CENTER_Y = 1.78;
