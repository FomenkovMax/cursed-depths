import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExplorationEvent } from '@/lib/game-types';

interface ExplorationEventModalProps {
  event: ExplorationEvent | null;
  loading: boolean;
  onChoose: (choiceId: string) => void;
}

export function ExplorationEventModal({ event, loading, onChoose }: ExplorationEventModalProps) {
  return (
    <Dialog open={!!event}>
      <DialogContent className="max-w-sm" showCloseButton={false} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="text-2xl">{event?.icon}</span>
            Развилка
          </DialogTitle>
          <DialogDescription className="text-sm text-foreground">{event?.textRu}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-2">
          {event?.choices.map(choice => (
            <Button
              key={choice.id}
              variant="outline"
              className="w-full justify-between h-auto py-2.5 border-border"
              disabled={loading}
              onClick={() => onChoose(choice.id)}
            >
              <span>{choice.label}</span>
              <span className="text-[10px] text-muted-foreground">{choice.hint}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
