import type { GameTab } from '@/lib/game-types';

// Реальные сгенерированные иконки (Higgsfield, ретроспективно вытащены из истории аккаунта —
// см. обсуждение с пользователем) поверх эмодзи-заглушек. Пока покрыты только иконки вкладок
// навигации и валют — остальные категории (предметы, портреты рас/классов/боссов, локации,
// враги, питомцы, титулы) заводятся отдельными приходами. Там, где картинки нет, компонент
// AssetIcon сам откатывается на эмодзи — ничего не ломается для непокрытых пока категорий.

export const TAB_ICON_IMAGES: Partial<Record<GameTab, string>> = {
  overview: '/images/nav/overview.webp',
  combat: '/images/nav/combat.webp',
  map: '/images/nav/map.webp',
  quests: '/images/nav/quests.webp',
  inventory: '/images/nav/inventory.webp',
  craft: '/images/nav/craft.webp',
  achievements: '/images/nav/achievements.webp',
  codex: '/images/nav/codex.webp',
  trophies: '/images/nav/trophies.webp',
  guild: '/images/nav/guild.webp',
  party: '/images/nav/party.webp',
  market: '/images/nav/market.webp',
  auction: '/images/nav/auction.webp',
  pvp: '/images/nav/pvp.webp',
  leaderboard: '/images/nav/leaderboard.webp',
  premium: '/images/nav/premium.webp',
  characters: '/images/nav/characters.webp',
  // 'weekly-challenge' — для этой вкладки иконка не генерировалась, остаётся эмодзи 🕯️.
};

export const CURRENCY_ICON_IMAGES: Record<string, string> = {
  gold: '/images/currency/gold.webp',
  crownShards: '/images/currency/crown_shards.webp',
  ash_shard: '/images/currency/ash_shard.webp',
  aylet_tear: '/images/currency/aylet_tear.webp',
  tornak_seal: '/images/currency/tornak_seal.webp',
  kessara_whisper: '/images/currency/kessara_whisper.webp',
  tempering_scroll: '/images/currency/tempering_scroll.webp',
};

// Ключи — Title.id (src/lib/social/titles.ts), все 16 титулов покрыты.
export const TITLE_ICON_IMAGES: Record<string, string> = {
  ashen_wanderer: '/images/titles/ashen_wanderer.webp',
  deep_veteran: '/images/titles/deep_veteran.webp',
  ashen_legend: '/images/titles/ashen_legend.webp',
  slayer: '/images/titles/slayer.webp',
  blood_harvest: '/images/titles/blood_harvest.webp',
  arena_champion: '/images/titles/arena_champion.webp',
  arena_elite: '/images/titles/arena_elite.webp',
  abyss_conqueror: '/images/titles/abyss_conqueror.webp',
  abyss_lord: '/images/titles/abyss_lord.webp',
  trophy_hunter: '/images/titles/trophy_hunter.webp',
  trophy_legend: '/images/titles/trophy_legend.webp',
  achievement_collector: '/images/titles/achievement_collector.webp',
  pet_master: '/images/titles/pet_master.webp',
  patron: '/images/titles/patron.webp',
  clan_chief: '/images/titles/clan_chief.webp',
  voice_of_karsus: '/images/titles/voice_of_karsus.webp',
};

// Ключи — Pet.id (src/lib/economy/pets.ts), все 12 питомцев покрыты.
export const PET_ICON_IMAGES: Record<string, string> = {
  ash_kitten: '/images/pets/ash_kitten.webp',
  rusty_crow: '/images/pets/rusty_crow.webp',
  root_sprite: '/images/pets/root_sprite.webp',
  ember_moth: '/images/pets/ember_moth.webp',
  void_hare: '/images/pets/void_hare.webp',
  bone_hound: '/images/pets/bone_hound.webp',
  kessara_owl: '/images/pets/kessara_owl.webp',
  molten_salamander: '/images/pets/molten_salamander.webp',
  ailet_fawn: '/images/pets/ailet_fawn.webp',
  tornak_golemling: '/images/pets/tornak_golemling.webp',
  karsus_wyrmling: '/images/pets/karsus_wyrmling.webp',
  cursed_shade_cub: '/images/pets/cursed_shade_cub.webp',
};
