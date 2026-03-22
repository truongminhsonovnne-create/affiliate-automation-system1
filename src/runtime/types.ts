/**
 * Runtime Layer - Type Definitions
 * Production-grade typed interfaces for runtime/deployment
 */

// =============================================================================
// RUNTIME ROLES
// =============================================================================

/** Available runtime roles */
export const RUNTIME_ROLES = {
  WEB: 'web',
  CONTROL_PLANE: 'control-plane',
  WORKER_CRAWLER: 'worker-crawler',
  WORKER_AI: 'worker-ai',
  WORKER_PUBLISHER: 'worker-publisher',
  OPS_RUNNER: 'ops-runner',
} as const;

export type RuntimeRole = typeof RUNTIME_ROLES[keyof typeof RUNTIME_ROLES];

// =============================================================================
// RUNTIME ENVIRONMENTS
// =============================================================================

/** Available runtime environments */
export const RUNTIME_ENVIRONMENTS = {
  LOCAL: 'local',
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
} as const;

export type RuntimeEnvironment = typeof RUNTIME_ENVIRONMENTS[keyof typeof RUNTIME_ENVIRONMENTS];

// =============================================================================
// RUNTIME PROFILE
// =============================================================================

/** Runtime profile combining role and environment */
export interface RuntimeProfile {
  role: RuntimeRole;
  environment: RuntimeEnvironment;
  instanceId: string;
  version: string;
  startedAt: Date;
}

// =============================================================================
// BOOTSTRAP
// =============================================================================

/** Bootstrap options */
export interface RuntimeBootstrapOptions {
  role: RuntimeRole;
  environment: RuntimeEnvironment;
  version?: string;
  instanceId?: string;
  waitForDependencies?: boolean;
  dependencyTimeout?: number;
  enableHealthEndpoints?: boolean;
}

// =============================================================================
// HEALTH STATUS
// =============================================================================

/** Health status levels */
export const HEALTH_STATUS = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  STARTING: 'starting',
  STOPPING: 'stopping',
} as const;

export type HealthStatus = typeof HEALTH_STATUS[keyof typeof HEALTH_STATUS];

/** Health check result */
export interface RuntimeHealthStatus {
  status: HealthStatus;
  checks: RuntimeDependencyCheckResult[];
  uptime: number;
  timestamp: Date;
}

// =============================================================================
// READINESS STATUS
// =============================================================================

/** Readiness status */
export interface RuntimeReadinessStatus {
  ready: boolean;
  reason?: string;
  checks: RuntimeDependencyCheckResult[];
}

// =============================================================================
// DEPENDENCY CHECKS
// =============================================================================

/** Dependency check result */
export interface RuntimeDependencyCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'skipped';
  latency?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

/** Database dependency check */
export interface DatabaseDependencyCheck extends RuntimeDependencyCheckResult {
  name: 'database';
  databaseName?: string;
  connectionOk?: boolean;
  migrationsOk?: boolean;
}

/** External API dependency check */
export interface ExternalApiDependencyCheck extends RuntimeDependencyCheckResult {
  name: 'gemini' | 'supabase' | 'control-plane';
  endpoint?: string;
  responseCode?: number;
}

// =============================================================================
// SHUTDOWN
// =============================================================================

/** Shutdown reasons */
export const SHUTDOWN_REASONS = {
  SIGNAL: 'signal',
  GRACEFUL: 'graceful',
  ERROR: 'error',
  HEALTH_CHECK_FAILED: 'health_check_failed',
} as const;

export type RuntimeShutdownReason = typeof SHUTDOWN_REASONS[keyof typeof SHUTDOWN_REASONS];

// =============================================================================
// CONFIG SUMMARY
// =============================================================================

/** Runtime configuration summary */
export interface RuntimeConfigSummary {
  role: RuntimeRole;
  environment: RuntimeEnvironment;
  version: string;
  instanceId: string;
  features: Record<string, boolean>;
  limits: {
    maxConcurrency?: number;
    timeout?: number;
  };
}

// =============================================================================
// PROCESS IDENTITY
// =============================================================================

/** Process identity for logging/tracing */
export interface RuntimeProcessIdentity {
  instanceId: string;
  role: RuntimeRole;
  environment: RuntimeEnvironment;
  version: string;
  pid: number;
  hostname: string;
  startedAt: Date;
}

// =============================================================================
// LIFECYCLE HOOKS
// =============================================================================

/** Lifecycle hook definitions */
export interface RuntimeLifecycleHooks {
  onStartup?: () => Promise<void> | void;
  onShutdown?: (reason: RuntimeShutdownReason) => Promise<void> | void;
  onHealthCheck?: () => Promise<RuntimeHealthStatus> | RuntimeHealthStatus;
  onDependencyCheck?: () => Promise<RuntimeDependencyCheckResult[]> | RuntimeDependencyCheckResult[];
}

// =============================================================================
// RELEASE
// =============================================================================

/** Release stages */
export const RELEASE_STAGES = {
  BUILD: 'build',
  VALIDATE: 'validate',
  MIGRATE: 'migrate',
  DEPLOY: 'deploy',
  VERIFY: 'verify',
  ROLLBACK: 'rollback',
} as const;

export type ReleaseStage = typeof RELEASE_STAGES[keyof typeof RELEASE_STAGES];

/** Release verification result */
export interface ReleaseVerificationResult {
  passed: boolean;
  stage: ReleaseStage;
  checks: ReleaseCheckResult[];
  timestamp: Date;
}

export interface ReleaseCheckResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

// =============================================================================
// MIGRATION
// =============================================================================

/** Migration plan */
export interface MigrationPlan {
  migrations: MigrationItem[];
  estimatedDuration: number;
  risk: 'low' | 'medium' | 'high';
  canRollback: boolean;
}

export interface MigrationItem {
  name: string;
  direction: 'up' | 'down';
  sql: string;
}

// =============================================================================
// WORKER CONFIG
// =============================================================================

/** Worker configuration */
export interface WorkerConfig {
  role: Exclude<RuntimeRole, 'web' | 'control-plane'>;
  concurrency: number;
  pollInterval: number;
  heartbeatInterval: number;
  shutdownTimeout: number;
}

// =============================================================================
// HTTP SERVER CONFIG
// =============================================================================

/** HTTP server configuration */
export interface HttpServerConfig {
  port: number;
  host?: string;
  requestTimeout: number;
  gracefulShutdownTimeout: number;
}

// =============================================================================
// ADDITIONAL TYPES NEEDED BY INDEX
// =============================================================================

/** Worker health status */
export interface WorkerHealthStatus {
  role: string;
  status: HealthStatus;
  tasksProcessed: number;
  tasksFailed: number;
  lastTaskAt?: Date;
}

/** Worker task */
export interface WorkerTask {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  priority?: number;
}

/** Worker task result */
export interface WorkerTaskResult {
  taskId: string;
  success: boolean;
  result?: unknown;
  error?: string;
  duration: number;
  completedAt: Date;
}

/** Release verification options */
export interface ReleaseVerificationOptions {
  environment: RuntimeEnvironment;
  baseUrl?: string;
  skipDatabaseCheck?: boolean;
  skipHealthCheck?: boolean;
  skipWorkerCheck?: boolean;
  timeout?: number;
}

/** Rollback plan */
export interface RollbackPlan {
  stage: ReleaseStage;
  steps: RollbackStep[];
  estimatedDuration: number;
  risk: 'low' | 'medium' | 'high';
}

export interface RollbackStep {
  order: number;
  action: string;
  target: string;
  rollbackSql?: string;
}

/** Rollback risk */
export interface RollbackRisk {
  level: 'low' | 'medium' | 'high';
  factors: string[];
  mitigations: string[];
}

/** Migration preconditions */
export interface MigrationPreconditions {
  databaseReachable: boolean;
  migrationsTableExists: boolean;
  noBlockingLocks: boolean;
  sufficientDiskSpace: boolean;
}

/** Migration postconditions */
export interface MigrationPostconditions {
  migrationsApplied: number;
  schemaValid: boolean;
  dataIntegrityOk: boolean;
}

/** Rollback hint */
export interface RollbackHint {
  sql: string;
  order: number;
  description: string;
}
