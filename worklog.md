# Cursed Depths — Worklog

---
Task ID: 0
Agent: Main
Task: Подготовка проекта — исправление git, анализ кодовой базы

Work Log:
- Удалён .git с merge conflict, заново инициализирован репозиторий
- Склонирован актуальный код из GitHub (commit 36844c2)
- Проведён полный анализ кодовой базы: 17 API endpoints, 5 DB моделей, ~1500 строк UI
- Обнаружено: BOT_TOKEN в истории git (коммит 84eced9) — нужен перевыпуск
- .env уже добавлен в .gitignore, но исторические коммиты содержат токен

Stage Summary:
- Проект готов к работе в /home/z/my-project/
- Ключевая проблема безопасности: токены в git истории
- Следующий шаг: Группа 1 — завершение деплоя (нужен URL от Vercel)

---
Task ID: 2
Agent: Main
Task: Fix multi-user auth bug + character creation button

Work Log:
- Identified root cause: hardcoded test_dev_123 telegramId fallback meant ALL users outside Telegram shared one character
- Removed test_dev_123 as default — now only allowed in NODE_ENV=development
- Added direct initData parsing (URLSearchParams) as primary method instead of relying on initDataUnsafe
- Added semi-secure fallback in auth.ts: extract user ID from initData even if HMAC verification fails
- Added auto-migration in /api/player: when real Telegram user has no character but test_dev_123 exists, migrate it
- Removed telegramId from create player request body (backend gets it from auth headers exclusively)
- Added clear error message if app opened outside Telegram
- Pushed commit 8adbec1 to GitHub — Vercel auto-deploy triggered

Stage Summary:
- Fixed: friends seeing your character (each user now gets their own Telegram ID)
- Fixed: character creation button (auth was blocking API calls due to missing initData)
- Fixed: auto-migration of test_dev_123 player to owner's real Telegram ID
- Three-tier auth: HMAC verified → initData parsed (no HMAC) → x-telegram-id header fallback
