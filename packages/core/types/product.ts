// Marketplace-agnostic product & rating types for public-core.
// These types описывают «форму мира» без привязки к Ozon/WB.

export type ImprovementType =
  | 'rich_content'
  | 'annotation'
  | 'name'
  | 'media'
  | 'attributes'
  | 'hashtags';

// Причина, по которой мы планируем улучшение.
export type ImprovementReason =
  | 'low_rating'
  | 'missing_fields'
  | 'insufficient_media'
  | 'strategy_rule'
  | 'manual_override'
  | string;

// Универсальная ссылка на товар.
// В конкретном проекте id/sku/offerId можно маппить как угодно.
export interface ProductRef {
  id: string;
  sku?: string | number;
  externalId?: string | number;
}

export interface RatingCondition {
  key: string;
  description?: string;
  fulfilled: boolean;
  cost?: number | null;
}

export interface RatingImproveAttribute {
  id: string | number;
  name?: string;
}

export interface RatingGroup {
  key: string;
  name?: string;
  rating: number | null;
  weight?: number | null;
  conditions?: RatingCondition[];
  improveAttributes?: RatingImproveAttribute[];
  improveAtLeast?: number | null;
}

// Обобщённый снимок рейтинга товара (например, по данным маркетплейса).
export interface RatingEntry {
  product: ProductRef;
  rating: number | null;
  groups?: RatingGroup[];
  // Сырой ответ внешней системы (по желанию).
  raw?: unknown;
}

// Снимок текстовых полей.
export interface ProductTextSnapshot {
  name?: string;
  brand?: string;
  annotation?: string;
  richContentJson?: unknown;
}

// Снимок медиа.
export interface ProductMediaSnapshot {
  images?: string[];
  videos?: string[];
  // Любые дополнительные поля для конкретного проекта.
  [key: string]: unknown;
}

// Обобщённый снимок товара, на основе которого работают пайплайны.
export interface ProductSnapshot {
  ref: ProductRef;
  text?: ProductTextSnapshot;
  media?: ProductMediaSnapshot;
  attributes?: Record<string, unknown>;
  hashtags?: string[] | null;
  rating?: RatingEntry | null;
  // Любые дополнительные данные проекта.
  extra?: Record<string, unknown>;
}

// ----- Planned improvements -----

export interface PlannedRichContentImprovement {
  type: ImprovementType;
  shouldGenerate: boolean;
  reason?: ImprovementReason;
  // Откуда взялась идея (ключ группы/условия и т.п.).
  sourceGroupKey?: string;
  sourceConditionKey?: string;
  expectedImpactScore?: number | null;
  metadata?: Record<string, unknown>;
}

export interface PlannedNameImprovement {
  type: ImprovementType;
  shouldGenerate: boolean;
  mode?: string; // например, 'seo-name'
  current?: string;
  maxLength?: number;
  reason?: ImprovementReason;
}

export interface PlannedAnnotationImprovement {
  type: ImprovementType;
  shouldGenerate: boolean;
  minLength?: number;
  reason?: ImprovementReason;
}

export interface PlannedMediaImprovement {
  type: ImprovementType;
  shouldGenerate: boolean;
  minImages?: number;
  reason?: ImprovementReason;
}

export interface PlannedAttributesImprovement {
  type: ImprovementType;
  shouldGenerate: boolean;
  requiredKeys?: string[];
  reason?: ImprovementReason;
}

export interface PlannedHashtagsImprovement {
  type: ImprovementType;
  shouldGenerate: boolean;
  maxCount?: number;
  reason?: ImprovementReason;
}

// Консолидированное описание того, что мы собираемся улучшать для товара.
export interface PlannedImprovements {
  text?: {
    richContent?: PlannedRichContentImprovement;
    annotation?: PlannedAnnotationImprovement;
  };
  name?: PlannedNameImprovement;
  media?: PlannedMediaImprovement;
  attributes?: PlannedAttributesImprovement;
  hashtags?: PlannedHashtagsImprovement;
}

