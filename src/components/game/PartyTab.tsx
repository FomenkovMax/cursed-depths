import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { manaCostForStage } from '@/lib/combat/combat-engine';
import { PartyData, PartyCombatStateResponse, AbilityData } from '@/lib/game-types';
import { BOSS_PORTRAIT_IMAGES, ENEMY_ICON_IMAGES } from '@/lib/asset-icons';

// Личные баффы/активированные стойки участника (см. PartyMemberEffectKind в
// lib/combat/party-combat-engine.ts) — те же ярлыки, что и в CombatTab.tsx для одиночного боя, плюс
// player_dodge_buff, которого у соло-боя нет отдельным полем (там смешан в activeEffects без
// подписи, тут — своя запись).
const MEMBER_EFFECT_LABELS: Record<string, string> = {
  player_damage_buff: 'Урон усилен',
  player_dodge_buff: 'Уклонение усилено',
  on_block_counter_active: 'Контрудар после блока',
  debuff_amplify: 'Дебаффы усилены',
};

// "Заряженные" одноразовые эффекты участника (см. PartyArmedEffectKind) — ждут следующего
// нанесённого/полученного удара, см. lib/combat/conditional-ability-engine.ts.
const ARMED_EFFECT_LABELS: Record<string, string> = {
  reduce_next_incoming: 'Снижает след. удар',
  boost_next_outgoing: 'След. атака изменена',
  next_attack_crit: 'След. атака — крит',
  next_attack_lifesteal: 'След. атака лечит',
  next_attack_ignore_defense: 'След. атака игнорирует броню',
};

// Общие на пати эффекты, наложенные на ВРАГА (см. PartySharedEffectKind).
const SHARED_ENEMY_EFFECT_LABELS: Record<string, string> = {
  enemy_damage_debuff: 'Враг ослаблен',
  enemy_dot: 'Враг горит',
  summon_damage: 'Скелет-союзник',
};

interface PartyTabProps {
  playerId: string | null;
  party: PartyData | null;
  combatState: PartyCombatStateResponse | null;
  loading: boolean;
  botUsername: string | null;
  availableAbilities: AbilityData[];
  playerMp: number;
  onCreateParty: () => void;
  onLeaveParty: () => void;
  onStartCombat: () => void;
  onCombatAction: (action: string, abilityId?: string) => void;
}

export function PartyTab({
  playerId,
  party,
  combatState,
  loading,
  botUsername,
  availableAbilities,
  playerMp,
  onCreateParty,
  onLeaveParty,
  onStartCombat,
  onCombatAction,
}: PartyTabProps) {
  const [copied, setCopied] = useState(false);

  const inviteLink = party && botUsername ? `https://t.me/${botUsername}?start=party_${party.id}` : null;
  const isLeader = !!party && party.leaderId === playerId;
  const isMyTurn = !!combatState && combatState.currentActingPlayerId === playerId;

  const handleCopyInvite = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Буфер обмена недоступен (напр. нет разрешения) — молча игнорируем, ссылка всё
      // равно видна в карточке ниже и её можно скопировать вручную.
    }
  };

  return (
    <TabsContent value="party" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
      {!party ? (
        <Card className="border-border">
          <CardContent className="p-6 text-center space-y-3">
            <div className="text-3xl">👥</div>
            <p className="text-sm text-muted-foreground">Вы не состоите в пати. Создайте свою, чтобы позвать друзей в совместный бой.</p>
            <Button onClick={onCreateParty} disabled={loading}>Создать пати</Button>
          </CardContent>
        </Card>
      ) : party.status === 'in_combat' && combatState?.combat && combatState.enemy ? (
        <>
          {/* Враг */}
          <Card className="border-destructive/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                {combatState.enemy.isBoss && BOSS_PORTRAIT_IMAGES[combatState.enemy.id] ? (
                  <img src={BOSS_PORTRAIT_IMAGES[combatState.enemy.id]} alt="" className="w-10 h-10 object-cover object-top rounded shrink-0" />
                ) : ENEMY_ICON_IMAGES[combatState.enemy.id] ? (
                  <img src={ENEMY_ICON_IMAGES[combatState.enemy.id]} alt="" className="w-10 h-10 object-cover object-top rounded shrink-0" />
                ) : (
                  <span className="text-3xl">{combatState.enemy.icon}</span>
                )}
                <div>
                  <h3 className="font-bold text-sm" style={{ color: combatState.enemy.isBoss ? '#f59e0b' : '#ef4444' }}>
                    {combatState.enemy.nameRu}
                    {combatState.enemy.isBoss && <Badge className="ml-1 text-[10px] h-4 bg-gold/20 text-gold">БОСС</Badge>}
                  </h3>
                  <div className="text-[10px] text-muted-foreground">Раунд {combatState.state?.round ?? 1}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-hp font-bold w-6">HP</span>
                <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-hp rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(0, (combatState.combat.enemyHp / combatState.combat.enemyMaxHp) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-20 text-right">
                  {combatState.combat.enemyHp}/{combatState.combat.enemyMaxHp}
                </span>
              </div>
              {/* Щит босса */}
              {combatState.enemy.shieldMax && combatState.state?.bossMechanics && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-primary font-bold w-6">🛡️</span>
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(0, (combatState.state.bossMechanics.shieldHp / combatState.enemy.shieldMax) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-20 text-right">
                    {combatState.state.bossMechanics.shieldBroken ? 'берсерк!' : `${combatState.state.bossMechanics.shieldHp}/${combatState.enemy.shieldMax}`}
                  </span>
                </div>
              )}
              {/* Фаза и подкрепление босса */}
              {combatState.state?.bossMechanics && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {combatState.state.bossMechanics.phase > 1 && (
                    <Badge className="text-[10px] h-4 bg-destructive/20 text-destructive">
                      Фаза {combatState.state.bossMechanics.phase}
                    </Badge>
                  )}
                  {combatState.state.bossMechanics.summonStacks > 0 && (
                    <Badge variant="outline" className="text-[10px] h-4 border-border">
                      Подкрепление: +{combatState.state.bossMechanics.summonStacks}
                    </Badge>
                  )}
                </div>
              )}
              {/* Общие дебаффы/эффекты на враге, наложенные пати */}
              {!!combatState.state?.sharedEnemyEffects.length && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {combatState.state.sharedEnemyEffects.map((e, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] h-4 border-border">
                      {SHARED_ENEMY_EFFECT_LABELS[e.kind] ?? e.kind}{' '}
                      {e.kind === 'summon_damage' ? e.percent : `${Math.round(e.percent * 100)}%`} ({e.turnsRemaining} х.)
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Участники */}
          <Card className="border-border">
            <CardContent className="px-4 py-3 space-y-2">
              {combatState.members.map(m => {
                const memberState = combatState.state?.members[m.id];
                const isTurn = combatState.currentActingPlayerId === m.id;
                const isDown = memberState && (!memberState.alive || memberState.fled);
                return (
                  <div key={m.id} className={`flex items-center gap-2.5 py-1 rounded ${isTurn ? 'bg-primary/10' : ''} ${isDown ? 'opacity-50' : ''}`}>
                    <span className="text-lg">{m.class.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">
                        {m.name}
                        {isTurn && <Badge className="ml-1 text-[9px] h-4 px-1 bg-primary/20 text-primary">ходит</Badge>}
                        {memberState?.fled && <Badge variant="outline" className="ml-1 text-[9px] h-4 px-1 border-border">сбежал</Badge>}
                        {memberState && !memberState.alive && !memberState.fled && <Badge className="ml-1 text-[9px] h-4 px-1 bg-destructive/20 text-destructive">пал</Badge>}
                        {memberState?.playerRooted && <Badge variant="outline" className="ml-1 text-[9px] h-4 px-1 border-border">🌿 укоренён</Badge>}
                        {!!memberState?.curseStacks && <Badge variant="outline" className="ml-1 text-[9px] h-4 px-1 border-border">💀 проклятие x{memberState.curseStacks}</Badge>}
                        {!!memberState?.shieldHp && <Badge variant="outline" className="ml-1 text-[9px] h-4 px-1 border-primary/50 text-primary">🛡️ {memberState.shieldHp}</Badge>}
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-hp rounded-full transition-all duration-500" style={{ width: `${Math.max(0, (m.hp / m.maxHp) * 100)}%` }} />
                      </div>
                      {/* Баффы/активированные стойки и заряженные эффекты этого участника */}
                      {(!!memberState?.activeEffects.length || !!memberState?.armedEffects.length) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {memberState?.activeEffects.map((e, i) => (
                            <Badge key={`ae-${i}`} variant="outline" className="text-[9px] h-4 px-1 border-border">
                              {MEMBER_EFFECT_LABELS[e.kind] ?? e.kind} {Math.round(e.percent * 100)}% ({e.turnsRemaining} х.)
                            </Badge>
                          ))}
                          {memberState?.armedEffects.map((e, i) => (
                            <Badge key={`arm-${i}`} variant="outline" className="text-[9px] h-4 px-1 border-gold/50 text-gold">
                              ⚡ {ARMED_EFFECT_LABELS[e.kind] ?? e.kind}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-hp shrink-0">{m.hp}/{m.maxHp}</div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Журнал боя */}
          <Card className="border-border">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm">Журнал боя</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <ScrollArea className="h-32">
                <div className="space-y-1">
                  {(combatState.state?.combatLog ?? []).map((entry, i) => (
                    <p key={i} className="text-xs leading-relaxed text-muted-foreground">{entry.text}</p>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Действия — только когда сейчас ваш ход */}
          <Card className="border-border">
            <CardContent className="p-4">
              {!isMyTurn ? (
                <p className="text-xs text-center text-muted-foreground py-2">Ожидание хода других участников...</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button className="h-12" onClick={() => onCombatAction('attack')} disabled={loading}>⚔️ Атака</Button>
                  <Button variant="outline" className="h-12 border-border" onClick={() => onCombatAction('flee')} disabled={loading}>🏃 Побег</Button>

                  {availableAbilities.length > 0 && (
                    <div className="col-span-2 mt-2">
                      <p className="text-xs text-muted-foreground mb-1.5">Способности:</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {availableAbilities.map((ability: AbilityData) => {
                          const manaCost = manaCostForStage(ability.stage);
                          const cooldown = (playerId && combatState.state?.members[playerId]?.abilityCooldowns[ability.slug]) || 0;
                          const canUse = !loading && playerMp >= manaCost && cooldown <= 0;
                          return (
                            <Button
                              key={ability.id}
                              variant="outline"
                              className={`h-auto py-2 px-2 border-border text-xs ${!canUse ? 'opacity-50' : ''}`}
                              disabled={!canUse}
                              onClick={() => onCombatAction('ability', ability.id)}
                              title={ability.description}
                            >
                              <div className="text-left">
                                <div className="font-medium">{ability.icon} {ability.name}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {cooldown > 0 ? `КД: ${cooldown} х.` : `${manaCost} маны`}
                                </div>
                              </div>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card className="border-border">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Пати ({party.members.length}/6)</span>
                <Badge variant="outline" className="text-[10px] h-5 border-border">сбор группы</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-1.5">
              {party.members.map(m => (
                <div key={m.id} className="flex items-center gap-2.5 py-1">
                  <span className="text-xl">{m.player.class.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">
                      {m.player.name}
                      {m.playerId === party.leaderId && <Badge className="ml-1 text-[9px] h-4 px-1 bg-gold/20 text-gold">лидер</Badge>}
                      {m.playerId === playerId && <Badge className="ml-1 text-[9px] h-4 px-1 bg-primary/20 text-primary">вы</Badge>}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      Ур. {m.player.level} • {m.player.class.name}
                    </div>
                  </div>
                  <div className="text-[10px] text-hp shrink-0">{m.player.hp}/{m.player.maxHp} HP</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs text-muted-foreground">Пригласите друзей ссылкой — она откроет бота и предложит вступить в пати.</p>
              {inviteLink ? (
                <>
                  <div className="text-[10px] break-all bg-secondary rounded p-2 text-muted-foreground">{inviteLink}</div>
                  <Button variant="outline" className="w-full border-border" onClick={handleCopyInvite}>
                    {copied ? '✅ Скопировано' : '🔗 Скопировать ссылку-приглашение'}
                  </Button>
                </>
              ) : (
                <p className="text-[10px] text-muted-foreground">Приглашения временно недоступны.</p>
              )}
            </CardContent>
          </Card>

          {isLeader && (
            <Button className="w-full" onClick={onStartCombat} disabled={loading}>⚔️ Начать бой</Button>
          )}

          <Button variant="outline" className="w-full border-border" onClick={onLeaveParty} disabled={loading}>
            Покинуть пати
          </Button>
        </>
      )}
    </TabsContent>
  );
}
