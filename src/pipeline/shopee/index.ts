/**
 * Shopee Pipeline - Public API
 *
 * Exports all pipeline components for external consumption.
 */

// ============================================
// Types
// ============================================

export type {
  ShopeePipelineSourceType,
  ShopeePipelineMode,
  ShopeeJobLifecycleStatus,
  ShopeePipelineStage,
  ShopeePipelineRunOptions,
  ShopeePipelineRunResult,
  ShopeePipelineCounters,
  ShopeePersistenceCounters,
  ShopeePipelineMetadata,
  ShopeePipelineWarning,
  ShopeePipelineError,
  ShopeeDetailProcessingItem,
  ShopeeBatchExecutionResult,
  ShopeeQualityGateResult,
  ShopeePersistenceDecision,
  ShopeeRecordPersistenceResult,
  PipelineLogger,
} from './types.js';

// ============================================
// Constants
// ============================================

export {
  PIPELINE_DISCOVERY,
  PIPELINE_DETAIL,
  PIPELINE_RETRY,
  PIPELINE_QUALITY,
  PIPELINE_PERSISTENCE,
  PIPELINE_BROWSER,
  PIPELINE_TIMEOUT,
  PIPELINE_LOGGING,
  PIPELINE_PARTIAL_SUCCESS,
  PIPELINE_CLEANUP,
} from './constants.js';

// ============================================
// Job Lifecycle
// ============================================

export type { CrawlJobRecord } from './jobLifecycle.js';

export {
  buildCrawlJobPayload,
  startShopeeCrawlJob,
  markShopeeCrawlJobStarted,
  markShopeeCrawlJobSuccess,
  markShopeeCrawlJobPartialSuccess,
  markShopeeCrawlJobFailed,
  updateShopeeCrawlJobProgress,
} from './jobLifecycle.js';

// ============================================
// Quality Gate
// ============================================

export {
  evaluateShopeeProductQuality,
  shouldPersistShopeeProduct,
  buildQualityGateSummary,
} from './qualityGate.js';

// ============================================
// Persistence
// ============================================

export type { AffiliateProductRecord } from './persistence.js';

export {
  mapCanonicalProductToAffiliateProductRecord,
  resolveShopeeUpsertPolicy,
  persistShopeeProducts,
  persistSingleShopeeProduct,
} from './persistence.js';

// ============================================
// Batch Execution
// ============================================

export type { BatchExecutorOptions } from './batchExecution.js';

export {
  executeBatch,
  executeWithRetry,
  createBoundedExecutor,
} from './batchExecution.js';

// ============================================
// Adapters
// ============================================

export type {
  DiscoveryAdapterResult,
  DiscoveryAdapterOptions,
} from './discoveryAdapter.js';

export type {
  DetailAdapterResult,
  DetailAdapterOptions,
} from './detailAdapter.js';

export {
  ShopeeDiscoveryAdapter,
  createDiscoveryAdapter,
} from './discoveryAdapter.js';

export {
  ShopeeDetailAdapter,
  createDetailAdapter,
} from './detailAdapter.js';

// ============================================
// Result Builder
// ============================================

export type { ResultBuilderOptions } from './resultBuilder.js';

export {
  ShopeeResultBuilder,
  createResultBuilder,
  buildQualityGateSummaryResults,
  buildPipelineError,
  buildPipelineWarning,
} from './resultBuilder.js';

// ============================================
// Pipeline Orchestrator
// ============================================

export type { ShopeePipelineDependencies } from './shopeeCrawlPipeline.js';

export {
  ShopeeCrawlPipeline,
  createShopeeCrawlPipeline,
  runShopeeFlashSalePipeline,
  runShopeeSearchPipeline,
} from './shopeeCrawlPipeline.js';

// ============================================
// Browser Manager (if separate export desired)
// ============================================

export {
  createShopeeBrowserManager,
} from './browserManager.js';

export type {
  ShopeeBrowserManager,
  ShopeeBrowserManagerOptions,
} from './browserManager.js';
