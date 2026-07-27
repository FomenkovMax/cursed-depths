'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { InventoryItem } from '@/lib/game-types';
import { CharacterModel } from './CharacterModel';

interface CharacterViewportProps {
  equipped: InventoryItem[];
  autoRotate: boolean;
}

/** 3D-вьюпорт персонажа — экипировка обновляется в реальном времени вслед за
 * player.inventory, без перезагрузки сцены (React перерисовывает EquipmentSocket по ключу
 * item.id, Canvas не перемонтируется). frameloop="demand" + capped dpr: вкладка живёт в
 * Telegram WebView на мобильном, непрерывный 60fps-рендер вхолостую был бы лишней нагрузкой
 * на батарею и грелся бы телефон без пользы, пока камера не двигается. */
export function CharacterViewport({ equipped, autoRotate }: CharacterViewportProps) {
  return (
    <div className="aspect-square w-full rounded-lg overflow-hidden bg-secondary/10 border border-border/60">
      <Canvas
        dpr={[1, 1.5]}
        frameloop="demand"
        camera={{ position: [0, 1.1, 3.2], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 4, 3]} intensity={1.1} />
        <directionalLight position={[-2, 1, -2]} intensity={0.3} />
        <Suspense fallback={null}>
          <CharacterModel equipped={equipped} />
        </Suspense>
        <OrbitControls
          autoRotate={autoRotate}
          autoRotateSpeed={1.6}
          enablePan={false}
          minDistance={2}
          maxDistance={5}
          target={[0, 1, 0]}
        />
      </Canvas>
    </div>
  );
}
