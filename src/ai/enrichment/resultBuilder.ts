/**
 * AI Enrichment Pipeline - Result Builder
 *
 * Builds structured results for AI enrichment runs.
 */

import type {
  AiEnrichmentRunResult,
  AiEnrichmentCounters,
  AiEnrichmentMetadata,
  AiEnrichmentWarning,
  AiEnrichmentError,
  AiEnrichmentItemResult,
  AiEnrichmentLogger,
} from './types.js';
import { PARTIAL_SUCCESS } from './constants.js';

/**
 * Result builder options
 */
export interface AiResultBuilderOptions {
  /** Content type */
  contentType: string;

  /** Model used */
  model: string;

  /** Prompt version */
  promptVersion: string;

  /** Start timestamp */
  startTime: number;

  /** Custom logger */
  logger?: AiEnrichmentLogger;
}

/**
 * AI Enrichment Result Builder
 */
export class AiEnrichmentResultBuilder {
  private options: AiResultBuilderOptions;

  // Counters
  private _loaded = 0;
  private _eligible = 0;
  private _generated = 0;
  private _persisted = 0;
  private _skipped = 0;
  private _failed = 0;

  // API stats
  private _totalApiCalls = 0;
  private _successfulApiCalls = 0;
  private _failedApiCalls = 0;
  private _parseFailures = 0;
  private _validationFailures = 0;

  // Duration tracking
  private _generationDurations: number[] = [];

  // Results
  private _results: AiEnrichmentItemResult[] = [];
  private _warnings: AiEnrichmentWarning[] = [];
  private _errors: AiEnrichmentError[] = [];

  constructor(options: AiResultBuilderOptions) {
    this.options = options;
  }

  // Counters
  setLoaded(value: number): void {
    this._loaded = value;
  }

  setEligible(value: number): void {
    this._eligible = value;
  }

  incrementGenerated(): void {
    this._generated++;
  }

  incrementPersisted(): void {
    this._persisted++;
  }

  incrementSkipped(): void {
    this._skipped++;
  }

  incrementFailed(): void {
    this._failed++;
  }

  // API stats
  incrementTotalApiCalls(): void {
    this._totalApiCalls++;
  }

  incrementSuccessfulApiCalls(): void {
    this._successfulApiCalls++;
  }

  incrementFailedApiCalls(): void {
    this._failedApiCalls++;
  }

  incrementParseFailures(): void {
    this._parseFailures++;
  }

  incrementValidationFailures(): void {
    this._validationFailures++;
  }

  addGenerationDuration(durationMs: number): void {
    this._generationDurations.push(durationMs);
  }

  // Results
  addItemResult(result: AiEnrichmentItemResult): void {
    this._results.push(result);
  }

  // Warnings and errors
  addWarning(warning: AiEnrichmentWarning): void {
    this._warnings.push(warning);
  }

  addError(error: AiEnrichmentError): void {
    this._errors.push(error);
  }

  // Build final result
  build(status: 'success' | 'partial_success' | 'failed'): AiEnrichmentRunResult {
    const endTime = Date.now();
    const { contentType, model, promptVersion } = this.options;

    // Calculate duration stats
    const durations = this._generationDurations;
    const durationStats = this.calculateDurationStats(durations);

    const counters: AiEnrichmentCounters = {
      loaded: this._loaded,
      eligible: this._eligible,
      generated: this._generated,
      persisted: this._persisted,
      skipped: this._skipped,
      failed: this._failed,
    };

    const metadata: AiEnrichmentMetadata = {
      startTime: this.options.startTime,
      endTime,
      modelUsed: model,
      promptVersionUsed: promptVersion,
      contentType: contentType as any,
      totalApiCalls: this._totalApiCalls,
      successfulApiCalls: this._successfulApiCalls,
      failedApiCalls: this._failedApiCalls,
      parseFailures: this._parseFailures,
      validationFailures: this._validationFailures,
      generationDurationStats: durationStats,
    };

    return {
      ok: status === 'success' || status === 'partial_success',
      status,
      contentType: contentType as any,
      counters,
      results: this._results,
      warnings: this._warnings,
      errors: this._errors,
      metadata,
      durationMs: endTime - this.options.startTime,
    };
  }

  /**
   * Calculate duration statistics
   */
  private calculateDurationStats(durations: number[]): AiEnrichmentMetadata['generationDurationStats'] {
    if (durations.length === 0) {
      return { min: 0, max: 0, avg: 0, total: 0 };
    }

    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    const total = durations.reduce((a, b) => a + b, 0);

    return { min, max, avg, total };
  }
}

/**
 * Create result builder
 */
export function createAiEnrichmentResultBuilder(
  options: AiResultBuilderOptions
): AiEnrichmentResultBuilder {
  return new AiEnrichmentResultBuilder(options);
}

/**
 * Build AI enrichment result
 */
export function buildAiEnrichmentResult(
  context: {
    contentType: string;
    model: string;
    promptVersion: string;
    startTime: number;
  },
  counters: AiEnrichmentCounters,
  results: AiEnrichmentItemResult[],
  warnings: AiEnrichmentWarning[],
  errors: AiEnrichmentError[]
): AiEnrichmentRunResult {
  const endTime = Date.now();

  // Determine status
  const totalProcessed = counters.generated + counters.skipped + counters.failed;
  const successRate = totalProcessed > 0 ? counters.generated / totalProcessed : 0;

  let status: 'success' | 'partial_success' | 'failed';

  if (counters.failed === totalProcessed) {
    status = 'failed';
  } else if (successRate >= 0.7 || counters.generated >= PARTIAL_SUCCESS.MIN_ITEMS_PROCESSED) {
    status = 'success';
  } else {
    status = 'partial_success';
  }

  const metadata: AiEnrichmentMetadata = {
    startTime: context.startTime,
    endTime,
    modelUsed: context.model,
    promptVersionUsed: context.promptVersion,
    contentType: context.contentType as any,
    totalApiCalls: 0,
    successfulApiCalls: 0,
    failedApiCalls: 0,
    parseFailures: 0,
    validationFailures: 0,
    generationDurationStats: { min: 0, max: 0, avg: 0, total: 0 },
  };

  return {
    ok: status === 'success' || status === 'partial_success',
    status,
    contentType: context.contentType as any,
    counters,
    results,
    warnings,
    errors,
    metadata,
    durationMs: endTime - context.startTime,
  };
}

/**
 * Build counters
 */
export function buildAiEnrichmentCounters(options: {
  loaded?: number;
  eligible?: number;
  generated?: number;
  persisted?: number;
  skipped?: number;
  failed?: number;
}): AiEnrichmentCounters {
  return {
    loaded: options.loaded || 0,
    eligible: options.eligible || 0,
    generated: options.generated || 0,
    persisted: options.persisted || 0,
    skipped: options.skipped || 0,
    failed: options.failed || 0,
  };
}

/**
 * Summarize warnings
 */
export function summarizeAiEnrichmentWarnings(
  warnings: AiEnrichmentWarning[]
): {
  total: number;
  bySeverity: Record<string, number>;
  byStage: Record<string, number>;
  commonWarnings: Array<{ code: string; count: number }>;
} {
  const total = warnings.length;
  const bySeverity: Record<string, number> = {};
  const byStage: Record<string, number> = {};
  const codeCounts = new Map<string, number>();

  for (const warning of warnings) {
    bySeverity[warning.severity] = (bySeverity[warning.severity] || 0) + 1;

    if (warning.stage) {
      byStage[warning.stage] = (byStage[warning.stage] || 0) + 1;
    }

    codeCounts.set(warning.code, (codeCounts.get(warning.code) || 0) + 1);
  }

  const commonWarnings = Array.from(codeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([code, count]) => ({ code, count }));

  return { total, bySeverity, byStage, commonWarnings };
}

/**
 * Summarize errors
 */
export function summarizeAiEnrichmentErrors(
  errors: AiEnrichmentError[]
): {
  total: number;
  recoverable: number;
  nonRecoverable: number;
  byStage: Record<string, number>;
  commonErrors: Array<{ code: string; count: number }>;
} {
  const total = errors.length;
  let recoverable = 0;
  let nonRecoverable = 0;
  const byStage: Record<string, number> = {};
  const codeCounts = new Map<string, number>();

  for (const error of errors) {
    if (error.recoverable) {
      recoverable++;
    } else {
      nonRecoverable++;
    }

    if (error.stage) {
      byStage[error.stage] = (byStage[error.stage] || 0) + 1;
    }

    codeCounts.set(error.code, (codeCounts.get(error.code) || 0) + 1);
  }

  const commonErrors = Array.from(codeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([code, count]) => ({ code, count }));

  return { total, recoverable, nonRecoverable, byStage, commonErrors };
}

/**
 * Build pipeline error from exception
 */
export function buildAiEnrichmentError(
  error: unknown,
  options: {
    code?: string;
    stage?: string;
    productId?: string;
    recoverable?: boolean;
  } = {}
): AiEnrichmentError {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  return {
    code: options.code || 'UNKNOWN_ERROR',
    message,
    stack,
    recoverable: options.recoverable ?? true,
    stage: options.stage as AiEnrichmentError['stage'],
    productId: options.productId,
  };
}

/**
 * Build pipeline warning
 */
export function buildAiEnrichmentWarning(
  message: string,
  options: {
    code?: string;
    severity?: 'info' | 'warning' | 'critical';
    stage?: string;
    productId?: string;
  } = {}
): AiEnrichmentWarning {
  return {
    code: options.code || 'WARNING',
    message,
    severity: options.severity || 'warning',
    stage: options.stage as AiEnrichmentWarning['stage'],
    productId: options.productId,
  };
}
