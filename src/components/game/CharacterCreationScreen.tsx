import { RACES, CLASSES } from '@/lib/game-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { GameMessage, STAT_NAMES_RU, STAT_SHORT_RU } from '@/lib/game-types';

interface CharacterCreationScreenProps {
  message: GameMessage;
  onDismissMessage: () => void;
  creationStep: number;
  setCreationStep: (updater: (prev: number) => number) => void;
  charName: string;
  setCharName: (name: string) => void;
  charRace: string;
  setCharRace: (raceId: string) => void;
  charClass: string;
  setCharClass: (classId: string) => void;
  loading: boolean;
  onCreatePlayer: () => void;
}

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
  const raceData = RACES.find(r => r.id === charRace);
  const classData = CLASSES.find(c => c.id === charClass);

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      <div className="text-center mb-6 pt-4">
        <div className="text-5xl mb-2">👑</div>
        <h1 className="text-2xl font-bold text-primary">Cursed Depths</h1>
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
              <ScrollArea className="h-[45vh]">
                <div className="grid gap-2 pr-2">
                  {RACES.map(race => (
                    <button
                      key={race.id}
                      onClick={() => setCharRace(race.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        charRace === race.id
                          ? 'border-primary bg-primary/10 animate-glow'
                          : 'border-border bg-card hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{race.icon}</span>
                        <div className="flex-1">
                          <div className="font-bold text-sm">{race.nameRu}</div>
                          <div className="text-xs text-muted-foreground">{race.descriptionRu}</div>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {Object.entries(race.bonuses).map(([stat, val]) => (
                              <Badge key={stat} variant="outline" className="text-[10px] h-5 px-1">
                                {STAT_SHORT_RU[stat]} +{val}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Step 2: Class */}
          {creationStep === 2 && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-bold mb-3 text-center">Выберите класс</h2>
              <ScrollArea className="h-[45vh]">
                <div className="grid gap-2 pr-2">
                  {CLASSES.map(cls => (
                    <button
                      key={cls.id}
                      onClick={() => setCharClass(cls.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        charClass === cls.id
                          ? 'border-primary bg-primary/10 animate-glow'
                          : 'border-border bg-card hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{cls.icon}</span>
                        <div className="flex-1">
                          <div className="font-bold text-sm">{cls.nameRu}</div>
                          <div className="text-xs text-muted-foreground">{cls.descriptionRu}</div>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] h-5 px-1 text-hp">
                              HP: {cls.baseHp}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] h-5 px-1 text-mp">
                              MP: {cls.baseMp}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] h-5 px-1 text-gold">
                              {STAT_NAMES_RU[cls.primaryStat]}
                            </Badge>
                          </div>
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
                    <div className="text-4xl mb-2">{raceData?.icon} {classData?.icon}</div>
                    <h3 className="text-xl font-bold text-primary">{charName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {raceData?.nameRu} • {classData?.nameRu}
                    </p>
                  </div>
                  <Separator className="my-3 bg-border" />
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    {raceData && Object.entries(raceData.bonuses).map(([stat, val]) => {
                      const base = 10 + val;
                      return (
                        <div key={stat} className="bg-secondary/50 rounded p-2">
                          <div className="text-xs text-muted-foreground">{STAT_SHORT_RU[stat]}</div>
                          <div className="font-bold">{base}</div>
                        </div>
                      );
                    })}
                  </div>
                  <Separator className="my-3 bg-border" />
                  <div className="flex justify-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-hp font-bold">{classData?.baseHp}</div>
                      <div className="text-xs text-muted-foreground">HP</div>
                    </div>
                    <div className="text-center">
                      <div className="text-mp font-bold">{classData?.baseMp}</div>
                      <div className="text-xs text-muted-foreground">MP</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <p className="text-xs text-muted-foreground text-center">
                Нажав &quot;Начать приключение&quot;, вы вступаете в мир Проклятых Глубин
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
