# Task 1-b: API Routes & Telegram Integration

## Agent
API & Backend Agent

## Summary
Created all 17 API route files and 1 auth helper for the Cursed Depths Telegram MiniApp backend.

## Files Created

### Auth Helper
- `src/lib/auth.ts` - 3 exports: `verifyTelegramAuth`, `getTelegramUser`, `getPlayerId`

### API Routes (17 files)
1. `src/app/api/player/route.ts` - GET player info
2. `src/app/api/player/create/route.ts` - POST create player
3. `src/app/api/player/rest/route.ts` - POST rest at tavern
4. `src/app/api/explore/route.ts` - POST explore location
5. `src/app/api/combat/action/route.ts` - POST combat actions
6. `src/app/api/inventory/route.ts` - GET inventory
7. `src/app/api/inventory/equip/route.ts` - POST equip items
8. `src/app/api/inventory/use/route.ts` - POST use consumables
9. `src/app/api/craft/route.ts` - POST craft items
10. `src/app/api/quests/route.ts` - GET quests
11. `src/app/api/quests/claim/route.ts` - POST claim quest rewards
12. `src/app/api/travel/route.ts` - POST travel
13. `src/app/api/daily/route.ts` - POST daily reward
14. `src/app/api/locations/route.ts` - GET locations
15. `src/app/api/leaderboard/route.ts` - GET leaderboard
16. `src/app/api/telegram/webhook/route.ts` - POST webhook handler
17. `src/app/api/telegram/setup/route.ts` - GET bot setup

## Key Implementation Details
- All endpoints use `x-telegram-id` header for authentication
- Combat system implements D&D 5e mechanics: d20 rolls, AC, modifiers, crits, weapon/armor bonuses
- Game loop: Explore → Encounter (60% chance) → Combat → Loot → Level Up → Travel
- Level up: XP threshold = level * 100, maxHP increases by 1d8, full heal
- Death: Teleported to town with 1 HP
- Travel: Connected locations only, level requirements enforced (target.level - 2)
- Daily reward: Once per day, 2d6*level gold + 10*level XP + health potion
- Crafting: Material consumption with quantity tracking, result item creation
- Telegram: Webhook handles /start, /play, /help with inline keyboard buttons

## Lint Status
✅ 0 errors
