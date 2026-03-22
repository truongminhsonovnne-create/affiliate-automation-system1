/**
 * Shopee Pipeline - Types
 *
 * Shared types and interfaces for Shopee crawl pipeline orchestration.
 */

// ============================================
// Pipeline Types
// ============================================

/**
 * Pipeline source type
 */
export type ShopeePipelineSourceType = 'flash_sale' | 'search';

/**
 * Pipeline run mode
 */
export type ShopeePipelineMode = 'flash_sale' | 'search';

/**
 * Job lifecycle status
 */
export type ShopeeJobLifecycleStatus =
  | 'pending'
  | 'started'
  | 'running'
  | 'success'
  | 'partial_success'
  | 'failed';

/**
 * Pipeline execution stage
 */
export type ShopeePipelineStage =
  | 'initialization'
  | 'browser_setup'
  | 'discovery'
  | 'detail_extraction'
  | 'quality_gate'
  | 'persistence'
  | 'finalization';

// ============================================
// Input Types
// ============================================

/**
 * Pipeline run options
 */
export interface ShopeePipelineRunOptions {
  /** Pipeline mode */
  mode: ShopeePipelineMode;

  /** Search keyword (if search mode) */
  keyword?: string;

  /** Maximum discovery items */
  maxDiscoveryItems?: number;

  /** Maximum detail items to process */
  maxDetailItems?: number;

  /** Maximum concurrent detail workers */
  maxConcurrentWorkers?: number;

  /** Enable retry for detail extraction */
  enableDetailRetry?: boolean;

  /** Detail retry count */
  detailRetryCount?: number;

  /** Minimum quality score threshold */
  minQualityScore?: number;

  /** Enable persistence */
  enablePersistence?: boolean;

  /** Skip discovery, use provided items */
  skipDiscovery?: boolean;

  /** Pre-loaded items (when skipDiscovery is true) */
  preLoadedItems?: ShopeeDetailProcessingItem[];

  /** Custom job ID */
  jobId?: string;

  /** Custom logger */
  logger?: PipelineLogger;

  /** Enable verbose logging */
  verbose?: boolean;
}

// ============================================
// Result Types
// ============================================

/**
 * Pipeline run result
 */
export interface ShopeePipelineRunResult {
  /** Overall success */
  ok: boolean;

  /** Pipeline status */
  status: ShopeeJobLifecycleStatus;

  /** Source type */
  sourceType: ShopeePipelineSourceType;

  /** Source keyword (if search) */
  sourceKeyword?: string;

  /** Job ID */
  jobId?: string;

  /** Execution counters */
  counters: ShopeePipelineCounters;

  /** Persisted records count */
  persistedRecords: ShopeePersistenceCounters;

  /** Metadata */
  metadata: ShopeePipelineMetadata;

  /** Warnings */
  warnings: ShopeePipelineWarning[];

  /** Errors */
  errors: ShopeePipelineError[];

  /** Duration in ms */
  durationMs: number;
}

/**
 * Pipeline counters
 */
export interface ShopeePipelineCounters {
  /** Cards found in discovery */
  discoveryCardsFound: number;

  /** Cards after deduplication */
  discoveryCardsAccepted: number;

  /** Detail extraction attempts */
  detailAttempts: number;

  /** Detail extraction successes */
  detailSuccesses: number;

  /** Detail extraction failures */
  detailFailures: number;

  /** Quality gate accepted */
  qualityAccepted: number;

  /** Quality gate rejected */
  qualityRejected: number;
}

/**
 * Persistence counters
 */
export interface ShopeePersistenceCounters {
  /** Records inserted */
  inserted: number;

  /** Records updated */
  updated: number;

  /** Records skipped */
  skipped: number;

  /** Records failed */
  failed: number;
}

/**
 * Pipeline metadata
 */
export interface ShopeePipelineMetadata {
  /** Start timestamp */
  startTime: number;

  /** End timestamp */
  endTime: number;

  /** Final source URL */
  finalSourceUrl?: string;

  /** Stage durations */
  stageDurations: Partial<Record<ShopeePipelineStage, number>>;

  /** Browser used */
  browserUsed: boolean;

  /** Pages created */
  pagesCreated: number;

  /** Job completed */
  jobCompleted: boolean;
}

// ============================================
// Warning & Error Types
// ============================================

/**
 * Pipeline warning
 */
export interface ShopeePipelineWarning {
  /** Warning code */
  code: string;

  /** Warning message */
  message: string;

  /** Severity */
  severity: 'info' | 'warning' | 'critical';

  /** Stage where it occurred */
  stage?: ShopeePipelineStage;

  /** Related item ID */
  itemId?: string;
}

/**
 * Pipeline error
 */
export interface ShopeePipelineError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Error stack */
  stack?: string;

  /** Whether is recoverable */
  recoverable: boolean;

  /** Stage where it occurred */
  stage?: ShopeePipelineStage;

  /** Related item ID */
  itemId?: string;
}

// ============================================
// Processing Types
// ============================================

/**
 * Detail processing item
 */
export interface ShopeeDetailProcessingItem {
  /** Product URL */
  productUrl: string;

  /** Source type */
  sourceType: ShopeePipelineSourceType;

  /** Source keyword (if applicable) */
  sourceKeyword?: string;

  /** When discovered */
  discoveredAt?: number;

  /** Listing position */
  positionIndex?: number;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Batch execution result
 */
export interface ShopeeBatchExecutionResult<T = unknown> {
  /** Total items */
  total: number;

  /** Successful */
  succeeded: number;

  /** Failed */
  failed: number;

  /** Skipped */
  skipped: number;

  /** Results */
  results: Array<{
    item: T;
    ok: boolean;
    error?: string;
    durationMs: number;
  }>;

  /** Total duration */
  durationMs: number;
}

// ============================================
// Quality Gate Types
// ============================================

/**
 * Quality gate result
 */
export interface ShopeeQualityGateResult {
  /** Whether passed */
  pass: boolean;

  /** Quality score (0-100) */
  score: number;

  /** Severity */
  severity: 'pass' | 'warning' | 'fail';

  /** Reasons */
  reasons: string[];

  /** Warnings */
  warnings: string[];

  /** Missing critical fields */
  missingCriticalFields: string[];

  /** Persistence decision */
  decision: ShopeePersistenceDecision;
}

/**
 * Persistence decision
 */
export type ShopeePersistenceDecision = 'insert' | 'update' | 'skip' | 'reject';

// ============================================
// Persistence Types
// ============================================

/**
 * Record persistence result
 */
export interface ShopeeRecordPersistenceResult {
  /** Record identifier */
  id?: string;

  /** Whether operation succeeded */
  ok: boolean;

  /** Operation type */
  operation: 'insert' | 'update' | 'skip' | 'fail';

  /** Reason */
  reason?: string;

  /** Error message */
  error?: string;
}

// ============================================
// Logger Types
// ============================================

/**
 * Pipeline logger
 */
export interface PipelineLogger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}
