import { Progress } from '@/components/ui/progress';
import { LOCATION_IMAGES } from '@/lib/asset-icons';

// Hero-заставка на загрузке — переиспользует уже готовую иллюстрацию локации (LOCATION_IMAGES,
// та же генерация, что и на экране Обзора/Карты), новых ассетов не требует. Раньше здесь был
// голый спиннер на плоском фоне — первый экран игры при каждом холодном старте оставался
// единственным местом без единой картинки.
export function LoadingScreen() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
      <img
        src={LOCATION_IMAGES.town}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/70 to-background" />
      <div className="relative text-6xl mb-4 animate-pulse">👑</div>
      <h1 className="relative font-display text-3xl font-bold text-primary mb-2 drop-shadow-lg">Cursed Depths</h1>
      <p className="relative text-muted-foreground text-sm">Загрузка проклятых глубин...</p>
      <div className="relative mt-4 w-48">
        <Progress value={60} className="h-2" />
      </div>
    </div>
  );
}
