# mplace-ai-public-core

Универсальное ядро для AI‑обработки товарных данных маркетплейсов:
типизация товаров и задач, планировщик улучшений по рейтингу,
демонстрационный job‑engine.

Содержимое:
- `packages/core` — типы (`ProductSnapshot`, `JobPayload` и т.п.) и функции
  `buildPlannedImprovementsFromRating`, `shouldRunRich`.
- `packages/job-engine-demo` — простой in‑memory job‑engine, показывающий,
  как использовать core без привязки к конкретному маркетплейсу.
