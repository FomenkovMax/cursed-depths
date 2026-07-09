import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PartyData } from '@/lib/game-types';

interface PartyTabProps {
  playerId: string | null;
  party: PartyData | null;
  loading: boolean;
  botUsername: string | null;
  onCreateParty: () => void;
  onLeaveParty: () => void;
}

export function PartyTab({ playerId, party, loading, botUsername, onCreateParty, onLeaveParty }: PartyTabProps) {
  const [copied, setCopied] = useState(false);

  const inviteLink = party && botUsername ? `https://t.me/${botUsername}?start=party_${party.id}` : null;

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
      ) : (
        <>
          <Card className="border-border">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Пати ({party.members.length}/6)</span>
                {party.status === 'forming' && <Badge variant="outline" className="text-[10px] h-5 border-border">сбор группы</Badge>}
                {party.status === 'in_combat' && <Badge className="text-[10px] h-5 bg-destructive/20 text-destructive">в бою</Badge>}
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

          {party.status === 'forming' && (
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
          )}

          {party.status !== 'in_combat' && (
            <Button variant="outline" className="w-full border-border" onClick={onLeaveParty} disabled={loading}>
              Покинуть пати
            </Button>
          )}
        </>
      )}
    </TabsContent>
  );
}
