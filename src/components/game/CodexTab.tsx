import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
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

export function CodexTab({ entries, loading }: CodexTabProps) {
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
          <div key={category} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground pt-1">{CATEGORY_LABELS[category] ?? category}</p>
            {entries.filter(e => e.category === category).map(e => (
              <Card key={e.id} className={`border-border ${e.unlocked ? 'border-gold/60 bg-gold/5' : 'opacity-50'}`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl shrink-0">{e.unlocked ? e.icon : '🔒'}</span>
                    <span className="text-xs font-medium">{e.titleRu}</span>
                  </div>
                  {e.unlocked && e.textRu && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-1.5">{e.textRu}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ))
      )}
    </TabsContent>
  );
}
