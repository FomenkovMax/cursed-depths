import { useEffect, useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CharacterSlotsStateView, RaceData } from '@/lib/game-types';

interface CharacterSlotsTabProps {
  state: CharacterSlotsStateView | null;
  loading: boolean;
  creating: boolean;
  switchingId: string | null;
  onCreateCharacter: (name: string, race: string, className: string) => void;
  onSwitchCharacter: (characterId: string) => void;
}

/** Второй слот персонажа с общим telegramId-аккаунтом (аудит 4.1, D1/D3, lib/account-slots.ts).
 * Форма создания здесь — упрощённая (без пошагового мастера CharacterCreationScreen.tsx): один
 * экран с выбором расы/класса из выпадающих списков, этого достаточно для второго персонажа. */
export function CharacterSlotsTab({ state, loading, creating, switchingId, onCreateCharacter, onSwitchCharacter }: CharacterSlotsTabProps) {
  const [races, setRaces] = useState<RaceData[]>([]);
  const [name, setName] = useState('');
  const [raceSlug, setRaceSlug] = useState('');
  const [classSlug, setClassSlug] = useState('');

  useEffect(() => {
    fetch('/api/races').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setRaces(data);
    }).catch(() => {});
  }, []);

  const selectedRace = races.find(r => r.slug === raceSlug);
  const canCreate = name.trim().length >= 2 && raceSlug && classSlug;
  const hasSecondSlot = (state?.characters.length ?? 0) >= (state?.maxSlots ?? 2);

  return (
    <TabsContent value="characters" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
      <Card className="border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">🎭 Персонажи аккаунта</CardTitle>
          <p className="text-[10px] text-muted-foreground leading-relaxed pt-0.5">
            До {state?.maxSlots ?? 2} персонажей на один Telegram-аккаунт. Активен всегда только один —
            переключение полностью меняет, кем вы играете (прогресс, инвентарь, всё), но не удаляет
            неактивного персонажа.
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          {(state?.characters ?? []).map(c => (
            <div key={c.id} className={`flex items-center gap-2.5 p-2 rounded-lg border ${c.active ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
              <span className="text-2xl">{c.class.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">
                  {c.name}
                  {c.active && <Badge className="ml-1 text-[9px] h-4 px-1 bg-primary/20 text-primary">активен</Badge>}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {c.race.icon} {c.race.nameRu} • Ур. {c.level} • {c.class.name}
                </div>
              </div>
              {!c.active && (
                <Button
                  variant="outline"
                  className="h-8 text-[10px] border-border shrink-0"
                  disabled={loading || switchingId === c.id}
                  onClick={() => onSwitchCharacter(c.id)}
                >
                  {switchingId === c.id ? 'Переключение...' : 'Играть'}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {!hasSecondSlot && (
        <Card className="border-border">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm">✨ Создать второго персонажа</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            <Input
              placeholder="Имя персонажа"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
            />
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={raceSlug}
              onChange={e => { setRaceSlug(e.target.value); setClassSlug(''); }}
            >
              <option value="">Выберите расу</option>
              {races.map(r => <option key={r.slug} value={r.slug}>{r.icon} {r.name}</option>)}
            </select>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={classSlug}
              onChange={e => setClassSlug(e.target.value)}
              disabled={!selectedRace}
            >
              <option value="">Выберите класс</option>
              {(selectedRace?.classes ?? []).map(c => <option key={c.slug} value={c.slug}>{c.icon} {c.name}</option>)}
            </select>
            <Button
              className="w-full"
              disabled={loading || creating || !canCreate}
              onClick={() => onCreateCharacter(name.trim(), raceSlug, classSlug)}
            >
              Создать
            </Button>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}
