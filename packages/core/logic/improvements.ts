// Pure, marketplace-agnostic helpers for planning improvements.

import type { PlannedImprovements, ProductSnapshot, RatingEntry } from '../types/product';
import type { JobPayload, JobItemInputSnapshot } from '../types/job';

export interface RatingImproveOptions {
  targetRating?: number;
}

// Минимальный пример: если рейтинг ниже порога — планируем rich-content и name.
export function buildPlannedImprovementsFromRating(
  rating: RatingEntry | null,
  product: ProductSnapshot,
  options: RatingImproveOptions = {}
): PlannedImprovements {
  const target = options.targetRating ?? 75;
  const currentRating = rating?.rating ?? null;

  if (currentRating === null || currentRating >= target) {
    return {};
  }

  return {
    text: {
      richContent: {
        type: 'rich_content',
        shouldGenerate: true,
        reason: 'low_rating',
        expectedImpactScore: target - (currentRating ?? 0),
      },
    },
    name: {
      type: 'name',
      shouldGenerate: true,
      mode: 'seo-name',
      current: product.text?.name,
      maxLength: 120,
      reason: 'low_rating',
    },
  };
}

// Решает, стоит ли запускать rich-контент для конкретного item.
export function shouldRunRich(
  jobPayload: JobPayload | null | undefined,
  input: JobItemInputSnapshot | null | undefined
): boolean {
  // Для задач без спец‑плана (или другого типа) — всегда запускаем rich.
  if (!jobPayload || jobPayload.kind !== 'rating-improve') {
    return true;
  }

  const planned =
    input &&
    input.plannedImprovements &&
    input.plannedImprovements.text &&
    input.plannedImprovements.text.richContent;

  if (!planned) {
    // Плана по richContent нет — считаем, что автогенерацию не планировали.
    return false;
  }

  // Явно запускаем rich только при shouldGenerate === true.
  return planned.shouldGenerate === true;
}

