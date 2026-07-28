'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { GameMessage, RaceData, STAT_SHORT_RU, PATH_NAMES_RU, ROLE_NAMES_RU } from '@/lib/game-types';
import { RACE_PORTRAIT_IMAGES, CLASS_PORTRAIT_IMAGES } from '@/lib/asset-icons';

// Короткая философия каждого Пути из мифологии мира (см. lib/social/codex.ts 'karsus_paths') —
// связывает механический выбор класса (path: 'ash'|'blight') с тем, ЧТО это значит в лоре,
// прямо в момент выбора, а не только постфактум в кодексе, до которого игрок дойдёт нескоро.
const PATH_FLAVOR_RU: Record<string, string> = {
  ash: 'Путь тех, кто услышал правду Карсуса, сгорел в ней — и возродился честнее.',
  blight: 'Путь тех, кто услышал правду Карсуса и сгнил в ней, выстроив себя заново из того, что осталось.',
};

interface CharacterCreationScreenProps {
  message: GameMessage;
  onDismissMessage: () => void;
  creationStep: number;
  setCreationStep: (updater: (prev: number) => number) => void;
  charName: string;
  setCharName: (name: string) => void;
  charRace: string;
  setCharRace: (raceSlug: string) => void;
  charClass: string;
  setCharClass: (classSlug: string) => void;
  loading: boolean;
  onCreatePlayer: () => void;
}

const RACE_STATS: { key: keyof RaceData; short: string }[] = [
  { key: 'baseStrength', short: STAT_SHORT_RU.strength },
  { key: 'baseDexterity', short: STAT_SHORT_RU.dexterity },
  { key: 'baseVitality', short: STAT_SHORT_RU.vitality },
  { key: 'baseIntellect', short: STAT_SHORT_RU.intellect },
  { key: 'baseWillpower', short: STAT_SHORT_RU.willpower },
  { key: 'baseInstinct', short: STAT_SHORT_RU.instinct },
];

export function CharacterCreationScreen({
  message,
  onDismissMessage,
  creationStep,
  setCreationStep,
  charName,
  setCharName,
  charRace,
  setCharRace,
  charClass,
  setCharClass,
  loading,
  onCreatePlayer,
}: CharacterCreationScreenProps) {
  const [races, setRaces] = useState<RaceData[]>([]);
  const [racesLoading, setRacesLoading] = useState(true);

  useEffect(() => {
    fetch('/api/races')
      .then(r => r.json())
      .then((data: RaceData[]) => setRaces(data))
      .catch(() => setRaces([]))
      .finally(() => setRacesLoading(false));
  }, []);

  const raceData = races.find(r => r.slug === charRace);
  const classes = raceData?.classes ?? [];
  const classData = classes.find(c => c.slug === charClass);

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      <div className="text-center mb-6 pt-4">
        <h1 className="font-display text-2xl font-bold text-primary">Cursed Depths</h1>
        <p className="text-muted-foreground text-sm mt-1">Проклятые Глубины</p>
      </div>

      {/* Message toast in creation screen */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm text-center animate-fade-in cursor-pointer ${
            message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
            message.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
            'bg-primary/20 text-primary border border-primary/30'
          }`}
          onClick={onDismissMessage}
        >
          {message.text}
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {['Имя', 'Раса', 'Класс', 'Готово'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              i <= creationStep ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            }`}>
              {i < creationStep ? '✓' : i + 1}
            </div>
            {i < 3 && <div className={`w-8 h-0.5 ${i < creationStep ? 'bg-primary' : 'bg-secondary'}`} />}
          </div>
        ))}
      </div>

      <Card className="flex-1 border-border">
        <CardContent className="p-4">
          {/* Step 0: Name */}
          {creationStep === 0 && (
            <div className="animate-fade-in">
              <p className="text-xs text-muted-foreground text-center leading-relaxed mb-4 italic">
                Вы приходите в себя среди пепла, не помня, как здесь оказались — лишь шрам через
                полмира и эхо голоса Карсуса в ушах, всё ещё зовущего вас по имени.
                Того имени вы уже не помните. Самое время выбрать новое.
              </p>
              <h2 className="text-lg font-bold mb-4 text-center">Как вас зовут, искатель?</h2>
              <Input
                value={charName}
                onChange={e => setCharName(e.target.value)}
                placeholder="Введите имя персонажа..."
                className="bg-secondary border-border text-foreground text-center text-lg h-12"
                maxLength={20}
                onKeyDown={e => { if (e.key === 'Enter' && charName.trim()) setCreationStep(() => 1); }}
              />
              <p className="text-muted-foreground text-xs mt-2 text-center">Это имя будет известно по всем Проклятым Глубинам</p>
            </div>
          )}

          {/* Step 1: Race */}
          {creationStep === 1 && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-bold mb-3 text-center">Выберите расу</h2>
              {/* Портрет выбранной расы — крупный painterly-арт (см. src/lib/asset-icons.ts),
                  обновляется по клику на карточку ниже, список карточек остаётся компактным. */}
              {charRace && RACE_PORTRAIT_IMAGES[charRace] && (
                <div className="mb-3 rounded-lg overflow-hidden border border-primary/40 aspect-[3/4] max-h-[420px] bg-secondary/20">
                  <img src={RACE_PORTRAIT_IMAGES[charRace]} alt="" className="w-full h-full object-cover object-top" />
                </div>
              )}
              {racesLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Загрузка рас...</p>
              ) : (
                <ScrollArea className="h-[45vh]">
                  <div className="grid gap-2 pr-2">
                    {races.map(race => (
                      <button
                        key={race.slug}
                        onClick={() => { setCharRace(race.slug); setCharClass(''); }}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          charRace === race.slug
                            ? 'border-primary bg-primary/10 animate-glow'
                            : 'border-border bg-card hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{race.icon}</span>
                          <div className="flex-1">
                            <div className="font-bold text-sm">{race.name}</div>
                            <div className="text-xs text-muted-foreground">{race.description}</div>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {RACE_STATS.map(({ key, short }) => (
                                <Badge key={key} variant="outline" className="text-[10px] h-5 px-1">
                                  {short} {race[key] as number}
                                </Badge>
                              ))}
                            </div>
                            {/* Лор прародителя расы (race.lore, seed-data.ts) — раскрывается только
                                при выборе, чтобы список карточек остался обозримым, но выбор
                                вознаграждался историей, а не только цифрами статов. */}
                            {charRace === race.slug && race.lore && (
                              <p className="text-[11px] text-muted-foreground leading-relaxed mt-2 pt-2 border-t border-border/60 italic">
                                {race.lore}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {/* Step 2: Class */}
          {creationStep === 2 && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-bold mb-3 text-center">Выберите класс</h2>
              {charClass && CLASS_PORTRAIT_IMAGES[charClass] && (
                <div className="mb-3 rounded-lg overflow-hidden border border-primary/40 aspect-[3/4] max-h-[420px] bg-secondary/20">
                  <img src={CLASS_PORTRAIT_IMAGES[charClass]} alt="" className="w-full h-full object-cover object-top" />
                </div>
              )}
              <ScrollArea className="h-[45vh]">
                <div className="grid gap-2 pr-2">
                  {classes.map(cls => (
                    <button
                      key={cls.slug}
                      onClick={() => setCharClass(cls.slug)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        charClass === cls.slug
                          ? 'border-primary bg-primary/10 animate-glow'
                          : 'border-border bg-card hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{cls.icon}</span>
                        <div className="flex-1">
                          <div className="font-bold text-sm">{cls.name}</div>
                          <div className="text-xs text-muted-foreground">{cls.description}</div>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] h-5 px-1 ${cls.path === 'ash' ? 'text-gold' : 'text-destructive'}`}>
                              {PATH_NAMES_RU[cls.path]}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] h-5 px-1">
                              {ROLE_NAMES_RU[cls.role] ?? cls.role}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] h-5 px-1 text-mp">
                              {cls.primaryStat}
                            </Badge>
                          </div>
                          {/* Философия Пути (karsus_paths, lib/social/codex.ts) — тот же принцип, что и
                              лор расы выше: разворачивается только для выбранного класса. */}
                          {charClass === cls.slug && (
                            <p className="text-[11px] text-muted-foreground leading-relaxed mt-2 pt-2 border-t border-border/60 italic">
                              {PATH_FLAVOR_RU[cls.path]}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Step 3: Confirm */}
          {creationStep === 3 && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-bold mb-3 text-center">Подтвердите выбор</h2>
              <Card className="border-primary/50 bg-card mb-4">
                <CardContent className="p-4">
                  <div className="text-center mb-4">
                    {classData && CLASS_PORTRAIT_IMAGES[classData.slug] ? (
                      <div className="mb-2 rounded-lg overflow-hidden border border-primary/40 aspect-[3/4] max-w-[200px] mx-auto bg-secondary/20">
                        <img src={CLASS_PORTRAIT_IMAGES[classData.slug]} alt="" className="w-full h-full object-cover object-top" />
                      </div>
                    ) : (
                      <div className="text-4xl mb-2">{raceData?.icon} {classData?.icon}</div>
                    )}
                    <h3 className="text-xl font-bold text-primary">{charName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {raceData?.name} • {classData?.name}
                    </p>
                    {classData && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {PATH_NAMES_RU[classData.path]} • {ROLE_NAMES_RU[classData.role] ?? classData.role}
                      </p>
                    )}
                  </div>
                  <Separator className="my-3 bg-border" />
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    {raceData && RACE_STATS.map(({ key, short }) => (
                      <div key={key} className="bg-secondary/50 rounded p-2">
                        <div className="text-xs text-muted-foreground">{short}</div>
                        <div className="font-bold">{raceData[key] as number}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <p className="text-xs text-muted-foreground text-center leading-relaxed italic px-2">
                {charName} очнётся у Пепельных Врат без памяти о прошлом — лишь эхо голоса Карсуса
                в ушах{raceData ? ` и наследие расы «${raceData.name}» за плечами` : ''}.
                {classData && ` ${PATH_FLAVOR_RU[classData.path]}`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons - sticky at bottom */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm py-3 px-4 flex gap-2 border-t border-border mt-auto">
        {creationStep > 0 && (
          <Button
            variant="outline"
            className="flex-1 border-border"
            onClick={() => setCreationStep(prev => prev - 1)}
          >
            Назад
          </Button>
        )}
        {creationStep < 3 && (
          <Button
            className="flex-1"
            disabled={
              (creationStep === 0 && !charName.trim()) ||
              (creationStep === 1 && !charRace) ||
              (creationStep === 2 && !charClass)
            }
            onClick={() => setCreationStep(prev => prev + 1)}
          >
            Далее
          </Button>
        )}
        {creationStep === 3 && (
          <Button
            className="flex-1"
            disabled={loading}
            onClick={onCreatePlayer}
          >
            {loading ? 'Создание...' : '⚔️ Начать приключение'}
          </Button>
        )}
      </div>
    </div>
  );
}
