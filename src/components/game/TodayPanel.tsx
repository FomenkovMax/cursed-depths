import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  WorldBossStateView, FortressStateView, GuildRaidBossStateView,
  ExpeditionStateView, BountyStateView, GameTab,
} from '@/lib/game-types';

interface TodayPanelProps {
  canClaimDaily: boolean;
  onClaimDaily: () => void;
  worldBoss: WorldBossStateView | null;
  fortress: FortressStateView | null;
  guildRaidBoss: GuildRaidBossStateView | null;
  expeditionState: ExpeditionStateView | null;
  bountyState: BountyStateView | null;
  onNavigateTab: (tab: GameTab) => void;
}

type ItemStatus = 'available' | 'progress' | 'done' | 'locked';

interface TodayItem {
  id: string;
  icon: string;
  label: string;
  status: ItemStatus;
  statusText: string;
  onAction?: () => void;
}

const STATUS_STYLE: Record<ItemStatus, string> = {
  available: 'border-uncommon/50 bg-uncommon/5',
  progress: 'border-primary/40 bg-primary/5',
  done: 'border-border/40 bg-secondary/10 opacity-70',
  locked: 'border-border/40 bg-secondary/10 opacity-50',
};

const STATUS_BADGE: Record<ItemStatus, string> = {
  available: 'bg-uncommon/20 text-uncommon',
  progress: 'bg-primary/20 text-primary',
  done: 'bg-secondary/40 text-muted-foreground',
  locked: 'bg-secondary/40 text-muted-foreground',
};

/** Единый чек-лист дневных/еженедельных активностей на вкладке "Обзор" — раньше игроку
 * приходилось самому помнить и обходить 6 независимых экранов (Ежедневное, Мировой босс,
 * Крепость, Гильд-рейд-босс, Доска контрактов, Экспедиции), чтобы не потерять прогресс ни в
 * одном. Ничего не выполняет само — только показывает статус и ведёт на нужную вкладку; сама
 * логика действия (клейм/атака/штурм) остаётся там же, где была. */
export function TodayPanel({
  canClaimDaily, onClaimDaily, worldBoss, fortress, guildRaidBoss, expeditionState, bountyState, onNavigateTab,
}: TodayPanelProps) {
  const items: TodayItem[] = [
    {
      id: 'daily',
      icon: '🎁',
      label: 'Ежедневная награда',
      status: canClaimDaily ? 'available' : 'done',
      statusText: canClaimDaily ? 'Готова' : 'Получена',
      onAction: canClaimDaily ? onClaimDaily : undefined,
    },
  ];

  if (worldBoss) {
    items.push({
      id: 'worldboss',
      icon: '🌋',
      label: 'Мировой босс',
      status: worldBoss.attacksLeftToday > 0 ? 'available' : 'done',
      statusText: worldBoss.attacksLeftToday > 0 ? `Осталось ${worldBoss.attacksLeftToday}` : 'Лимит исчерпан',
      onAction: () => onNavigateTab('guild'),
    });
  }

  if (fortress) {
    items.push({
      id: 'fortress',
      icon: '🏯',
      label: 'Крепость',
      status: !fortress.myGuildId ? 'locked' : fortress.assaultsLeftToday > 0 ? 'available' : 'done',
      statusText: !fortress.myGuildId ? 'Нужна гильдия' : fortress.assaultsLeftToday > 0 ? `Осталось ${fortress.assaultsLeftToday}` : 'Лимит исчерпан',
      onAction: () => onNavigateTab('guild'),
    });
  }

  if (guildRaidBoss) {
    const locked = !guildRaidBoss.inGuild ? 'Нужна гильдия' : !guildRaidBoss.premiumActive ? 'Нужен премиум' : null;
    items.push({
      id: 'guildraid',
      icon: '🕳️',
      label: 'Гильд-рейд-босс',
      status: locked ? 'locked' : guildRaidBoss.boss?.defeated ? 'done' : guildRaidBoss.attacksLeftToday > 0 ? 'available' : 'done',
      statusText: locked ?? (guildRaidBoss.boss?.defeated ? 'Повержен на этой неделе' : guildRaidBoss.attacksLeftToday > 0 ? `Осталось ${guildRaidBoss.attacksLeftToday}` : 'Лимит исчерпан'),
      onAction: () => onNavigateTab('guild'),
    });
  }

  if (bountyState) {
    items.push({
      id: 'bounty',
      icon: '📜',
      label: 'Доска контрактов',
      status: !bountyState.premiumActive ? 'locked' : bountyState.attempted ? 'done' : 'available',
      statusText: !bountyState.premiumActive ? 'Нужен премиум' : bountyState.attempted ? 'Выполнено' : 'Доступно',
      onAction: () => onNavigateTab('premium'),
    });
  }

  if (expeditionState) {
    const active = expeditionState.active;
    items.push({
      id: 'expedition',
      icon: '🎒',
      label: 'Экспедиции',
      status: !expeditionState.premiumActive ? 'locked' : active ? (active.ready ? 'available' : 'progress') : 'available',
      statusText: !expeditionState.premiumActive ? 'Нужен премиум' : active ? (active.ready ? 'Готово забрать' : 'В пути') : 'Не отправлено',
      onAction: () => onNavigateTab('premium'),
    });
  }

  const doneCount = items.filter(i => i.status === 'done').length;

  return (
    <Card className="border-border">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm">✅ Сегодня</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-1.5">
        <p className="text-[10px] text-muted-foreground -mt-1 mb-1">Выполнено {doneCount} из {items.length}</p>
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={item.onAction}
            disabled={!item.onAction}
            className={`w-full flex items-center gap-2.5 p-2 rounded-lg border text-left transition-colors ${STATUS_STYLE[item.status]} ${item.onAction ? 'cursor-pointer hover:brightness-110' : 'cursor-default'}`}
          >
            <span className="text-lg shrink-0">{item.icon}</span>
            <span className="flex-1 text-xs font-medium truncate">{item.label}</span>
            <Badge className={`text-[9px] h-4 px-1.5 shrink-0 ${STATUS_BADGE[item.status]}`}>{item.statusText}</Badge>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
