import { PlayerData } from '@/lib/game-types';
import { computeEquipmentBonuses } from '@/lib/equipment-stats';
import { stageUnlockLevel } from '@/lib/combat-engine';

interface GameHeaderProps {
  player: PlayerData | null;
  locationIcon: string | undefined;
  locationName: string | undefined;
}

/**
 * Лорное название текущего открытого тира эволюции класса (напр. "Страж Предела") — stageName
 * заполнен в БД для каждой способности, но нигде не отображался игроку. Для стадии 1 stageName
 * всегда совпадает с названием класса (см. seed-data.ts), поэтому её не показываем отдельно —
 * только реальную эволюцию (стадия 2+).
 */
function getEvolvedStageName(player: PlayerData): string | null {
  const abilities = player.class.abilities || [];
  let best: { stage: number; stageName: string } | null = null;
  for (const a of abilities) {
    if (a.stage > 1 && player.level >= stageUnlockLevel(a.stage) && (!best || a.stage > best.stage)) {
      best = { stage: a.stage, stageName: a.stageName };
    }
  }
  return best?.stageName ?? null;
}

export function GameHeader({ player, locationIcon, locationName }: GameHeaderProps) {
  const gearBonuses = computeEquipmentBonuses(player?.inventory || []);
  const effectiveMaxHp = (player?.maxHp || 0) + gearBonuses.hp;
  const effectiveMaxMp = (player?.maxMp || 0) + gearBonuses.mp;
  const hpPercent = player ? Math.max(0, (player.hp / effectiveMaxHp) * 100) : 0;
  const mpPercent = player ? Math.max(0, (player.mp / effectiveMaxMp) * 100) : 0;
  const xpPercent = player ? Math.min(100, Math.max(0, (player.xp / player.xpToNext) * 100)) : 0;
  const evolvedStageName = player ? getEvolvedStageName(player) : null;

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{player?.race?.icon || '👤'}</span>
          <div>
            <div className="font-bold text-sm text-foreground leading-tight">{player?.name}</div>
            <div className="text-[10px] text-muted-foreground">
              Ур. {player?.level} {player?.race?.name} {player?.class?.name}
              {evolvedStageName && <span className="text-gold"> «{evolvedStageName}»</span>}
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
          <span className="text-[10px] text-muted-foreground w-14 text-right">{player?.hp}/{effectiveMaxHp}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] w-6 text-mp font-bold">MP</span>
          <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-mp rounded-full transition-all duration-500"
              style={{ width: `${mpPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground w-14 text-right">{player?.mp}/{effectiveMaxMp}</span>
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
