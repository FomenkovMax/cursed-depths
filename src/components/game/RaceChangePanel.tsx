import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { RaceData, GameClassData, PlayerData, STAT_SHORT_RU, PATH_NAMES_RU, ROLE_NAMES_RU } from '@/lib/game-types';

interface RaceChangePanelProps {
  player: PlayerData | null;
  races: RaceData[];
  costShards: number;
  crownShards: number;
  changingRace: boolean;
  onChangeRace: (raceSlug: string, classSlug: string) => void;
}

const RACE_STAT_KEYS: { key: keyof RaceData; stat: string }[] = [
  { key: 'baseStrength', stat: 'strength' },
  { key: 'baseDexterity', stat: 'dexterity' },
  { key: 'baseVitality', stat: 'vitality' },
  { key: 'baseIntellect', stat: 'intellect' },
  { key: 'baseWillpower', stat: 'willpower' },
  { key: 'baseInstinct', stat: 'instinct' },
];

/** Предсказывает итоговый стат ПОСЛЕ смены расы — зеркалит формулу api/player/change-race
 * (newBase + вложенные очки), чтобы игрок видел реальный эффект ДО траты Осколков, а не после. */
function predictedStat(player: PlayerData, newRace: RaceData, statKey: keyof RaceData, playerStatKey: keyof PlayerData): number {
  const oldBase = player.race[statKey] as number;
  const newBase = newRace[statKey] as number;
  const allocated = Math.max(0, (player[playerStatKey] as number) - oldBase);
  return newBase + allocated;
}

const PLAYER_STAT_KEYS: Record<string, keyof PlayerData> = {
  strength: 'strength', dexterity: 'dexterity', vitality: 'vitality',
  intellect: 'intellect', willpower: 'willpower', instinct: 'instinct',
};

export function RaceChangePanel({ player, races, costShards, crownShards, changingRace, onChangeRace }: RaceChangePanelProps) {
  const [selectedRaceSlug, setSelectedRaceSlug] = useState('');
  const [selectedClassSlug, setSelectedClassSlug] = useState('');

  const selectedRace = races.find(r => r.slug === selectedRaceSlug);
  const availableClasses = selectedRace?.classes ?? [];
  const selectedClass = availableClasses.find(c => c.slug === selectedClassSlug);
  const affordable = crownShards >= costShards;
  const isNoop = selectedRace?.id === player?.raceId && selectedClass?.id === player?.classId;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-2 rounded-lg bg-secondary/20 border border-border/60">
        <span className="text-2xl">{player?.race.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{player?.race.name ?? '—'}</div>
          <div className="text-[10px] text-muted-foreground">{player?.class.name ?? '—'} — текущая раса и класс</div>
        </div>
        <span className="text-lg">→</span>
        <span className="text-2xl">{selectedClass?.icon ?? selectedRace?.icon ?? '❓'}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {races.map(race => (
          <button
            key={race.id}
            type="button"
            onClick={() => { setSelectedRaceSlug(race.slug); setSelectedClassSlug(''); }}
            className={`p-2 rounded-lg border text-center transition-colors ${
              selectedRaceSlug === race.slug
                ? 'border-primary bg-primary/10'
                : 'border-border/60 bg-secondary/10 hover:border-primary/40'
            }`}
          >
            <div className="text-xl">{race.icon}</div>
            <div className="text-[10px] font-medium leading-tight mt-0.5">{race.name}</div>
          </button>
        ))}
      </div>

      {selectedRace && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-[10px] text-muted-foreground italic px-1">{selectedRace.description}</p>

          {/* Предсказание итоговых статов — вложенные очки сохраняются, меняется только база расы. */}
          {player && (
            <div className="flex gap-1 flex-wrap px-1">
              {RACE_STAT_KEYS.map(({ key, stat }) => {
                const newVal = predictedStat(player, selectedRace, key, PLAYER_STAT_KEYS[stat]);
                const oldVal = player[PLAYER_STAT_KEYS[stat]] as number;
                const delta = newVal - oldVal;
                return (
                  <Badge key={stat} variant="outline" className="text-[10px] h-5 px-1">
                    {STAT_SHORT_RU[stat]} {newVal}
                    {delta !== 0 && (
                      <span className={delta > 0 ? 'text-green-400 ml-0.5' : 'text-destructive ml-0.5'}>
                        ({delta > 0 ? '+' : ''}{delta})
                      </span>
                    )}
                  </Badge>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {availableClasses.map(cls => (
              <button
                key={cls.id}
                type="button"
                onClick={() => setSelectedClassSlug(cls.slug)}
                className={`text-left p-2 rounded-lg border transition-colors ${
                  selectedClassSlug === cls.slug
                    ? 'border-primary bg-primary/10'
                    : 'border-border/60 bg-secondary/10 hover:border-primary/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cls.icon}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{cls.name}</div>
                    <div className="flex gap-1 mt-0.5">
                      <Badge variant="outline" className={`text-[9px] h-4 px-1 ${cls.path === 'ash' ? 'text-gold' : 'text-destructive'}`}>
                        {PATH_NAMES_RU[cls.path]}
                      </Badge>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selectedClass && (
            <p className="text-[10px] text-muted-foreground italic px-1 pt-1 border-t border-border/40">
              {selectedClass.description} · {ROLE_NAMES_RU[selectedClass.role] ?? selectedClass.role}
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={changingRace || !selectedRace || !selectedClass || isNoop || !affordable}
        onClick={() => { if (selectedRace && selectedClass) onChangeRace(selectedRace.slug, selectedClass.slug); }}
        className="w-full h-9 text-xs rounded-md border border-primary/60 text-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/10 transition-colors"
      >
        {changingRace
          ? 'Меняем...'
          : isNoop
            ? 'Это уже ваша раса и класс'
            : !affordable
              ? `Недостаточно Осколков (нужно ${costShards})`
              : `🧬 Сменить расу — 👑 ${costShards}`}
      </button>
    </div>
  );
}
