// Minimal pipeline abstractions for public-core.

import type { JobItemInputSnapshot, JobItemResultSnapshot } from './job';

export interface PipelineContext {
  jobId: string;
  itemId: string;
  now: () => Date;
  // Внешние зависимости (логгер, клиенты и т.п.) конкретный проект определяет сам.
  deps?: Record<string, unknown>;
}

export interface PipelineTrace {
  step: string;
  input?: unknown;
  output?: unknown;
  error?: string;
  at: string; // ISO строка
}

export interface PipelineStepResult {
  inputSnapshot: JobItemInputSnapshot;
  resultSnapshot?: JobItemResultSnapshot;
  traces?: PipelineTrace[];
}

export type PipelineStep = (
  ctx: PipelineContext,
  input: JobItemInputSnapshot
) => Promise<PipelineStepResult>;

export interface PipelineResult {
  success: boolean;
  inputSnapshot: JobItemInputSnapshot;
  resultSnapshot?: JobItemResultSnapshot;
  traces?: PipelineTrace[];
}

