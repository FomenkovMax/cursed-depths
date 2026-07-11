import { forwardRef, ButtonHTMLAttributes } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GameTab } from '@/lib/game-types';

interface TabMeta {
  icon: string;
  label: string;
}

const TAB_META: Record<GameTab, TabMeta> = {
  overview: { icon: '🏠', label: 'Обзор' },
  combat: { icon: '⚔️', label: 'Бой' },
  map: { icon: '🗺️', label: 'Карта' },
  quests: { icon: '📜', label: 'Квесты' },
  inventory: { icon: '🎒', label: 'Инвентарь' },
  craft: { icon: '⚒️', label: 'Крафт' },
  achievements: { icon: '🏅', label: 'Достижения' },
  codex: { icon: '📖', label: 'Кодекс' },
  guild: { icon: '🏰', label: 'Гильдия' },
  party: { icon: '👥', label: 'Пати' },
  market: { icon: '🏛️', label: 'Рынок' },
  pvp: { icon: '⚔️', label: 'Арена' },
  leaderboard: { icon: '🏆', label: 'Топ' },
};

// Прямые пункты остаются на виду — это самые частые действия игрового цикла
// (исследование/бой). Остальные 9 вкладок собраны в две выпадающие категории
// ("Герой" и "Мир"), как вложенное меню в Подземельях Колодца — вместо плоской
// панели на 13 колонок, которая читалась как таблица, а не как игра.
const DIRECT_TABS: GameTab[] = ['overview', 'combat', 'map', 'quests'];
const HERO_GROUP: GameTab[] = ['inventory', 'craft', 'achievements', 'codex'];
const WORLD_GROUP: GameTab[] = ['guild', 'party', 'market', 'pvp', 'leaderboard'];

interface NavBarProps {
  tab: GameTab;
  onChangeTab: (tab: GameTab) => void;
  inCombat: boolean;
}

interface NavButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean;
  icon: string;
  label: string;
  danger?: boolean;
  dot?: boolean;
}

// forwardRef + spread ...rest — DropdownMenuTrigger asChild (Radix Slot) clones its child and
// needs a ref plus its own event handlers (onPointerDown/onKeyDown/aria-*) attached to the real
// <button>; without this the two group triggers below render a <button> nested inside Radix's
// own trigger <button>, which is invalid HTML and breaks hydration.
const NavButton = forwardRef<HTMLButtonElement, NavButtonProps>(function NavButton(
  { active, icon, label, danger, dot, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`relative flex flex-col items-center justify-center gap-0.5 h-14 rounded-md text-[10px] leading-none transition-colors ${
        active
          ? danger
            ? 'bg-destructive/20 text-destructive'
            : 'bg-primary/20 text-primary'
          : 'text-muted-foreground'
      } ${className ?? ''}`}
      {...rest}
    >
      <span className="text-lg leading-none">{icon}</span>
      <span className="truncate max-w-full px-0.5">{label}</span>
      {dot && (
        <span className="absolute top-1 right-2.5 w-2 h-2 bg-destructive rounded-full animate-pulse" />
      )}
    </button>
  );
});

export function NavBar({ tab, onChangeTab, inCombat }: NavBarProps) {
  const heroActive = HERO_GROUP.includes(tab);
  const worldActive = WORLD_GROUP.includes(tab);

  return (
    <div className="grid grid-cols-6 gap-0.5 bg-card border-b border-border p-1">
      {DIRECT_TABS.map(t => (
        <NavButton
          key={t}
          active={tab === t}
          icon={TAB_META[t].icon}
          label={TAB_META[t].label}
          danger={t === 'combat'}
          dot={t === 'combat' && inCombat}
          onClick={() => onChangeTab(t)}
        />
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <NavButton active={heroActive} icon="🎒" label="Герой ▾" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-40">
          {HERO_GROUP.map(t => (
            <DropdownMenuItem key={t} onClick={() => onChangeTab(t)} className={tab === t ? 'bg-primary/10 text-primary' : ''}>
              <span className="mr-1.5">{TAB_META[t].icon}</span> {TAB_META[t].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <NavButton active={worldActive} icon="🏰" label="Мир ▾" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          {WORLD_GROUP.map(t => (
            <DropdownMenuItem key={t} onClick={() => onChangeTab(t)} className={tab === t ? 'bg-primary/10 text-primary' : ''}>
              <span className="mr-1.5">{TAB_META[t].icon}</span> {TAB_META[t].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
