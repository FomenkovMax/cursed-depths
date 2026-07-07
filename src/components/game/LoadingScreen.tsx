import { Progress } from '@/components/ui/progress';

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-6xl mb-4 animate-pulse">👑</div>
      <h1 className="text-2xl font-bold text-primary mb-2">Cursed Depths</h1>
      <p className="text-muted-foreground text-sm">Загрузка проклятых глубин...</p>
      <div className="mt-4 w-48">
        <Progress value={60} className="h-2" />
      </div>
    </div>
  );
}
