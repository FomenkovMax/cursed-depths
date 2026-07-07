import { RACES, CLASSES } from '@/lib/game-data';
import { PlayerData } from '@/lib/game-types';

interface GameHeaderProps {
  player: PlayerData | null;
  locationIcon: string | undefined;
  locationName: string | undefined;
}

export function GameHeader({ player, locationIcon, locationName }: GameHeaderProps) {
  const hpPercent = player ? Math.max(0, (player.hp / player.maxHp) * 100) : 0;
  const mpPercent = player ? Math.max(0, (player.mp / player.maxMp) * 100) : 0;
  const xpPercent = player ? Math.max(0, (player.xp / player.xpToNext) * 100) : 0;

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{RACES.find(r => r.id === player?.race)?.icon || '👤'}</span>
          <div>
            <div className="font-bold text-sm text-foreground leading-tight">{player?.name}</div>
            <div className="text-[10px] text-muted-foreground">
              Ур. {player?.level} {RACES.find(r => r.id === player?.race)?.nameRu} {CLASSES.find(c => c.id === player?.class)?.nameRu}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-xs">💰</span>
            <span className="text-xs font-bold text-gold">{player?.gold || 0}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {locationIcon} {locationName?.split(' ').slice(0, 2).join(' ')}
          </div>
        </div>
      </div>

      {/* HP/MP/XP bars */}
      <div className="mt-1.5 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] w-6 text-hp font-bold">HP</span>
          <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${hpPercent}%`,
                backgroundColor: hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground w-14 text-right">{player?.hp}/{player?.maxHp}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] w-6 text-mp font-bold">MP</span>
          <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-mp rounded-full transition-all duration-500"
              style={{ width: `${mpPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground w-14 text-right">{player?.mp}/{player?.maxMp}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] w-6 text-xp font-bold">XP</span>
          <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-xp rounded-full transition-all duration-500"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground w-14 text-right">{player?.xp}/{player?.xpToNext}</span>
        </div>
      </div>
    </header>
  );
}
