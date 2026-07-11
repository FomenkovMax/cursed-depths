import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GuildData, WorldBossStateView, WorldBossAttackResultView, FortressStateView, FortressAssaultResultView } from '@/lib/game-types';

interface GuildTabProps {
  playerId: string | null;
  guild: GuildData | null;
  loading: boolean;
  botUsername: string | null;
  onCreateGuild: (name: string, tag: string) => void;
  onLeaveGuild: () => void;
  worldBoss: WorldBossStateView | null;
  worldBossLoading: boolean;
  onAttackWorldBoss: () => Promise<WorldBossAttackResultView | null>;
  fortress: FortressStateView | null;
  fortressLoading: boolean;
  onAssaultFortress: () => Promise<FortressAssaultResultView | null>;
}

export function GuildTab({
  playerId, guild, loading, botUsername, onCreateGuild, onLeaveGuild,
  worldBoss, worldBossLoading, onAttackWorldBoss,
  fortress, fortressLoading, onAssaultFortress,
}: GuildTabProps) {
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [lastAttack, setLastAttack] = useState<WorldBossAttackResultView | null>(null);
  const [attacking, setAttacking] = useState(false);
  const [lastAssault, setLastAssault] = useState<FortressAssaultResultView | null>(null);
  const [assaulting, setAssaulting] = useState(false);

  const inviteLink = guild && botUsername ? `https://t.me/${botUsername}?start=guild_${guild.id}` : null;
  const isLeader = !!guild && guild.leaderId === playerId;

  const handleCopyInvite = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Буфер обмена недоступен — ссылка всё равно видна в карточке ниже.
    }
  };

  const handleAttack = async () => {
    setAttacking(true);
    const result = await onAttackWorldBoss();
    if (result) setLastAttack(result);
    setAttacking(false);
  };

  const handleAssault = async () => {
    setAssaulting(true);
    const result = await onAssaultFortress();
    if (result) setLastAssault(result);
    setAssaulting(false);
  };

  return (
    <TabsContent value="guild" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
      {/* Мировой босс — общая цель ВСЕХ игроков разом, не привязана к гильдии (lib/world-boss.ts).
          Живёт здесь, а не отдельной вкладкой, чтобы не раздувать и без того тесную панель вкладок. */}
      {worldBoss && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm">🌋 {worldBoss.boss.name} <span className="text-[10px] text-muted-foreground font-normal">(воплощение {worldBoss.boss.incarnation})</span></CardTitle>
            <p className="text-[10px] text-muted-foreground leading-relaxed italic pt-0.5">{worldBoss.boss.lore}</p>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            <div className="flex items-center gap-2">
              <Progress value={(worldBoss.boss.hp / worldBoss.boss.maxHp) * 100} className="h-2.5 flex-1" />
              <span className="text-[10px] text-muted-foreground shrink-0">{worldBoss.boss.hp}/{worldBoss.boss.maxHp}</span>
            </div>
            {worldBoss.topContributors.length > 0 && (
              <div className="text-[10px] text-muted-foreground">
                Лидеры урона: {worldBoss.topContributors.slice(0, 3).map(c => `${c.name} (${c.damage})`).join(', ')}
              </div>
            )}
            {lastAttack && (
              <div className={`text-xs rounded p-2 ${lastAttack.killed ? 'bg-gold/10 text-gold' : 'bg-secondary/30 text-muted-foreground'}`}>
                Урон: {lastAttack.damageDealt}
                {lastAttack.killed && lastAttack.reward && ` — Босс повержен! Награда: +${lastAttack.reward.gold} 💰 +${lastAttack.reward.xp} XP`}
              </div>
            )}
            <Button
              className="w-full h-9"
              disabled={loading || worldBossLoading || attacking || worldBoss.attacksLeftToday <= 0}
              onClick={handleAttack}
            >
              {worldBoss.attacksLeftToday > 0 ? `⚔️ Атаковать (осталось ${worldBoss.attacksLeftToday}/день)` : 'Атаки на сегодня закончились'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Крепость — гильдия-против-гильдии соревнование за территорию (lib/fortress.ts),
          в отличие от мирового босса выше (общий КООП для всех). Видна всем, штурмовать
          может только член гильдии. */}
      {fortress && (
        <Card className="border-gold/50 bg-gold/5">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm">🏯 {fortress.name} <span className="text-[10px] text-muted-foreground font-normal">(цикл {fortress.cycleId})</span></CardTitle>
            <p className="text-[10px] text-muted-foreground leading-relaxed italic pt-0.5">{fortress.lore}</p>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            <div className="text-xs">
              {fortress.controllingGuild ? (
                <span>Контролирует: <span className="font-medium text-gold">🏰 {fortress.controllingGuild.name} [{fortress.controllingGuild.tag}]</span></span>
              ) : (
                <span className="text-muted-foreground">Крепость свободна — ни одна гильдия ещё не заявила права</span>
              )}
              {fortress.myGuildId && fortress.controllingGuild?.id === fortress.myGuildId && (
                <Badge className="ml-1 text-[9px] h-4 px-1 bg-gold/20 text-gold">+10% золота вашей гильдии</Badge>
              )}
            </div>
            {fortress.standings.length > 0 && (
              <div className="text-[10px] text-muted-foreground">
                Лидеры цикла: {fortress.standings.slice(0, 3).map(s => `${s.name} [${s.tag}] (${s.points})`).join(', ')}
              </div>
            )}
            {lastAssault && (
              <div className="text-xs rounded p-2 bg-secondary/30 text-muted-foreground">
                Урон по Крепости: +{lastAssault.pointsDealt} очков вашей гильдии
              </div>
            )}
            {fortress.myGuildId ? (
              <Button
                className="w-full h-9"
                disabled={loading || fortressLoading || assaulting || fortress.assaultsLeftToday <= 0}
                onClick={handleAssault}
              >
                {fortress.assaultsLeftToday > 0 ? `🏯 Штурмовать (осталось ${fortress.assaultsLeftToday}/день)` : 'Штурмы на сегодня закончились'}
              </Button>
            ) : (
              <p className="text-[10px] text-muted-foreground text-center">Вступите в гильдию, чтобы штурмовать Крепость</p>
            )}
          </CardContent>
        </Card>
      )}

      {!guild ? (
        <Card className="border-border">
          <CardContent className="p-6 text-center space-y-3">
            <div className="text-3xl">🏰</div>
            <p className="text-sm text-muted-foreground">
              Вы не состоите в гильдии — постоянном сообществе искателей, в отличие от временной пати для боя.
            </p>
            <div className="space-y-2 text-left">
              <Input
                placeholder="Название гильдии (3-24 символа)"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={24}
              />
              <Input
                placeholder="Тег (2-6 символов, напр. ASH)"
                value={tag}
                onChange={e => setTag(e.target.value.toUpperCase())}
                maxLength={6}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => onCreateGuild(name.trim(), tag.trim())}
              disabled={loading || name.trim().length < 3 || tag.trim().length < 2}
            >
              Создать гильдию
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-border">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>🏰 {guild.name} <Badge variant="outline" className="text-[10px] h-4 border-border ml-1">[{guild.tag}]</Badge></span>
                <Badge variant="outline" className="text-[10px] h-5 border-border">{guild.members.length}/30</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-1.5">
              {guild.members.map(m => (
                <div key={m.id} className="flex items-center gap-2.5 py-1">
                  <span className="text-xl">{m.player.class.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">
                      {m.player.name}
                      {m.playerId === guild.leaderId && <Badge className="ml-1 text-[9px] h-4 px-1 bg-gold/20 text-gold">лидер</Badge>}
                      {m.playerId === playerId && <Badge className="ml-1 text-[9px] h-4 px-1 bg-primary/20 text-primary">вы</Badge>}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      Ур. {m.player.level} • {m.player.class.name}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs text-muted-foreground">Пригласите друзей ссылкой — она откроет бота и предложит вступить в гильдию.</p>
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

          <Button variant="outline" className="w-full border-border" onClick={onLeaveGuild} disabled={loading}>
            {isLeader && guild.members.length > 1 ? 'Покинуть гильдию (лидерство перейдёт другому)' : 'Покинуть гильдию'}
          </Button>
        </>
      )}
    </TabsContent>
  );
}
