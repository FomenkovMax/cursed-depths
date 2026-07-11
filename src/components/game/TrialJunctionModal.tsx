import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TrialJunctionView } from '@/lib/game-types';

interface TrialJunctionModalProps {
  junction: TrialJunctionView | null;
  loading: boolean;
  onChoose: (direction: 'left' | 'right') => void;
}

const TYPE_COLOR: Record<string, string> = {
  monster: 'text-destructive border-destructive/40',
  reward: 'text-gold border-gold/40',
  trap: 'text-destructive/80 border-destructive/30',
};

export function TrialJunctionModal({ junction, loading, onChoose }: TrialJunctionModalProps) {
  return (
    <Dialog open={!!junction}>
      <DialogContent className="max-w-sm" showCloseButton={false} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="text-2xl">🗺️</span>
            Развилка испытания
          </DialogTitle>
          <DialogDescription className="text-sm text-foreground">
            Тип каждой тропы виден заранее — выбирайте с умом.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-2">
          {junction?.options.map(option => (
            <Button
              key={option.direction}
              variant="outline"
              className={`w-full justify-between h-auto py-3 ${TYPE_COLOR[option.type] ?? 'border-border'}`}
              disabled={loading}
              onClick={() => onChoose(option.direction)}
            >
              <span>{option.label}</span>
              <span className="text-[10px] text-muted-foreground">{option.direction === 'left' ? '⬅️' : '➡️'}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
