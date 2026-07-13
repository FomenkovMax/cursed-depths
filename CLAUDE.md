# Cursed Depths — заметки для будущих сессий

## Соглашение: состояние новых фич — не в page.tsx напрямую

`src/app/page.tsx` уже владеет состоянием всей игры (78+ `useState`, 28 `useEffect` на момент
аудита от 2026-07) и продолжает расти с каждой новой механикой. Рефакторить то, что уже есть,
отдельной большой задачей не стоит — риск регрессий выше пользы, — но **новое** состояние
добавляется по другому правилу.

**Правило:** для новой фичи (Battle Pass, Bounty Board, Guild Raid Boss и т.п. — то же самое,
что уже было сделано этим списком раньше) состояние **не добавляется как ещё один `useState` +
`useEffect` + `useCallback` в `page.tsx`**. Вместо этого:

1. Создаётся хук `src/hooks/use<Feature>.ts`, инкапсулирующий состояние, загрузку, refresh-эффект
   и обработчики действий этой механики. Хук возвращает `{ state, loading, refresh, ...actions }`.
2. `page.tsx` вызывает хук одной строкой и прокидывает возвращённые данные вниз в презентационный
   компонент (`src/components/game/<Feature>Tab.tsx` / `<Feature>Panel.tsx`) — как и раньше, сам
   `page.tsx` остаётся местом, где всё собирается воедино, но не местом, где всё хранится.

Пример формы хука:

```ts
// src/hooks/useBountyBoard.ts
export function useBountyBoard(telegramId: string | null, tab: GameTab) {
  const [state, setState] = useState<BountyStateView | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!telegramId) return;
    setLoading(true);
    apiCall('/api/bounty/state')
      .then(data => setState(data))
      .finally(() => setLoading(false));
  }, [telegramId]);

  useEffect(() => {
    if (tab !== 'premium' && tab !== 'overview') return;
    refresh();
  }, [tab, refresh]);

  const hunt = async () => { /* POST /api/bounty/hunt, then refresh() */ };

  return { state, loading, refresh, hunt };
}
```

Существующие блоки состояния в `page.tsx` (world boss, fortress, premium, pets, battle pass и
т.д.) не переносятся в хуки заодно — это отдельная задача с собственным объёмом тестирования,
не блокирующая работу над новыми фичами. Правило действует только вперёд, с этого момента.

## Соглашение: новая премиум-фича — не новая колонка в Player

Модель `Player` в `prisma/schema.prisma` — 89+ полей на 120+ строках (аудит 2026-07, 1.4): боевые
статы вперемешку с 15+ премиум-фичами (`activePetId`, `expeditionTierId`, `bountyEnemyId`,
`raidBossAttacksToday`, `battlePassXp`, `activeTitleId`…) в одной плоской hot-path-таблице. Любая
миграция трогает центральную таблицу всей игры; `SELECT *` по игроку тянет данные всех фич сразу,
даже неактивных.

**Правило:** для новой ПРЕМИУМ-фичи (то же самое, что уже делалось этим списком раньше — Battle
Pass, Bounty Board, Expeditions и т.п.) состояние **не добавляется как ещё одна колонка в
`Player`**. Вместо этого заводится отдельная таблица `Player<Feature>State` с 1:1-связью на
`Player` (`playerId String @unique`), как уже сделано у `PlayerBossTrophy`/`PlayerRecipe`.

Не путать с полями, которые описывают состояние ТЕКУЩЕГО боевого хода/забега и обязаны жить
рядом с `hp`/`enemyId`/`inCombat` для атомарности одного запроса (например `dungeonHeatLevel`,
`dungeonModifierId`, `respecAvailable`) — это не премиум-фичи с собственным жизненным циклом, а
часть уже существующего flow одного бое-запроса, для них колонка в `Player` остаётся правильным
местом, как и раньше. Правило касается именно самостоятельных фич уровня "экран со своим
состоянием", не разовых флагов боевого раунда.

Существующие 89 полей `Player` не мигрируются задним числом — правило действует только вперёд,
для нового.

## Правило: после мёржа PR с изменением prisma/schema.prisma — сразу синхронизировать Turso

**Инцидент (2026-07):** несколько PR подряд добавили поля в `Player` (`dailyStreak`,
`lastActionAt`, `lastReminderSentDate`) и были смёржены без переноса схемы на боевую Turso-базу.
Результат — полный аутаж: `Prisma` падала на `no such column: main.Player.dailyStreak` для
КАЖДОГО возвращающегося игрока (`GET /api/player` — самый первый запрос при открытии игры),
фронтенд при этом молча кидал реального игрока на экран создания нового персонажа с невнятной
ошибкой вместо явного "не удалось загрузить". Баг поймали не тестами, а скриншотом от живого
игрока.

Корень: `prisma db push`/`migrate` CLI не умеют напрямую работать с `libsql://` без
`driverAdapters` + `prisma.config.ts` (которых в проекте сознательно нет, см. `src/lib/db.ts`) —
поэтому перенос схемы на Turso не автоматический, а ручной шаг, который легко забыть.

**Правило:** сразу после мёржа PR, который трогает `prisma/schema.prisma`, ПЕРЕД тем как считать
фичу выкаченной — прогнать `npm run db:sync-turso -- --apply` (или хотя бы dry-run без `--apply`,
чтобы увидеть план) против боевой Turso, передав `TURSO_URL`/`DATABASE_AUTH_TOKEN` в окружение.
Скрипт (`scripts/sync-turso-schema.ts`) сравнивает каноничный DDL текущей схемы с живой Turso и
применяет только аддитивный дифф (`ALTER TABLE ADD COLUMN` / `CREATE TABLE` / `CREATE INDEX`) —
никогда не удаляет и не меняет существующее, безопасен для многократного/повторного запуска
(дифф от уже синхронной базы — пустой).
