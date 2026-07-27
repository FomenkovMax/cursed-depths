import { useCallback, useState } from 'react';

/** Локальное UI-состояние 3D-вьюпорта персонажа (src/components/game/character-viewer) —
 * per CLAUDE.md новое состояние не добавляется в page.tsx. Экипировка сюда не входит: она
 * продолжает течь из player.inventory как и раньше, этот хук не дублирует данные, только
 * состояние самого вьюпорта (вращение камеры, ошибка загрузки GLB). */
export function useCharacterViewer() {
  const [autoRotate, setAutoRotate] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const toggleAutoRotate = useCallback(() => setAutoRotate(v => !v), []);

  return { autoRotate, toggleAutoRotate, loadError, setLoadError };
}
