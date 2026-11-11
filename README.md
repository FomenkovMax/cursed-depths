# Cursed Depths

Веб-игра на Next.js с Prisma и SQLite для локального запуска.

## Запуск

```sh
npm ci
npm run dev
```

Проверки приложения: `npx tsc --noEmit`, `npm run lint`, `npm test` и `npm run build`.

## Структура

| Путь | Содержимое |
| --- | --- |
| [src/](src/) | Игра и API |
| [prisma/](prisma/) | Схема и данные для инициализации |
| [public/](public/) | Статические ресурсы приложения |
| [docs/](docs/) | Документация игры |
| [scripts/](scripts/) | Вспомогательные скрипты |
| [scripts/generate-docs/](scripts/generate-docs/) | Python-генераторы справочных PDF и дерева классов |
| [presentations/](presentations/) | Материалы презентаций |
| [spisanie/](spisanie/) | Самостоятельная Python-утилита со своим README и тестами |
| [skills/](skills/) | Библиотека навыков и вспомогательных инструментов |

Для PDF-генераторов требуется исходное окружение: в них используются абсолютные пути к каталогу проекта и шрифтам.
