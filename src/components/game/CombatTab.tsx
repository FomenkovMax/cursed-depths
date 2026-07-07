import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ENEMIES } from '@/lib/game-data';
import { manaCostForStage } from '@/lib/combat-engine';
import { PlayerData, AbilityData, CombatLogEntry, parseStats } from '@/lib/game-types';

interface CombatTabProps {
  player: PlayerData | null;
  enemy: typeof ENEMIES[0] | null;
  shaking: boolean;
  floatingDamage: { id: number; text: string; color: string }[];
  combatLog: CombatLogEntry[];
  loading: boolean;
  availableAbilities: AbilityData[];
  onCombatAction: (action: string, itemId?: string, abilityId?: string) => void;
  onGoToOverview: () => void;
}

export function CombatTab({
  player,
  enemy,
  shaking,
  floatingDamage,
  combatLog,
  loading,
  availableAbilities,
  onCombatAction,
  onGoToOverview,
}: CombatTabProps) {
  const playerInventory = player?.inventory || [];

  return (
    <TabsContent value="combat" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
      {player?.inCombat && enemy ? (
        <>
          {/* Enemy card */}
          <Card className={`border-destructive/50 ${shaking ? 'animate-shake' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{enemy.icon}</span>
                  <div>
                    <h3 className="font-bold text-sm" style={{ color: enemy.isBoss ? '#f59e0b' : '#ef4444' }}>
                      {enemy.nameRu}
                      {enemy.isBoss && <Badge className="ml-1 text-[10px] h-4 bg-gold/20 text-gold">БОСС</Badge>}
                    </h3>
                    <div className="text-[10px] text-muted-foreground">
                      AC {enemy.ac} • АТК +{enemy.attack} • Урон {enemy.damage}
                    </div>
                  </div>
                </div>
                {/* Floating damage numbers */}
                <div className="relative">
                  {floatingDamage.map(fd => (
                    <div key={fd.id} className="animate-float-up absolute -top-4 right-0 font-bold text-lg" style={{ color: fd.color }}>
                      {fd.text}
                    </div>
                  ))}
                </div>
              </div>
              {/* Enemy HP bar */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-hp font-bold w-6">HP</span>
                <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-hp rounded-full transition-all duration-500"
                    style={{ width: `${player.enemyMaxHp ? Math.max(0, (player.enemyHp! / player.enemyMaxHp) * 100) : 0}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right">
                  {player.enemyHp}/{player.enemyMaxHp}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Combat log */}
          <Card className="border-border">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm">Журнал боя</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <ScrollArea className="h-32">
                <div className="space-y-1">
                  {combatLog.map((entry, i) => (
                    <p key={i} className={`text-xs leading-relaxed ${
                      entry.text.includes('критический') || entry.text.includes('КРИТ') ? 'text-gold font-bold' :
                      entry.text.includes('повержен') || entry.text.includes('Победа') ? 'text-uncommon font-bold' :
                      entry.text.includes('погибли') ? 'text-destructive font-bold' :
                      entry.text.includes('атакует') && entry.text.includes('Урон') ? 'text-destructive' :
                      entry.text.includes('Вы атакуете') || entry.text.includes('заклинание') ? 'text-primary' :
                      'text-muted-foreground'
                    }`}>
                      {entry.text}
                    </p>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Combat actions */}
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="h-12"
                  onClick={() => onCombatAction('attack')}
                  disabled={loading}
                >
                  ⚔️ Атака
                </Button>
                <Button
                  variant="outline"
                  className="h-12 border-border"
                  onClick={() => onCombatAction('flee')}
                  disabled={loading}
                >
                  🏃 Побег
                </Button>

                {/* Use item in combat */}
                {playerInventory.filter(i => i.type === 'consumable').length > 0 && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Использовать предмет:</p>
                    <ScrollArea className="max-h-24">
                      <div className="flex gap-1 flex-wrap">
                        {playerInventory.filter(i => i.type === 'consumable').map(item => {
                          const stats = parseStats(item.stats);
                          return (
                            <Button
                              key={item.id}
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs border-border"
                              onClick={() => onCombatAction('use_item', item.itemId)}
                              disabled={loading}
                            >
                              {item.icon} {item.name} {item.quantity > 1 ? `x${item.quantity}` : ''}
                            </Button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Class Abilities */}
                {availableAbilities.length > 0 && (
                  <div className="col-span-2 mt-2">
                    <p className="text-xs text-muted-foreground mb-1.5">Способности:</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {availableAbilities.map((ability: AbilityData) => {
                        const manaCost = manaCostForStage(ability.stage);
                        const canUse = !loading && player.inCombat && player.mp >= manaCost;
                        return (
                          <Button
                            key={ability.id}
                            variant="outline"
                            className={`h-auto py-2 px-2 border-border text-xs ${!canUse ? 'opacity-50' : ''}`}
                            disabled={!canUse}
                            onClick={() => onCombatAction('ability', undefined, ability.id)}
                            title={ability.description}
                          >
                            <div className="text-left">
                              <div className="font-medium">{ability.icon} {ability.name}</div>
                              <div className="text-[10px] text-muted-foreground">{manaCost} маны</div>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        /* No combat */
        <Card className="border-border">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-3">⚔️</div>
            <h3 className="font-bold mb-1">Нет активного боя</h3>
            <p className="text-sm text-muted-foreground mb-4">Исследуйте локацию, чтобы найти врагов</p>
            <Button onClick={onGoToOverview} variant="outline" className="border-border">
              🏠 На главную
            </Button>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}
