/**
 * Observability Module
 *
 * Production-grade observability layer for the Affiliate Automation System
 * including structured logging, metrics, health checks, and operational safeguards.
 */

// =============================================================================
// TYPES & CONSTANTS
// =============================================================================

export * from './types.js';
export * from './constants.js';

// =============================================================================
// LOGGING
// =============================================================================

export {
  createLogger,
  log,
  debug,
  info,
  warn,
  error,
  fatal,
  logOperation,
  logOperationSync,
  loggerFactory,
} from './logger/structuredLogger.js';

export {
  createEvent,
  recordEvent,
  recordJobEvent,
  recordPublishEvent,
  recordCrawlEvent,
  recordAiEnrichmentEvent,
  recordWorkerEvent,
  recordSystemEvent,
  recordErrorEvent,
  getEvents,
  clearEvents,
  getEventBufferSize,
} from './logger/eventRecorder.js';

// =============================================================================
// METRICS
// =============================================================================

export {
  incrementCounter,
  setCounter,
  getCounter,
  setGauge,
  incrementGauge,
  decrementGauge,
  getGauge,
  observeHistogram,
  startTimer,
  stopTimer,
  timeAsync,
  time,
  takeSnapshot,
  onFlush,
  flush,
  reset,
  shouldFlush,
  getMetricsCount,
  startAutoFlush,
  stopAutoFlush,
} from './metrics/inMemoryMetrics.js';

export {
  PREFIXES,
  CRAWLER_METRICS,
  AI_METRICS,
  PUBLISHING_METRICS,
  RUNNER_METRICS,
  DATABASE_METRICS,
  SYSTEM_METRICS,
  HEALTH_METRICS,
  SAFEGUARD_METRICS,
  createChannelLabels,
  createOperationLabels,
  createLabels,
} from './metrics/metricNames.js';

// =============================================================================
// HEALTH CHECKS
// =============================================================================

export {
  checkDatabaseHealth,
  checkGeminiHealth,
  checkCrawlerHealth,
  checkPublisherRunnerHealth,
  checkMemoryHealth,
  checkEventLoopHealth,
  registerHealthCheck,
  getRegisteredHealthChecks,
  runHealthCheck,
  runAllHealthChecks,
  getOverallHealthStatus,
  getCachedHealthCheck,
  getCachedHealthResults,
  isHealthCheckStale,
  initializeDefaultHealthChecks,
} from './health/healthChecks.js';

export {
  initializeWorker,
  getCurrentWorkerId,
  getCurrentWorker,
  recordHeartbeat,
  startHeartbeat,
  stopHeartbeat,
  markWorkerDead,
  getActiveWorkers,
  getWorker,
  isWorkerAlive,
  getStaleWorkers,
  getWorkerCount,
  registerExternalWorker,
  clearHeartbeats,
  setupGracefulShutdown,
  setHeartbeatRepository,
} from './health/heartbeat.js';

// =============================================================================
// SAFEGUARDS
// =============================================================================

export {
  getCircuitBreaker,
  getAllCircuitBreakers,
  isCircuitClosed,
  isCircuitOpen,
  isCircuitHalfOpen,
  isCallAllowed,
  recordSuccess,
  recordFailure,
  executeWithCircuit,
  executeWithCircuitSync,
  resetCircuitBreaker,
  resetAllCircuitBreakers,
  getCircuitBreakerHealth,
} from './safeguards/circuitBreaker.js';

export {
  getRetryBudget,
  getAllRetryBudgets,
  canRetry,
  consumeRetry,
  calculateRetryDelay,
  executeWithRetry,
  executeWithRetrySync,
  resetRetryBudget,
  resetAllRetryBudgets,
} from './safeguards/retryBudget.js';

export {
  getRateLimit,
  getAllRateLimits,
  isAllowed,
  recordRequest,
  executeWithRateLimit,
  executeWithRateLimitSync,
  waitForRateLimit,
  resetRateLimit,
  resetAllRateLimits,
  getRateLimitHealth,
} from './safeguards/rateLimitGuard.js';

export {
  createDeadLetterItem,
  addToDeadLetter,
  quarantineFailedJob,
  shouldQuarantine,
  getDeadLetterItem,
  getDeadLetterByJobId,
  getAllDeadLetters,
  getDeadLetterCounts,
  updateDeadLetterStatus,
  resolveDeadLetter,
  discardDeadLetter,
  getItemsForReview,
  getQuarantinedItems,
  getOldItems,
  cleanupOldItems,
  clearDeadLetters,
  setDeadLetterRepository,
} from './safeguards/deadLetter.js';

export {
  detectStaleLocks,
  detectExecutionTimeouts,
  detectOrphanedJobs,
  detectStaleHeartbeats,
  detectAllStuckJobs,
  getStuckJob,
  getAllStuckJobs,
  getStuckJobsBySeverity,
  getCriticalStuckJobs,
  clearStuckJobCache,
  releaseStuckJob,
  autoReleaseCriticalStuckJobs,
} from './safeguards/stuckJobDetector.js';

// =============================================================================
// REPOSITORIES
// =============================================================================

export {
  initializeTable as initializeSystemEventTable,
  save as saveSystemEvent,
  saveBatch as saveSystemEventsBatch,
  query as querySystemEvents,
  getByCorrelationId,
  getByJobId,
  getByWorkerId,
  getRecent,
  getErrors,
  getCritical as getCriticalEvents,
  getCountsByCategory,
  deleteOldEvents,
} from './repositories/systemEventRepository.js';

export {
  initializeTable as initializeHeartbeatTable,
  save as saveHeartbeat,
  findById as findHeartbeatById,
  findActive as findActiveHeartbeats,
  findStale as findStaleHeartbeats,
  updateLastSeen as updateHeartbeatLastSeen,
  updateStatus as updateHeartbeatStatus,
  updateCurrentJob as updateHeartbeatCurrentJob,
  deleteHeartbeat,
  deleteOld as deleteOldHeartbeats,
} from './repositories/heartbeatRepository.js';

export {
  initializeTable as initializeDeadLetterTable,
  save as saveDeadLetterRepo,
  findById as findDeadLetterById,
  findByJobId as findDeadLetterByJobId,
  findByStatus,
  findAll as findAllDeadLettersRepo,
  updateStatus as updateDeadLetterStatusRepo,
  deleteItem as deleteDeadLetterItem,
  deleteOld as deleteOldDeadLetters,
  getCountsByStatus,
} from './repositories/deadLetterRepository.js';

// =============================================================================
// RESULT BUILDING
// =============================================================================

export {
  ObservabilityResultBuilder,
  createObservabilityResult,
  buildObservabilityResult,
  mergeObservabilityResults,
} from './resultBuilder.js';

// =============================================================================
// OPERATIONAL SNAPSHOT
// =============================================================================

export {
  generateOperationalSnapshot,
  generateQuickSnapshot,
  getSnapshotSummary,
} from './operationalSnapshot.js';
