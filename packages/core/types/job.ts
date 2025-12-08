// Marketplace-agnostic job & snapshot types for public-core.

import type { PlannedImprovements, ProductSnapshot } from './product';

export type JobKind = 'rating-improve' | 'ai-generate' | 'data-refresh' | string;

export type JobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

export interface CoreError {
  code: string;
  message: string;
  details?: unknown;
}

export type MarketplaceResponse = Record<string, unknown>;

// Обобщённый payload задачи.
export interface JobPayload {
  version: number;
  kind: JobKind;
  target?: Record<string, unknown>;
  plan?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// То, что мы знаем о товаре на момент постановки в очередь.
export interface JobItemInputSnapshot {
  product?: ProductSnapshot;
  ratingAtEnqueue?: number | null;
  ratingEntry?: unknown;
  plannedImprovements?: PlannedImprovements;
  // Любые дополнительные данные для дебага.
  debug?: Record<string, unknown>;
}

// Результат обработки одного товара пайплайном.
export interface JobItemResultSnapshot {
  success: boolean;
  error?: CoreError;
  aiOutputs?: Record<string, unknown>;
  marketplaceResponse?: MarketplaceResponse;
  metrics?: {
    latencyMs?: number;
    tokensIn?: number;
    tokensOut?: number;
  };
  // Любые дополнительные структуры проекта.
  extra?: Record<string, unknown>;
}

