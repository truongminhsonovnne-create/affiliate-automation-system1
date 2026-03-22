/**
 * Shopee Pipeline - Result Builder
 *
 * Constructs structured pipeline results with proper error handling.
 */

import type {
  ShopeePipelineRunResult,
  ShopeePipelineRunOptions,
  ShopeePipelineCounters,
  ShopeePersistenceCounters,
  ShopeePipelineMetadata,
  ShopeePipelineWarning,
  ShopeePipelineError,
  ShopeeJobLifecycleStatus,
  ShopeePipelineSourceType,
  ShopeeQualityGateResult,
  ShopeeRecordPersistenceResult,
} from './types.js';

/**
 * Result builder options
 */
export interface ResultBuilderOptions {
  /** Pipeline run options */
  runOptions: ShopeePipelineRunOptions;

  /** Start timestamp */
  startTime: number;
}

/**
 * Pipeline result builder
 */
export class ShopeeResultBuilder {
  private runOptions: ShopeePipelineRunOptions;
  private startTime: number;

  // Counters
  private _discoveryCardsFound = 0;
  private _discoveryCardsAccepted = 0;
  private _detailAttempts = 0;
  private _detailSuccesses = 0;
  private _detailFailures = 0;
  private _qualityAccepted = 0;
  private _qualityRejected = 0;

  // Persistence counters
  private _persistedInserted = 0;
  private _persistedUpdated = 0;
  private _persistedSkipped = 0;
  private _persistedFailed = 0;

  // Metadata
  private _finalSourceUrl?: string;
  private _stageDurations: Partial<Record<string, number>> = {};
  private _browserUsed = false;
  private _pagesCreated = 0;
  private _jobCompleted = false;

  // Warnings and errors
  private _warnings: ShopeePipelineWarning[] = [];
  private _errors: ShopeePipelineError[] = [];

  constructor(options: ResultBuilderOptions) {
    this.runOptions = options.runOptions;
    this.startTime = options.startTime;
  }

  // Counters setters
  setDiscoveryCardsFound(value: number): void {
    this._discoveryCardsFound = value;
  }

  setDiscoveryCardsAccepted(value: number): void {
    this._discoveryCardsAccepted = value;
  }

  incrementDetailAttempts(value = 1): void {
    this._detailAttempts += value;
  }

  incrementDetailSuccesses(value = 1): void {
    this._detailSuccesses += value;
  }

  incrementDetailFailures(value = 1): void {
    this._detailFailures += value;
  }

  incrementQualityAccepted(value = 1): void {
    this._qualityAccepted += value;
  }

  incrementQualityRejected(value = 1): void {
    this._qualityRejected += value;
  }

  // Persistence counters
  addPersistenceResult(result: ShopeeRecordPersistenceResult): void {
    if (result.operation === 'insert') this._persistedInserted++;
    else if (result.operation === 'update') this._persistedUpdated++;
    else if (result.operation === 'skip') this._persistedSkipped++;
    else if (result.operation === 'fail') this._persistedFailed++;
  }

  setPersistenceCounters(counters: ShopeePersistenceCounters): void {
    this._persistedInserted = counters.inserted;
    this._persistedUpdated = counters.updated;
    this._persistedSkipped = counters.skipped;
    this._persistedFailed = counters.failed;
  }

  // Metadata setters
  setFinalSourceUrl(url: string): void {
    this._finalSourceUrl = url;
  }

  setStageDuration(stage: string, duration: number): void {
    this._stageDurations[stage] = duration;
  }

  setBrowserUsed(used: boolean): void {
    this._browserUsed = used;
  }

  incrementPagesCreated(value = 1): void {
    this._pagesCreated += value;
  }

  setJobCompleted(completed: boolean): void {
    this._jobCompleted = completed;
  }

  // Warnings and errors
  addWarning(warning: ShopeePipelineWarning): void {
    this._warnings.push(warning);
  }

  addError(error: ShopeePipelineError): void {
    this._errors.push(error);
  }

  // Build final result
  build(status: ShopeeJobLifecycleStatus): ShopeePipelineRunResult {
    const endTime = Date.now();
    const sourceType = this.runOptions.mode === 'flash_sale' ? 'flash_sale' : 'search';

    // Determine overall success
    const ok = status === 'success' || status === 'partial_success';

    // Calculate counters
    const counters: ShopeePipelineCounters = {
      discoveryCardsFound: this._discoveryCardsFound,
      discoveryCardsAccepted: this._discoveryCardsAccepted,
      detailAttempts: this._detailAttempts,
      detailSuccesses: this._detailSuccesses,
      detailFailures: this._detailFailures,
      qualityAccepted: this._qualityAccepted,
      qualityRejected: this._qualityRejected,
    };

    // Persistence counters
    const persistedRecords: ShopeePersistenceCounters = {
      inserted: this._persistedInserted,
      updated: this._persistedUpdated,
      skipped: this._persistedSkipped,
      failed: this._persistedFailed,
    };

    // Metadata
    const metadata: ShopeePipelineMetadata = {
      startTime: this.startTime,
      endTime,
      finalSourceUrl: this._finalSourceUrl,
      stageDurations: this._stageDurations,
      browserUsed: this._browserUsed,
      pagesCreated: this._pagesCreated,
      jobCompleted: this._jobCompleted,
    };

    return {
      ok,
      status,
      sourceType,
      sourceKeyword: this.runOptions.keyword,
      counters,
      persistedRecords,
      metadata,
      warnings: this._warnings,
      errors: this._errors,
      durationMs: endTime - this.startTime,
    };
  }
}

/**
 * Create result builder
 */
export function createResultBuilder(options: ResultBuilderOptions): ShopeeResultBuilder {
  return new ShopeeResultBuilder(options);
}

/**
 * Build quality gate summary result
 */
export function buildQualityGateSummaryResults(
  results: ShopeeQualityGateResult[]
): {
  total: number;
  passed: number;
  failed: number;
  averageScore: number;
  decisions: Record<string, number>;
} {
  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = total - passed;

  const scores = results.map(r => r.score);
  const averageScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  const decisions: Record<string, number> = {};
  for (const result of results) {
    decisions[result.decision] = (decisions[result.decision] || 0) + 1;
  }

  return {
    total,
    passed,
    failed,
    averageScore,
    decisions,
  };
}

/**
 * Build pipeline error from exception
 */
export function buildPipelineError(
  error: unknown,
  options: {
    code?: string;
    stage?: string;
    itemId?: string;
    recoverable?: boolean;
  } = {}
): ShopeePipelineError {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  return {
    code: options.code || 'UNKNOWN_ERROR',
    message,
    stack,
    recoverable: options.recoverable ?? true,
    stage: options.stage as ShopeePipelineError['stage'],
    itemId: options.itemId,
  };
}

/**
 * Build pipeline warning
 */
export function buildPipelineWarning(
  message: string,
  options: {
    code?: string;
    severity?: 'info' | 'warning' | 'critical';
    stage?: string;
    itemId?: string;
  } = {}
): ShopeePipelineWarning {
  return {
    code: options.code || 'WARNING',
    message,
    severity: options.severity || 'warning',
    stage: options.stage as ShopeePipelineWarning['stage'],
    itemId: options.itemId,
  };
}
