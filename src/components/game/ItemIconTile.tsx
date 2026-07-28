import { RARITY_COLORS } from '@/lib/game-data';
import { AFFIX_TIER_COLORS } from '@/lib/game-types';
import { ITEM_ICON_IMAGES } from '@/lib/asset-icons';

interface TileItem {
  itemId: string;
  icon: string | null;
  rarity: string;
  quantity: number;
  enhancementLevel: number;
  affixTier?: string | null;
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
  // Аффикс-тир (magic/rare/corrupted) и уровень заточки — ось варьирования КОНКРЕТНОГО
  // экземпляра предмета (см. Inventory.affixTier/enhancementLevel), раньше не отличались
  // визуально в сетке (только текстовым бейджем +N и в детальном диалоге). Свечение поверх
  // уже существующей рамки редкости — переиспользует уже посчитанные на сервере поля, без
  // новых ассетов/запросов: каждый выпавший экземпляр выглядит немного иначе, а не только
  // цифрами.
  const affixGlowColor = item.affixTier ? AFFIX_TIER_COLORS[item.affixTier] : undefined;
  const glowPx = 3 + Math.min(item.enhancementLevel, 10) * 0.7;
  const imageSrc = ITEM_ICON_IMAGES[item.itemId];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`relative w-full aspect-square rounded-lg border bg-secondary/20 overflow-hidden flex items-center justify-center transition-colors ${onClick ? 'hover:bg-secondary/40' : ''} ${selected ? 'ring-2 ring-gold' : ''}`}
      style={{
        borderColor: RARITY_COLORS[item.rarity] + (equipped || selected ? '90' : '40'),
        boxShadow: affixGlowColor ? `0 0 ${glowPx}px ${affixGlowColor}, inset 0 0 ${glowPx * 0.6}px ${affixGlowColor}80` : undefined,
      }}
    >
      {/* Иконка теперь заполняет весь тайл (было — мелкий 32px значок посреди пустой плитки,
          по фидбеку "непонятно что за предмет") — то же изображение, просто крупнее. */}
      {imageSrc ? (
        <img src={imageSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <span className="text-3xl">{item.icon ?? ''}</span>
      )}
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
