import { RARITY_COLORS, RARITY_NAMES_RU } from '@/lib/game-data';
import { STAT_SHORT_RU } from '@/lib/game-types';
import type { PetsStateView } from '@/lib/game-types';
import { PET_ICON_IMAGES, CURRENCY_ICON_IMAGES } from '@/lib/asset-icons';
import { AssetIcon } from '@/components/game/AssetIcon';

interface PetsPanelProps {
  state: PetsStateView | null;
  loading: boolean;
  buyingPetId: string | null;
  activatingPetId: string | null;
  onBuyPet: (petId: string) => void;
  onActivatePet: (petId: string | null) => void;
}

function bonusText(bonus: Record<string, number>): string {
  return Object.entries(bonus)
    .map(([key, value]) => `+${value} ${key === 'attack' ? 'АТК' : key === 'defense' ? 'ЗАЩ' : key === 'hp' ? 'HP' : key === 'mp' ? 'MP' : STAT_SHORT_RU[key] ?? key}`)
    .join(' ');
}

export function PetsPanel({ state, loading, buyingPetId, activatingPetId, onBuyPet, onActivatePet }: PetsPanelProps) {
  const owned = new Set(state?.ownedPetIds ?? []);
  const activePetId = state?.activePetId ?? null;

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-muted-foreground">
        Собрано: {owned.size} из {state?.catalog.length ?? 0}. Активный питомец даёт пассивный бонус в бою — покупать можно всех сразу, ради коллекции.
      </div>

      {activePetId && (
        <button
          type="button"
          onClick={() => onActivatePet(null)}
          disabled={activatingPetId !== null}
          className="w-full text-left p-2 rounded-lg border border-primary bg-primary/10 text-[10px] disabled:opacity-50 flex items-center gap-1"
        >
          <AssetIcon src={PET_ICON_IMAGES[activePetId]} emoji={state?.catalog.find(p => p.id === activePetId)?.icon ?? ''} size={13} />
          <span>Активен: {state?.catalog.find(p => p.id === activePetId)?.nameRu} — нажмите, чтобы снять</span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-2">
        {(state?.catalog ?? []).map(pet => {
          const isOwned = owned.has(pet.id);
          const isActive = activePetId === pet.id;
          const affordable = (state?.crownShards ?? 0) >= pet.costShards;
          const rarityColor = RARITY_COLORS[pet.rarity] ?? '#9ca3af';

          return (
            <div
              key={pet.id}
              className="p-2 rounded-lg border bg-secondary/10 flex flex-col gap-1"
              style={{ borderColor: isActive ? undefined : rarityColor + '50' }}
            >
              <div className="flex items-center gap-2">
                <AssetIcon src={PET_ICON_IMAGES[pet.id]} emoji={pet.icon} size={26} className="text-xl" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">{pet.nameRu}</div>
                  <div className="text-[9px]" style={{ color: rarityColor }}>{RARITY_NAMES_RU[pet.rarity] ?? pet.rarity}</div>
                </div>
              </div>
              <div className="text-[9px] text-muted-foreground italic leading-tight">{pet.descriptionRu}</div>
              <div className="text-[9px] text-gold">{bonusText(pet.bonus)}</div>

              {isOwned ? (
                <button
                  type="button"
                  onClick={() => onActivatePet(isActive ? null : pet.id)}
                  disabled={activatingPetId !== null}
                  className={`h-7 text-[10px] rounded-md border font-medium disabled:opacity-50 ${
                    isActive ? 'border-primary bg-primary/20 text-primary' : 'border-border/60 hover:bg-primary/10'
                  }`}
                >
                  {isActive ? '✓ Активен' : 'Активировать'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onBuyPet(pet.id)}
                  disabled={loading || buyingPetId === pet.id || !affordable}
                  className="h-7 text-[10px] rounded-md border border-gold/40 text-gold font-medium disabled:opacity-50 hover:bg-gold/10 flex items-center justify-center gap-1"
                >
                  {buyingPetId === pet.id ? '...' : (
                    <>
                      <AssetIcon src={CURRENCY_ICON_IMAGES.crownShards} emoji="👑" size={12} /> {pet.costShards}
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
