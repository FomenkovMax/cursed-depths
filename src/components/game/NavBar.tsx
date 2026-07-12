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
  trophies: { icon: '🎖️', label: 'Трофеи' },
  guild: { icon: '🏰', label: 'Гильдия' },
  party: { icon: '👥', label: 'Пати' },
  market: { icon: '🏛️', label: 'Рынок' },
  pvp: { icon: '⚔️', label: 'Арена' },
  leaderboard: { icon: '🏆', label: 'Топ' },
  premium: { icon: '👑', label: 'Премиум' },
};

// Прямые пункты остаются на виду — это самые частые действия игрового цикла
// (исследование/бой). Остальные вкладки собраны в две выпадающие категории
// ("Герой" и "Мир"), как вложенное меню в Подземельях Колодца — вместо плоской
// панели на 13 колонок, которая читалась как таблица, а не как игра. "Премиум" —
// отдельный прямой пункт, а не спрятан в выпадашку: витрина монетизации должна
// быть на виду постоянно, тот же приём, что и у прочих F2P-магазинов.
const DIRECT_TABS: GameTab[] = ['overview', 'combat', 'map', 'quests'];
const HERO_GROUP: GameTab[] = ['inventory', 'craft', 'achievements', 'codex', 'trophies'];
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
  variant?: 'default' | 'danger' | 'gold';
  dot?: boolean;
}

const VARIANT_ACTIVE_CLASS: Record<NonNullable<NavButtonProps['variant']>, string> = {
  default: 'bg-primary/20 text-primary',
  danger: 'bg-destructive/20 text-destructive',
  gold: 'bg-gold/20 text-gold',
};

// forwardRef + spread ...rest — DropdownMenuTrigger asChild (Radix Slot) clones its child and
// needs a ref plus its own event handlers (onPointerDown/onKeyDown/aria-*) attached to the real
// <button>; without this the two group triggers below render a <button> nested inside Radix's
// own trigger <button>, which is invalid HTML and breaks hydration.
const NavButton = forwardRef<HTMLButtonElement, NavButtonProps>(function NavButton(
  { active, icon, label, variant = 'default', dot, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`relative flex flex-col items-center justify-center gap-0.5 h-14 rounded-md text-[10px] leading-none transition-colors ${
        active ? VARIANT_ACTIVE_CLASS[variant] : 'text-muted-foreground'
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
    <div className="grid grid-cols-7 gap-0.5 bg-card border-b border-border p-1">
      {DIRECT_TABS.map(t => (
        <NavButton
          key={t}
          active={tab === t}
          icon={TAB_META[t].icon}
          label={TAB_META[t].label}
          variant={t === 'combat' ? 'danger' : 'default'}
          dot={t === 'combat' && inCombat}
          onClick={() => onChangeTab(t)}
        />
      ))}

      <NavButton
        active={tab === 'premium'}
        icon={TAB_META.premium.icon}
        label={TAB_META.premium.label}
        variant="gold"
        onClick={() => onChangeTab('premium')}
      />

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
