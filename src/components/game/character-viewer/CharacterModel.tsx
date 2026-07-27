'use client';

import type { InventoryItem } from '@/lib/game-types';
import {
  BASE_BODY_CENTER_Y, BASE_BODY_HEIGHT, BASE_BODY_RADIUS,
  BASE_HEAD_CENTER_Y, BASE_HEAD_RADIUS, resolveSocketSlot,
} from '@/lib/character-viewer/sockets';
import { EquipmentSocket } from './EquipmentSocket';

interface CharacterModelProps {
  equipped: InventoryItem[];
}

/** Базовая фигура персонажа + надетая экипировка. Фигура — капсула с головой-сферой, не
 * привязанная к расе/классу: реального рига персонажа ещё нет (см. аудит в задаче
 * "3D-инвентарь"), различие по расе/классу в 3D — отдельный объём работы за пределами MVP. */
export function CharacterModel({ equipped }: CharacterModelProps) {
  return (
    <group>
      <mesh position={[0, BASE_BODY_CENTER_Y, 0]}>
        <capsuleGeometry args={[BASE_BODY_RADIUS, BASE_BODY_HEIGHT, 4, 12]} />
        <meshStandardMaterial color="#4b4b52" roughness={0.75} metalness={0.1} />
      </mesh>
      <mesh position={[0, BASE_HEAD_CENTER_Y, 0]}>
        <sphereGeometry args={[BASE_HEAD_RADIUS, 16, 16]} />
        <meshStandardMaterial color="#5a5a62" roughness={0.75} metalness={0.1} />
      </mesh>

      {equipped.map(item => {
        const slot = resolveSocketSlot(item.slot);
        if (!slot) return null;
        return <EquipmentSocket key={item.id} slot={slot} inventoryItem={item} />;
      })}
    </group>
  );
}
