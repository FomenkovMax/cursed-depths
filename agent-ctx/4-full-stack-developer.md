---
Task ID: 4
Agent: full-stack-developer
Task: Build Cursed Depths RPG Telegram MiniApp

Summary: Built complete dark fantasy RPG single-page app with Prisma/SQLite backend, 6 API routes, seed data (6 races, 26 classes, ~155 abilities, 10 locations), and 4-tab UI (Home, World, Classes, Character) with dark fantasy theme, Russian language, and mobile-first design.

Key Files Modified/Created:
- prisma/schema.prisma - Game models (Race, GameClass, Ability, Location, Player)
- src/lib/seed-data.ts - Complete game data seeding
- src/app/api/races/route.ts - GET races
- src/app/api/classes/route.ts - GET classes with filters
- src/app/api/abilities/route.ts - GET abilities with filters
- src/app/api/locations/route.ts - GET locations
- src/app/api/players/route.ts - POST/GET players
- src/app/api/seed/route.ts - POST seed database
- src/app/globals.css - Dark fantasy CSS theme
- src/app/layout.tsx - Updated with dark class and game metadata
- src/app/page.tsx - Complete single-page app with 4 tabs

Issues Resolved:
- Fixed Prisma schema missing inverse relations (players[] on Race, GameClass, Location)
- Fixed Home icon import naming conflict with Home function export
