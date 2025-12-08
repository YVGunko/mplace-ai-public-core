// packages/job-engine-demo/simpleJobEngine.js
//
// Демонстрационный in‑memory job‑engine, использующий public‑core типы и
// логику. Этот код НЕ подключён к рантайму проекта и служит
// заготовкой для будущего public‑репозитория.

import {
  shouldRunRich,
  buildPlannedImprovementsFromRating
} from '../core';

const jobs = [];
const jobItems = [];

let jobSeq = 1;
let itemSeq = 1;

export function enqueueDemoJob({ items, ratingEntries }) {
  const jobId = `demo-job-${jobSeq++}`;

  const job = {
    id: jobId,
    type: 'ai-rich',
    status: 'pending',
    payload: {
      version: 1,
      kind: 'rating-improve'
    }
  };
  jobs.push(job);

  items.forEach((productRef) => {
    const skuKey = String(productRef.sku ?? productRef.id);
    const rating = ratingEntries.get(skuKey) || null;

    const snapshotProduct = {
      ref: { id: String(productRef.id), sku: productRef.sku },
      rating
    };

    const plannedImprovements = buildPlannedImprovementsFromRating(
      rating,
      snapshotProduct,
      { targetRating: 75 }
    );

    const itemId = `demo-item-${itemSeq++}`;
    jobItems.push({
      id: itemId,
      jobId,
      status: 'pending',
      offerId: productRef.id,
      inputSnapshot: {
        product: snapshotProduct,
        ratingAtEnqueue: rating?.rating ?? null,
        ratingEntry: rating?.raw ?? null,
        plannedImprovements
      },
      resultSnapshot: null
    });
  });

  return job;
}

export function listDemoJobs() {
  return jobs.slice();
}

export async function runDemoWorkerOnce() {
  const pending = jobItems.filter((it) => it.status === 'pending');
  // eslint-disable-next-line no-restricted-syntax
  for (const item of pending) {
    const job = jobs.find((j) => j.id === item.jobId);
    if (!job) continue;

    const canRunRich = shouldRunRich(job.payload || null, item.inputSnapshot || null);

    if (!canRunRich) {
      // eslint-disable-next-line no-param-reassign
      item.status = 'skipped';
      // eslint-disable-next-line no-param-reassign
      item.resultSnapshot = { success: true, aiOutputs: {}, extra: { skippedByPlan: true } };
      // eslint-disable-next-line no-continue
      continue;
    }

    // Здесь в реальном проекте была бы интеграция с AI/маркетплейсом.
    // Для демо считаем, что генерация прошла успешно.
    // eslint-disable-next-line no-param-reassign
    item.status = 'done';
    // eslint-disable-next-line no-param-reassign
    item.resultSnapshot = {
      success: true,
      aiOutputs: {
        richContent: '...demo JSON...'
      }
    };
  }

  return {
    processed: pending.length
  };
}

