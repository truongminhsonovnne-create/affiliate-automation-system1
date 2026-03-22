/**
 * Affiliate Runtime - Main Export
 *
 * Production-grade runtime system for the Affiliate Automation Platform.
 * Supports multiple roles: web, control-plane, workers.
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

export type {
  RuntimeRole,
  RuntimeEnvironment,
  RuntimeProfile,
  RuntimeBootstrapOptions,
  RuntimeHealthStatus,
  RuntimeDependencyCheckResult,
  RuntimeShutdownReason,
  ReleaseStage,
  MigrationPlan,
  WorkerConfig,
  HttpServerConfig,
  WorkerHealthStatus,
  WorkerTask,
  WorkerTaskResult,
  ReleaseVerificationOptions,
  ReleaseVerificationResult,
  RollbackPlan,
  RollbackRisk,
  MigrationPreconditions,
  MigrationPostconditions,
  RollbackHint,
} from './types';

// =============================================================================
// Constants
// =============================================================================

export {
  DEFAULT_PORTS,
  HEALTH_CHECK_INTERVAL_MS,
  GRACEFUL_SHUTDOWN_TIMEOUT_MS,
  DEFAULT_WORKER_CONCURRENCY,
  QUEUE_POLL_INTERVAL_MS,
  DEFAULT_FEATURE_FLAGS,
  ENVIRONMENT_SAFETY,
  getRequiredEnvVars,
} from './constants';

// =============================================================================
// Environment
// =============================================================================

export {
  getRuntimeEnvironment,
  getRuntimeRole,
  resolveRuntimeRole,
  isProduction,
  isStaging,
  isDevelopment,
  isLocal,
  buildRuntimeProfile,
  getRuntimeIdentity,
} from './environment';

// =============================================================================
// Configuration
// =============================================================================

export {
  loadRuntimeConfig,
  getRoleSpecificConfig,
  getEnvironmentSpecificConfig,
  buildRuntimeConfigSummary,
} from './config/runtimeConfig';

// =============================================================================
// Bootstrap
// =============================================================================

export {
  bootstrapRuntime,
  bootstrapRuntimeRole,
} from './bootstrap/bootstrapRuntime';

export {
  runDatabaseDependencyCheck,
  runGeminiDependencyCheck,
  runRoleDependencyChecks,
  buildDependencyCheckSummary,
} from './bootstrap/dependencyChecks';

// =============================================================================
// Health
// =============================================================================

export {
  buildLivenessResponse,
  buildReadinessResponse,
  buildStartupResponse,
  buildHealthStatus,
  registerHealthEndpoints,
} from './health/healthEndpoints';

// =============================================================================
// Shutdown
// =============================================================================

export {
  registerGracefulShutdownHandlers,
  gracefullyShutdownRuntime,
  shutdownHttpServers,
  shutdownWorkers,
  shutdownBrowserContexts,
} from './shutdown/gracefulShutdown';

// =============================================================================
// Workers
// =============================================================================

export {
  AbstractWorker,
  CrawlerWorker,
  AiWorker,
  PublisherWorker,
  OpsRunnerWorker,
  startCrawlerWorker,
  startAiWorker,
  startPublisherWorker,
  startOpsRunner,
} from './workers/workerRuntime';

// =============================================================================
// Web Runtime
// =============================================================================

export {
  startWebRuntime,
  attachWebRuntimeHealth,
} from './web/webRuntime';

// =============================================================================
// Control Plane Runtime
// =============================================================================

export {
  startControlPlaneRuntime,
  attachControlPlaneHealth,
} from './controlPlane/controlPlaneRuntime';

// =============================================================================
// Release Management
// =============================================================================

export {
  getReleasePolicy,
  isMigrationAllowedForEnvironment,
  isDeployAllowedForEnvironment,
  requiresManualApproval,
} from './release/releasePolicy';

export {
  buildMigrationPlan,
  validateMigrationPreconditions,
  validateMigrationPostconditions,
  buildRollbackHintForMigration,
  executeMigrations,
} from './release/migrationStrategy';

export {
  runReleaseVerification,
  runSmokeChecks,
  verifyCriticalPaths,
} from './release/releaseVerification';

export {
  buildRollbackPlan,
  isRollbackSafe,
  classifyRollbackRisk,
} from './release/rollbackPolicy';

// =============================================================================
// Process Entry Points
// =============================================================================

export {
  parseRuntimeArgs,
  displayRuntimeHelp,
  startRuntimeForRole,
  main,
  startWebEntry,
  startControlPlaneEntry,
  startWorkerEntry,
} from './process/entrypoints';

// =============================================================================
// Utilities
// =============================================================================

export { logger } from './utils/logger';

// =============================================================================
// Version
// =============================================================================

/**
 * Runtime package version
 */
export const RUNTIME_VERSION = '1.0.0';

/**
 * Runtime build timestamp
 */
export const RUNTIME_BUILD_TIME = process.env.BUILD_TIME || new Date().toISOString();
