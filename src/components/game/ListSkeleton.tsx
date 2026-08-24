import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ListSkeletonProps {
  /** 'rows' — карточки-строки (Лидерборд, Трофеи): иконка + две строки текста + бейдж справа.
   * 'grid' — сетка плиток (Достижения, Кодекс): квадратные иконки без подписей. */
  variant?: 'rows' | 'grid';
  count?: number;
}

/** Общая заглушка для списков/сеток коллекционного контента, пока грузятся реальные данные —
 * тот же приём, что и остальной интерфейс уже использует (animate-pulse), просто как форма
 * контента вместо голого текста "Загрузка...", который выглядел шагом назад на фоне насыщенного
 * визуала остальной игры. */
export function ListSkeleton({ variant = 'rows', count = 5 }: ListSkeletonProps) {
  if (variant === 'grid') {
    return (
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: count }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border-border">
          <CardContent className="p-2.5 flex items-center gap-2.5">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
            <Skeleton className="h-4 w-10 shrink-0" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
