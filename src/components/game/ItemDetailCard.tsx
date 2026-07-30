import { RARITY_COLORS, RARITY_NAMES_RU } from '@/lib/game-data';
import { AFFIX_TIER_COLORS, AFFIX_TIER_RU, ITEM_TYPE_RU, SLOT_RU, parseStats } from '@/lib/game-types';
import { ITEM_ICON_IMAGES } from '@/lib/asset-icons';

interface ItemDetailCardItem {
  itemId: string;
  icon: string | null;
  rarity: string;
  name: string;
  type: string;
  slot?: string | null;
  quantity: number;
  enhancementLevel: number;
  affixTier?: string | null;
  stats: string | null;
}

function statLabel(k: string): string {
  return k === 'attack' ? 'Атака' : k === 'defense' ? 'Защита' : k === 'healHp' ? 'Лечение HP' : k === 'healMp' ? 'Лечение MP' : k === 'damage' ? 'Урон' : k;
}

/** Компактная карточка выбранного предмета — та же рамка по редкости + заполняющая иконка, что
 * и в детальном диалоге инвентаря (InventoryTab.tsx), только горизонтальная и без кнопок
 * действия (они у каждого экрана свои). Переиспользуется на Рынке/Аукционе/Крафте вместо
 * одной строки с именем — раньше выбор предмета в сетке ItemIconTile ничего не показывал,
 * кроме текста, хотя сама иконка уже была крупной и понятной в сетке. */
export function ItemDetailCard({ item }: { item: ItemDetailCardItem }) {
  const rarityColor = RARITY_COLORS[item.rarity];
  const imageSrc = ITEM_ICON_IMAGES[item.itemId];
  const stats = parseStats(item.stats);

  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg border border-border/60 bg-secondary/10">
      <div
        className="relative w-16 h-16 shrink-0 rounded-lg border-2 bg-black/40 overflow-hidden"
        style={{ borderColor: rarityColor, boxShadow: `0 0 10px ${rarityColor}55` }}
      >
        {imageSrc ? (
          <img src={imageSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-2xl">{item.icon ?? ''}</span>
        )}
        {item.enhancementLevel > 0 && (
          <span className="absolute bottom-0 inset-x-0 text-center bg-black/80 text-gold text-[10px] font-bold py-0.5 leading-none">
            +{item.enhancementLevel}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium" style={{ color: rarityColor }}>
          {item.name}
          {item.quantity > 1 && <span className="text-muted-foreground"> x{item.quantity}</span>}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {(item.slot && SLOT_RU[item.slot]) || ITEM_TYPE_RU[item.type]} • {RARITY_NAMES_RU[item.rarity]}
        </div>
        {item.affixTier && AFFIX_TIER_RU[item.affixTier] && (
          <span
            className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded"
            style={{ backgroundColor: AFFIX_TIER_COLORS[item.affixTier] + '20', color: AFFIX_TIER_COLORS[item.affixTier] }}
          >
            {AFFIX_TIER_RU[item.affixTier]}
          </span>
        )}
        {Object.keys(stats).length > 0 && (
          <div className="flex gap-1 flex-wrap mt-1.5">
            {Object.entries(stats).map(([k, v]) => (
              <span key={k} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/30 border border-border/50">
                {statLabel(k)} <span className="text-gold font-semibold">+{v}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
