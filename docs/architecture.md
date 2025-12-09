# Архитектура mplace-ai-public-core

Этот репозиторий содержит **открытое ядро (core)** для AI-обработки товарных данных.  
Цель — предложить универсальные типы, контракты и чистые функции, независимые от конкретных маркетплейсов (Ozon, Wildberries, Amazon, Shopify и т.п.).

Пакет предназначен для:

- разработчиков платформ, работающих с товарами;
- интеграторов AI-генерации;
- разработчиков собственных marketplace-адаптеров;
- авторов внутренних инструментов и пайплайнов массовой обработки.

`mplace-ai-public-core` не содержит реализаций маркетплейсов, production-промптов или ключей моделей — всё это живёт в приватных репозиториях проекта.

---

# 1. Обзор архитектуры

Основные элементы:

- **packages/core** — типы и чистые функции:
  - товары, контент-рейтинг, снимки данных (snapshots);
  - структура задач (jobs, job items);
  - абстракции пайплайнов и адаптеров;
  - планировщик улучшений (`buildPlannedImprovementsFromRating`);
  - решение о запуске rich-контента (`shouldRunRich`).

- **packages/job-engine-demo** — лёгкий демонстрационный движок:
  - in-memory очередь;
  - планирование улучшений;
  - шаги AI-обработки (на mock-клиенте).

Ни один модуль не содержит:

- API ключей,
- URL маркетплейсов,
- схем БД продавцов,
- production-промптов,
- конфигурации реальных моделей.

Все реальные адаптеры подключаются через интерфейсы, определённые в core.

---

# 2. Общая архитектурная схема

```mermaid
flowchart TD
    UI[Ваше приложение / worker] --> Core[packages/core]
    Core --> Types[Типы и контракты]
    Core --> Logic[Чистые функции улучшений]
    Core --> Pipeline[Пайплайн-абстракции]
    Core --> Adapters[Интерфейсы MarketplaceAdapter / AiClient]

    Demo[job-engine-demo] --> Core
    Demo --> WorkerDemo[Demo Worker]

    subgraph Private Repo [Ваше использование]
        MPAdapter[Marketplace Adapter]
        AIClient[AI Client]
        PrivateLogic[Правила улучшений, промпты]
    end

    Adapters --> MPAdapter
    Adapters --> AIClient

## 3. Пакет `packages/core`

### 3.1 Типы продукта (`types/product.ts`)

- `ProductRef` — универсальная ссылка на товар:

  ```ts
  interface ProductRef {
    productId: string;  // internal stable ref (required)
    sku?: string | number;
    externalId?: string | number;
  }

ProductSnapshot — снимок товара для AI‑пайплайна:

interface ProductSnapshot {
  ref: ProductRef;
  text?: {
    name?: string;
    brand?: string;
    annotation?: string;
    richContent?: unknown;
  };
  media?: {
    images?: string[];
    videos?: string[];
    [key: string]: unknown;
  };
  attributes?: Record<string, unknown>;
  hashtags?: string[] | null;
  rating?: RatingEntry | null;
  extra?: Record<string, unknown>;
}
interface RatingEntry {
  rating: number | null; //общая оценка rating
  groups?: RatingGroup[]; //группы (media, text, attributes и т.п.) с весами и условиями;
}

interface RatingGroup {
  key: string;
  rating?: number | null;
  weight?: number;
  conditions?: RatingCondition[];
  improveAttributes?: string[];
}

type RatingCondition = Record<string, unknown>;

type ImprovementType =
  | "rich_content"
  | "annotation"
  | "name"
  | "media"
  | "attributes"
  | "hashtags";

type ImprovementReason =
  | "low_rating"
  | "missing_fields"
  | "insufficient_media"
  | "strategy_rule"
  | "manual_override";

interface PlannedImprovements {
  text?: {
    richContent?: {
      type: "rich_content";
      shouldGenerate: boolean;
      reason?: ImprovementReason;
      targetScoreDelta?: number;
    };
    annotation?: {
      type: "annotation";
      shouldExtend: boolean;
      reason?: ImprovementReason;
      targetLength?: number;
    };
  };
  name?: {
    type: "name";
    shouldGenerate: boolean;
    reason?: ImprovementReason;
    maxLength?: number;
  };
  media?: {
    type: "media";
    needsMoreImages?: boolean;
    reason?: ImprovementReason;
    targetImages?: number;
  };
  attributes?: {
    type: "attributes";
    important?: Record<string, unknown>;
    other?: Record<string, unknown>;
  };
  hashtags?: {
    type: "hashtags";
    shouldGenerate?: boolean;
    reason?: ImprovementReason;
  };

  totalExpectedGain?: number;
}


3.2 Типы задач (types/job.ts)
JobKind — тип задачи (например, rating-improve, ai-generate, data-refresh).

JobStatus — состояние (pending, running, completed, failed, cancelled, paused).

JobPayload:

interface JobPayload {
  version: number;
  kind: JobKind;
  target?: Record<string, unknown>;
  plan?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
JobItemInputSnapshot — данные о конкретном товаре в момент постановки в очередь:

interface JobItemInputSnapshot {
  product?: ProductSnapshot;
  ratingAtEnqueue?: number | null;
  ratingEntry?: unknown;
  plannedImprovements?: PlannedImprovements;
}

interface CoreError {
  code: string;
  message: string;
  details?: unknown;
}

interface MarketplaceResponse {
  [key: string]: unknown;
}

interface JobItemResultSnapshot {
  success: boolean;
  error?: CoreError;
  aiOutputs?: Record<string, unknown>;
  marketplaceResponse?: MarketplaceResponse;
  metrics?: {
    latencyMs?: number;
    tokensIn?: number;
    tokensOut?: number;
  };
}

3.3 Пайплайн (types/pipeline.ts)
PipelineContext — контекст выполнения шага:

interface PipelineContext {
  jobId: string;
  itemId: string;
  now: () => Date;
  deps?: Record<string, unknown>;
}

interface PipelineTrace {
  step: string;
  input: unknown;
  output?: unknown;
  error?: string;
}

interface PipelineResult {
  success: boolean;
  error?: CoreError;
  changes?: Record<string, unknown>;
  traces?: PipelineTrace[];
}

type PipelineStep =
  (ctx: PipelineContext, snapshot: JobItemInputSnapshot)
    => Promise<PipelineResult>;

3.4 Адаптеры (types/adapter.ts)
MarketplaceAuth — произвольный набор полей для авторизации (определяется приватным кодом).

MarketplaceAdapter:

interface MarketplaceAdapter {
  readonly name: string;
  fetchProductSnapshot(ref: { id: string; sku?: string | number }): Promise<unknown>;
  applyProductChanges(
    ref: { id: string; sku?: string | number },
    changes: Record<string, unknown>
  ): Promise<unknown>;
}
AiClient — общий контракт для AI‑клиента:

interface AiClient {
  readonly provider: string;
  generate(mode: string, payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}
Реализации этих интерфейсов (Ozon, WB, OpenAI, Groq и т.п.) находятся в приватных репозиториях.

4. Логика улучшений (logic/improvements.ts)
buildPlannedImprovementsFromRating(rating, product, options):

чистая функция;
function buildPlannedImprovementsFromRating(
  rating: RatingEntry,
  product: ProductSnapshot,
  options: { targetRating: number }
): PlannedImprovements

function shouldRunRich(
  jobPayload: JobPayload,
  input: JobItemInputSnapshot
): boolean

5. Demo job‑engine (packages/job-engine-demo)
5.1 Схема работы demo-воркера
sequenceDiagram
    participant User
    participant DemoEngine
    participant Core

    User->>DemoEngine: enqueueDemoJob(items)
    DemoEngine->>Core: buildPlannedImprovementsFromRating()
    DemoEngine->>DemoEngine: create pending JobItems

    User->>DemoEngine: runDemoWorkerOnce()
    DemoEngine->>Core: shouldRunRich()
    Core-->>DemoEngine: true/false

    alt skip
        DemoEngine->>DemoEngine: mark skipped
    else run
        DemoEngine->>DemoEngine: mock AI generation
        DemoEngine->>DemoEngine: mark done
    end
5.1 Цель
Показать, как можно:

сформировать задачу с набором товаров;
построить plannedImprovements на основе рейтинга;
решить, какие элементы реально нужно отправлять в AI/маркетплейс.
Demo‑engine не использует БД, Next.js или реальные API.

3.2 simpleJobEngine.js
Функции:

enqueueDemoJob({ items, ratingEntries }):

создаёт в памяти объект job с типом ai-rich и payload.kind = 'rating-improve';
для каждого productRef:
находит RatingEntry по sku или id;
строит ProductSnapshot;
вызывает buildPlannedImprovementsFromRating(...);
создаёт jobItem со статусом pending и inputSnapshot.plannedImprovements.
runDemoWorkerOnce():

берёт все jobItems со статусом pending;
для каждого:
смотрит на job.payload и item.inputSnapshot;
решает через shouldRunRich(...), нужно ли запускать rich‑генерацию;
если нет → ставит статус skipped, записывает resultSnapshot.extra.skippedByPlan = true;
если да → ставит статус done и кладёт в resultSnapshot.aiOutputs.richContent тестовые данные.
Это простой пример того, как поверх core можно строить собственный движок с БД, очередями и настоящими AI‑клиентами.

5. Demo job-engine

Небольшой демонстрационный worker, который показывает:

как формировать задачи,

как строить plannedImprovements,

как решать, запускать ли rich-пайплайн,

как обновлять статус JobItem.

Mermaid-схема demo-воркера
sequenceDiagram
    participant User
    participant DemoEngine
    participant Core

    User->>DemoEngine: enqueueDemoJob(items)
    DemoEngine->>Core: buildPlannedImprovementsFromRating()
    DemoEngine->>DemoEngine: create JobItems (pending)

    User->>DemoEngine: runDemoWorkerOnce()
    DemoEngine->>Core: shouldRunRich()
    Core-->>DemoEngine: true/false

    alt skip
        DemoEngine->>DemoEngine: mark skipped
    else run
        DemoEngine->>DemoEngine: mock AI generation
        DemoEngine->>DemoEngine: mark done
    end

Demo‑engine предназначен только для демонстрационных целей и не должен использоваться как production queue.

6. Пример использования
import {
  buildPlannedImprovementsFromRating,
  shouldRunRich
} from "mplace-ai-public-core";

const planned = buildPlannedImprovementsFromRating(ratingEntry, snapshot, {
  targetRating: 80,
});

const inputSnapshot = {
  product: snapshot,
  ratingAtEnqueue: ratingEntry.rating,
  ratingEntry,
  plannedImprovements: planned,
};

if (shouldRunRich(job.payload, inputSnapshot)) {
  // вызвать ваш AI-клиент и marketplace-адаптер
} else {
  // пропустить товар
}

7. Ограничения и расширение
Репозиторий не содержит:

привязки к конкретным маркетплейсам;
реализаций адаптеров;
production‑промптов или ключей моделей;
Next.js API / React‑кода.
Предполагается, что:

приватные репозитории реализуют MarketplaceAdapter и AiClient;
хранят реальные Prisma‑схемы, креды, URL и промпты;
используют mplace-ai-public-core как независимое ядро.
Roadmap:

добавить больше типов улучшений (media/attributes/hashtags);
оформить пример с Prisma‑схемой Job/JobItem и CLI/HTTP демо;
опубликовать пакет в npm или GitHub Packages.