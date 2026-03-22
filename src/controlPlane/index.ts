/**
 * Control Plane Module
 *
 * Production-grade internal admin control plane for the Affiliate Automation System.
 * Provides APIs for system management, operational control, and dashboard data.
 */

// =============================================================================
// TYPES & CONSTANTS
// =============================================================================

export * from './types.js';
export * from './constants.js';

// =============================================================================
// CONTRACTS
// =============================================================================

export * from './contracts.js';

// =============================================================================
// AUTH
// =============================================================================

export {
  resolveAdminActor,
  authorizeAdminAction,
  ensureAdminActionAllowed,
  canPerformAction,
  isAtRoleLevel,
  isSuperAdmin,
  isAdmin,
  isOperator,
  validateRoleAssignment,
} from './auth/internalAuth.js';

// =============================================================================
// AUDIT
// =============================================================================

export {
  recordAdminAction,
  recordAdminActionSuccess,
  recordAdminActionFailure,
  recordAdminActionRejected,
  recordAdminActionSkipped,
  initializeAuditLogger,
  stopAuditLogger,
  getAuditBufferSize,
} from './audit/adminAuditLogger.js';

// =============================================================================
// REPOSITORIES
// =============================================================================

export {
  insertAdminActionLog,
  getAdminActionLogs,
  getRecentAdminActions,
  getLogsForTarget,
  getActionStatistics,
} from './repositories/adminActionLogRepository.js';

// =============================================================================
// GUARDS
// =============================================================================

export {
  guardManualCrawlRequest,
  guardManualPublisherRunRequest,
  guardRetryPublishJobRequest,
  guardCancelPublishJobRequest,
  guardUnlockStalePublishJobRequest,
  guardDeadLetterRequeueRequest,
  guardMarkDeadLetterResolvedRequest,
} from './guards/operationalGuards.js';

// =============================================================================
// SERVICES
// =============================================================================

export {
  getSystemHealthSummary,
  getOperationalSnapshotSummary,
  getMetricsSummary,
  getWorkerStatusSummary,
  getCircuitBreakerStatus,
} from './services/systemStatusService.js';

export {
  triggerManualFlashSaleCrawl,
  triggerManualSearchCrawl,
  getCrawlJobs,
  getCrawlJobDetail,
} from './services/crawlOperationsService.js';

export {
  triggerAiEnrichmentForProduct,
  triggerAiEnrichmentBatch,
  getAiContentStatus,
} from './services/aiOperationsService.js';

export {
  preparePublishingForProducts,
  runPublisherOnce,
  getPublishJobs,
  getPublishJobDetail,
  retryPublishJob,
  cancelPublishJob,
  unlockStalePublishJob,
} from './services/publishingOperationsService.js';

export {
  getDeadLetterRecords,
  getDeadLetterDetail,
  requeueDeadLetterRecord,
  markDeadLetterResolved,
} from './services/deadLetterService.js';

export {
  getDashboardOverview,
  getRecentOperationalEvents,
  getRecentAdminActions as getRecentAdminActionsFromService,
  getJobQueueOverview,
} from './services/adminQueryService.js';

// =============================================================================
// VALIDATION
// =============================================================================

export * from './validation/schemas.js';

// =============================================================================
// ERRORS
// =============================================================================

export {
  mapControlPlaneError,
  buildControlPlaneApiError,
  createValidationError,
  createAuthorizationError,
  createNotFoundError,
  createConflictError,
  createInternalError,
  createTimeoutError,
  createGuardRejectionError,
  getErrorCategory,
} from './errors/errorMapper.js';

// =============================================================================
// HTTP SERVER
// =============================================================================

export {
  createApp,
  startServer,
  setupGracefulShutdown,
} from './http/server.js';

// Re-export router for mounting
export { default as controlPlaneRouter } from './http/router.js';
