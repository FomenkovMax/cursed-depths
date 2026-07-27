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
