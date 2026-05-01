'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <div className="text-5xl mb-4">💀</div>
      <h2 className="text-xl font-bold text-foreground mb-2">Что-то пошло не так</h2>
      <p className="text-muted-foreground text-sm mb-4 max-w-md">
        Произошла ошибка при загрузке приложения. Попробуйте перезагрузить.
      </p>
      <p className="text-xs text-muted-foreground/60 mb-6 max-w-md break-all">
        {error?.message || 'Неизвестная ошибка'}
      </p>
      <button
        onClick={reset}
        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        Попробовать снова
      </button>
    </div>
  );
}
