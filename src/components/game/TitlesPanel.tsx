import { Button } from '@/components/ui/button';
import { TitlesStateView } from '@/lib/game-types';

interface TitlesPanelProps {
  state: TitlesStateView | null;
  loading: boolean;
  equippingTitleId: string | null;
  onEquipTitle: (titleId: string | null) => void;
}

export function TitlesPanel({ state, loading, equippingTitleId, onEquipTitle }: TitlesPanelProps) {
  if (!state?.premiumActive) {
    return (
      <p className="text-[10px] text-muted-foreground text-center py-2">
        Титулы доступны только с активным премиум-статусом.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {state.activeTitleId && (
        <Button
          variant="outline"
          className="w-full h-8 text-xs border-border"
          disabled={loading || equippingTitleId !== null}
          onClick={() => onEquipTitle(null)}
        >
          {equippingTitleId === 'none' ? '...' : 'Снять титул'}
        </Button>
      )}
      {state.titles.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-3 p-2 rounded-lg border ${
            t.equipped ? 'border-gold/60 bg-gold/10' : t.unlocked ? 'border-border bg-secondary/20' : 'border-border/40 bg-secondary/10 opacity-60'
          }`}
        >
          <span className="text-xl shrink-0">{t.unlocked ? t.icon : '🔒'}</span>
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium truncate ${t.unlocked ? t.colorClass : 'text-muted-foreground'}`}>
              {t.nameRu}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">{t.descriptionRu}</div>
          </div>
          {t.unlocked && !t.equipped && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] shrink-0 border-border"
              disabled={loading || equippingTitleId !== null}
              onClick={() => onEquipTitle(t.id)}
            >
              {equippingTitleId === t.id ? '...' : 'Надеть'}
            </Button>
          )}
          {t.equipped && (
            <span className="text-[10px] text-gold shrink-0">Надет</span>
          )}
        </div>
      ))}
    </div>
  );
}
