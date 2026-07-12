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
