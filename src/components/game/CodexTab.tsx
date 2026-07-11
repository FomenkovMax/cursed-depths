import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CodexEntryView } from '@/lib/game-types';

interface CodexTabProps {
  entries: CodexEntryView[];
  loading: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  origin: 'Начало времён',
  pillar: 'Четыре Столпа',
  path: 'Пути',
  ancestor: 'Прародители',
  discovery: 'Находки',
};

function CodexTile({ e, onClick }: { e: CodexEntryView; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative aspect-square rounded-lg border flex items-center justify-center transition-colors hover:bg-secondary/40 ${
        e.unlocked ? 'border-gold/70 bg-gold/10' : 'border-border bg-secondary/20 opacity-60'
      }`}
    >
      <span className="text-2xl">{e.unlocked ? e.icon : '🔒'}</span>
    </button>
  );
}

export function CodexTab({ entries, loading }: CodexTabProps) {
  const [selected, setSelected] = useState<CodexEntryView | null>(null);
  const unlockedCount = entries.filter(e => e.unlocked).length;
  const categories = Array.from(new Set(entries.map(e => e.category)));

  return (
    <TabsContent value="codex" className="flex-1 overflow-y-auto p-4 space-y-3 m-0">
      <div className="text-center mb-2">
        <h3 className="font-bold text-sm">📖 Лор-кодекс</h3>
        <p className="text-xs text-muted-foreground">
          Открыто {unlockedCount} из {entries.length} записей — играйте, чтобы узнать больше о мире
        </p>
      </div>

      {loading && entries.length === 0 ? (
        <Card className="border-border">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          </CardContent>
        </Card>
      ) : (
        categories.map(category => (
          <Card key={category} className="border-border">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">{CATEGORY_LABELS[category] ?? category}</p>
              <div className="grid grid-cols-5 gap-2">
                {entries.filter(e => e.category === category).map(e => (
                  <CodexTile key={e.id} e={e} onClick={() => setSelected(e)} />
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-xs">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-sm">
                  <span className="text-2xl">{selected.unlocked ? selected.icon : '🔒'}</span>
                  <span className={selected.unlocked ? 'text-gold' : ''}>{selected.titleRu}</span>
                </DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {selected.unlocked ? (selected.textRu ?? '') : 'Запись пока не открыта — продолжайте играть, чтобы узнать больше.'}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}
