'use client';

import { useGLTF } from '@react-three/drei';
import { ITEMS, RARITY_COLORS } from '@/lib/game-data';
import type { InventoryItem } from '@/lib/game-types';
import { SLOT_PLACEHOLDER_SHAPE, SLOT_PLACEHOLDER_SIZE, SLOT_TO_SOCKET, type EquipSlotKey } from '@/lib/character-viewer/sockets';

interface EquipmentSocketProps {
  slot: EquipSlotKey;
  inventoryItem: InventoryItem;
}

/** Один надетый предмет в 3D-сцене. Рисует настоящую GLB-модель, если она задана у предмета
 * в статическом каталоге (Item.model3d, game-data.ts) — сейчас это не задано почти ни у
 * одного предмета, реальных ассетов ещё не произведено (см. аудит), поэтому в 99% случаев
 * рисуется примитив-заглушка того же силуэта, раскрашенная по редкости. Замена конкретного
 * предмета на реальную модель — правка одной строки в ITEMS, без изменений здесь. */
export function EquipmentSocket({ slot, inventoryItem }: EquipmentSocketProps) {
  const baseItem = ITEMS.find(i => i.id === inventoryItem.itemId);
  const position = SLOT_TO_SOCKET[slot];
  const color = RARITY_COLORS[inventoryItem.rarity] ?? RARITY_COLORS.common;

  if (baseItem?.model3d) {
    return <GltfEquipment path={baseItem.model3d} position={position} />;
  }
  return <PlaceholderEquipment slot={slot} position={position} color={color} />;
}

function GltfEquipment({ path, position }: { path: string; position: [number, number, number] }) {
  const { scene } = useGLTF(path);
  return <primitive object={scene} position={position} />;
}

function PlaceholderEquipment({ slot, position, color }: { slot: EquipSlotKey; position: [number, number, number]; color: string }) {
  const shape = SLOT_PLACEHOLDER_SHAPE[slot];
  const [sx, sy, sz] = SLOT_PLACEHOLDER_SIZE[slot];

  return (
    <mesh position={position}>
      {shape === 'box' && <boxGeometry args={[sx, sy, sz]} />}
      {shape === 'sphere' && <sphereGeometry args={[sx, 16, 16]} />}
      {shape === 'cone' && <coneGeometry args={[sx, sy, 12]} />}
      {shape === 'cylinder' && <cylinderGeometry args={[sx, sx * 0.85, sy, 12]} />}
      {shape === 'torus' && <torusGeometry args={[sx, sy, 8, 16]} />}
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.35} />
    </mesh>
  );
}
