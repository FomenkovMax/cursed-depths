import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ItemIconTile } from '@/components/game/ItemIconTile';
import { AssetIcon } from '@/components/game/AssetIcon';
import { ENEMIES } from '@/lib/game-data';
import { manaCostForStage } from '@/lib/combat/combat-engine';
import type { BossFightState } from '@/lib/combat/boss-mechanics';
import { PlayerData, AbilityData, CombatLogEntry } from '@/lib/game-types';
import { findDungeon } from '@/lib/combat/dungeons';
import { findDungeonModifier, heatLevelLabel } from '@/lib/combat/dungeon-modifiers';
import { isEliteDepth } from '@/lib/combat/abyss';
import { BOSS_PORTRAIT_IMAGES, ENEMY_ICON_IMAGES, ABILITY_ICON_IMAGES } from '@/lib/asset-icons';

const ACTIVE_EFFECT_LABELS: Record<string, string> = {
  player_damage_buff: 'Урон усилен',
  enemy_damage_debuff: 'Враг ослаблен',
  enemy_dot: 'Враг горит',
  on_block_counter_active: 'Контрудар после блока',
  debuff_amplify: 'Дебаффы усилены',
};

const ARMED_EFFECT_LABELS: Record<string, string> = {
  reduce_next_incoming: 'Снижает след. удар',
  boost_next_outgoing: 'След. атака изменена',
  next_attack_crit: 'След. атака — крит',
  next_attack_lifesteal: 'След. атака лечит',
  next_attack_ignore_defense: 'След. атака игнорирует броню',
};

interface CombatTabProps {
  player: PlayerData | null;
  enemy: typeof ENEMIES[0] | null;
  shaking: boolean;
  enemyHitFlash: boolean;
  abilityCastGlow: boolean;
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
  enemyHitFlash,
  abilityCastGlow,
  floatingDamage,
  combatLog,
  loading,
  availableAbilities,
  onCombatAction,
  onGoToOverview,
}: CombatTabProps) {
  const playerInventory = player?.inventory || [];

  // bossState — общий стейт ЛЮБОГО боя (не только боссового, несмотря на название, см.
  // lib/combat/boss-mechanics.ts), поэтому парсим его всегда, когда он есть, а не только для боссов —
  // иначе баффы/дебаффы/щит/кулдауны/заряды для обычных врагов нигде бы не отображались.
  let bossState: BossFightState | null = null;
  if (player?.bossState) {
    try { bossState = JSON.parse(player.bossState); } catch { bossState = null; }
  }

  const dungeon = player?.dungeonId ? findDungeon(player.dungeonId) : null;
  const dungeonModifier = player?.dungeonId ? findDungeonModifier(player.dungeonModifierId) : null;

  return (
    <TabsContent value="combat" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
      {player?.inCombat && enemy ? (
        <>
          {/* Индикатор забега по данжу — см. lib/combat/dungeons.ts — и его модификатора, если выпал
              (lib/combat/dungeon-modifiers.ts). */}
          {dungeon && (
            <div className="text-center space-x-1">
              <Badge className="text-[10px] h-5 bg-gold/20 text-gold">
                {dungeon.icon} {dungeon.nameRu} — Комната {player.dungeonRoom + 1}/{dungeon.roomCount}
              </Badge>
              {dungeonModifier && (
                <Badge className="text-[10px] h-5 bg-destructive/20 text-destructive" title={dungeonModifier.descriptionRu}>
                  {dungeonModifier.icon} {dungeonModifier.nameRu}
                </Badge>
              )}
              {!!player?.dungeonHeatLevel && (
                <Badge className="text-[10px] h-5 bg-gold/20 text-gold" title="Выбранный риск-уровень">
                  {heatLevelLabel(player.dungeonHeatLevel).icon} ур. {player.dungeonHeatLevel}
                </Badge>
              )}
            </div>
          )}

          {/* Индикатор глубины Бездонного Разлома — см. lib/combat/abyss.ts */}
          {!dungeon && player && player.abyssDepth > 0 && (
            <div className="text-center">
              <Badge className={`text-[10px] h-5 ${isEliteDepth(player.abyssDepth) ? 'bg-destructive/20 text-destructive' : 'bg-destructive/10 text-destructive/80'}`}>
                🌀 Разлом — Глубина {player.abyssDepth}{isEliteDepth(player.abyssDepth) ? ' ⚠️ Элита' : ''} (рекорд {player.bestAbyssDepth})
              </Badge>
            </div>
          )}

          {/* Enemy card */}
          <Card className={`border-destructive/50 ${shaking ? 'animate-shake' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Портрет врага — реальный AI-арт: боссы (BOSS_PORTRAIT_IMAGES) и обычные враги
                      (ENEMY_ICON_IMAGES) в src/lib/asset-icons.ts, эмодзи — только запасной вариант.
                      Реакция на удар и луч способности навешаны на обёртку, а не на конкретный
                      <span>/<img>, поэтому подмена работает без переделки анимаций. */}
                  <div className={`relative w-10 h-10 flex items-center justify-center overflow-hidden rounded ${enemyHitFlash ? 'animate-enemy-hit' : ''}`}>
                    {enemy.isBoss && BOSS_PORTRAIT_IMAGES[enemy.id] ? (
                      <img src={BOSS_PORTRAIT_IMAGES[enemy.id]} alt="" className="w-full h-full object-cover object-top" />
                    ) : ENEMY_ICON_IMAGES[enemy.id] ? (
                      <img src={ENEMY_ICON_IMAGES[enemy.id]} alt="" className="w-full h-full object-cover object-top" />
                    ) : (
                      <span className="text-3xl">{enemy.icon}</span>
                    )}
                    {abilityCastGlow && (
                      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="animate-ability-beam absolute -inset-y-6 w-4 bg-gradient-to-b from-transparent via-gold/90 to-transparent blur-[1px]" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm" style={{ color: enemy.isBoss ? '#f59e0b' : '#ef4444' }}>
                      {enemy.nameRu}
                      {enemy.isBoss && <Badge className="ml-1 text-[10px] h-4 bg-gold/20 text-gold">БОСС</Badge>}
                    </h3>
                    <div className="text-[10px] text-muted-foreground">
                      {/* "Класс Брони" переименован в "Защита" (аудит 2.3) — поле снижает урон
                          напрямую (mitigateDamage), броска на попадание нет, а ярлык "AC" обещал
                          игроку D&D-механику шанса промаха, которой в бою не существует. */}
                      Защита {enemy.ac} • АТК +{enemy.attack} • Урон {enemy.damage}
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
              {/* Boss shield bar */}
              {enemy.mechanics?.shieldMax && bossState && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-primary font-bold w-6">🛡️</span>
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(0, (bossState.shieldHp / enemy.mechanics.shieldMax) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-16 text-right">
                    {bossState.shieldBroken ? 'берсерк!' : `${bossState.shieldHp}/${enemy.mechanics.shieldMax}`}
                  </span>
                </div>
              )}
              {/* Boss phase indicator */}
              {enemy.mechanics && bossState && bossState.phase > 1 && (
                <Badge className="mt-2 text-[10px] h-4 bg-destructive/20 text-destructive">
                  Фаза {bossState.phase}
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Player active effects: щит, баффы/дебаффы, активированные стойки, заряженные эффекты */}
          {bossState && (bossState.playerShieldHp > 0 || bossState.activeEffects.length > 0 || bossState.armedEffects.length > 0) && (
            <Card className="border-border">
              <CardContent className="p-3">
                <div className="flex flex-wrap gap-1.5">
                  {bossState.playerShieldHp > 0 && (
                    <Badge className="text-[10px] h-5 bg-primary/20 text-primary">
                      🛡️ Щит: {bossState.playerShieldHp} ХП
                    </Badge>
                  )}
                  {bossState.activeEffects.map((e, i) => (
                    <Badge key={`ae-${i}`} variant="outline" className="text-[10px] h-5 border-border">
                      {ACTIVE_EFFECT_LABELS[e.kind] ?? e.kind} {Math.round(e.percent * 100)}% ({e.turnsRemaining} х.)
                    </Badge>
                  ))}
                  {bossState.armedEffects.map((e, i) => (
                    <Badge key={`arm-${i}`} variant="outline" className="text-[10px] h-5 border-gold/50 text-gold">
                      ⚡ {ARMED_EFFECT_LABELS[e.kind] ?? e.kind}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
                  onClick={() => onCombatAction('defend')}
                  disabled={loading}
                >
                  🛡️ Защита
                </Button>
                <Button
                  variant="outline"
                  className="h-12 border-border col-span-2"
                  onClick={() => onCombatAction('flee')}
                  disabled={loading}
                >
                  🏃 Побег
                </Button>

                {/* Use item in combat — сетка иконок вместо кнопок с именем текстом, как везде
                    в остальном интерфейсе; native overflow, не Radix ScrollArea (та рендерит
                    содержимое в display:table для замера размеров, что ломало прежний flex-wrap —
                    с grid эта проблема не воспроизводится, но оставляем нативный скролл ради
                    единообразия с остальными плиточными гридами). */}
                {playerInventory.filter(i => i.type === 'consumable').length > 0 && (
                  <div className="col-span-2 border border-border/60 rounded-md p-2 bg-secondary/20">
                    <p className="text-xs text-muted-foreground mb-1.5">Использовать предмет:</p>
                    <div className="max-h-28 overflow-y-auto pr-1">
                      <div className="grid grid-cols-6 gap-1.5">
                        {playerInventory.filter(i => i.type === 'consumable').map(item => (
                          <ItemIconTile
                            key={item.id}
                            item={item}
                            onClick={() => onCombatAction('use_item', item.itemId)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Class Abilities */}
                {availableAbilities.length > 0 && (
                  <div className="col-span-2 mt-2 pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1.5">Способности:</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {availableAbilities.map((ability: AbilityData) => {
                        const manaCost = manaCostForStage(ability.stage);
                        const cooldown = bossState?.abilityCooldowns?.[ability.slug] ?? 0;
                        const canUse = !loading && player.inCombat && player.mp >= manaCost && cooldown <= 0;
                        return (
                          <Button
                            key={ability.id}
                            variant="outline"
                            className={`h-auto py-2 px-2 border-border text-xs ${!canUse ? 'opacity-50' : ''}`}
                            disabled={!canUse}
                            onClick={() => onCombatAction('ability', undefined, ability.id)}
                            title={ability.description}
                          >
                            <div className="text-left flex items-center gap-1.5">
                              <AssetIcon src={ABILITY_ICON_IMAGES[ability.slug]} emoji={ability.icon} size={20} className="text-base shrink-0" />
                              <div>
                                <div className="font-medium">{ability.name}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {cooldown > 0 ? `КД: ${cooldown} х.` : `${manaCost} маны`}
                                </div>
                              </div>
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
