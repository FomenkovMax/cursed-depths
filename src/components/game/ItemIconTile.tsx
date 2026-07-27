import { RARITY_COLORS } from '@/lib/game-data';
import { ITEM_ICON_IMAGES } from '@/lib/asset-icons';
import { AssetIcon } from '@/components/game/AssetIcon';

interface TileItem {
  itemId: string;
  icon: string | null;
  rarity: string;
  quantity: number;
  enhancementLevel: number;
}

interface ItemIconTileProps {
  item: TileItem;
  equipped?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

/** Общая плитка-иконка (значок + бейджи количества/улучшения) — единый визуальный язык
 * для инвентаря, хранилища, кузницы и аукциона вместо текстовых списков/кнопок с именем. */
export function ItemIconTile({ item, equipped, selected, onClick }: ItemIconTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`relative aspect-square rounded-lg border bg-secondary/20 flex items-center justify-center transition-colors ${onClick ? 'hover:bg-secondary/40' : ''} ${selected ? 'ring-2 ring-gold' : ''}`}
      style={{ borderColor: RARITY_COLORS[item.rarity] + (equipped || selected ? '90' : '40') }}
    >
      <AssetIcon src={ITEM_ICON_IMAGES[item.itemId]} emoji={item.icon ?? ''} size={32} className="text-2xl" />
      {item.quantity > 1 && (
        <span className="absolute bottom-0.5 right-0.5 text-[9px] leading-none bg-background/90 rounded px-1 py-0.5 font-medium">
          x{item.quantity}
        </span>
      )}
      {item.enhancementLevel > 0 && (
        <span className="absolute top-0.5 left-0.5 text-[9px] leading-none text-gold font-bold">+{item.enhancementLevel}</span>
      )}
      {equipped && (
        <span className="absolute -top-1 -right-1 text-[8px] leading-none bg-destructive text-destructive-foreground rounded px-1 py-0.5 rotate-6 shadow">
          ЭКИП.
        </span>
      )}
    </button>
  );
}
