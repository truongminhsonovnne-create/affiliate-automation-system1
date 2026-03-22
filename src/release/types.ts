/**
 * Release Automation Types
 *
 * Shared types/interfaces for CI/CD and release automation.
 */

// =============================================================================
// CI Environment
// =============================================================================

/** CI environment types */
export type CiEnvironment = 'local' | 'development' | 'staging' | 'production';

/** CI job types */
export type CiJobType = 'ci' | 'pr-quality' | 'release-staging' | 'release-production';

/** Workflow trigger types */
export type WorkflowTrigger = 'push' | 'pull_request' | 'release' | 'workflow_dispatch' | 'schedule';

// =============================================================================
// Quality Gates
// =============================================================================

/** Quality gate result */
export interface QualityGateResult {
  gate: string;
  passed: boolean;
  duration?: number;
  error?: string;
  details?: Record<string, unknown>;
}

/** Quality gate summary */
export interface QualityGateSummary {
  passed: number;
  failed: number;
  results: QualityGateResult[];
  blocked: boolean;
  blockedBy?: string[];
}

/** Quality gate options */
export interface QualityGateOptions {
  environment: CiEnvironment;
  skipLint?: boolean;
  skipTypecheck?: boolean;
  skipBuild?: boolean;
  skipSecurity?: boolean;
  skipMigration?: boolean;
  skipContainer?: boolean;
  verbose?: boolean;
}

// =============================================================================
// Release Workflow
// =============================================================================

/** Release workflow stages */
export type ReleaseWorkflowStage =
  | 'prepare'
  | 'build'
  | 'container'
  | 'pre-deploy-checks'
  | 'migration-gates'
  | 'deploy'
  | 'verify'
  | 'complete'
  | 'failed'
  | 'rollback';

/** Release execution context */
export interface ReleaseExecutionContext {
  version: string;
  commitSha: string;
  branch: string;
  environment: CiEnvironment;
  triggeredBy: string;
  source: 'push' | 'release-tag' | 'workflow-dispatch' | 'staging-promotion';
  metadata?: Record<string, unknown>;
}

/** Release artifact descriptor */
export interface ReleaseArtifactDescriptor {
  type: 'container' | 'npm' | 'binary';
  name: string;
  version: string;
  path?: string;
  digest?: string;
  registry?: string;
}

/** Release promotion decision */
export interface ReleasePromotionDecision {
  allowed: boolean;
  reason?: string;
  source: CiEnvironment;
  target: CiEnvironment;
  requiresApproval: boolean;
  approvedBy?: string;
  conditions?: string[];
}

// =============================================================================
// Container Build
// =============================================================================

/** Container build result */
export interface ContainerBuildResult {
  role: string;
  dockerfile: string;
  success: boolean;
  imageTag: string;
  digest?: string;
  duration: number;
  error?: string;
}

/** Container build options */
export interface ContainerBuildOptions {
  roles: string[];
  version: string;
  commitSha: string;
  registry?: string;
  push?: boolean;
  cache?: boolean;
}

// =============================================================================
// Migration Gates
// =============================================================================

/** Migration gate result */
export interface MigrationGateResult {
  migration: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  passed: boolean;
  dangerousOps: string[];
  rollbackable: boolean;
  error?: string;
}

/** Migration gate summary */
export interface MigrationGateSummary {
  totalMigrations: number;
  passed: number;
  failed: number;
  risk: 'low' | 'medium' | 'high' | 'critical';
  results: MigrationGateResult[];
  blocked: boolean;
}

/** Migration gate options */
export interface MigrationGateOptions {
  environment: CiEnvironment;
  direction: 'up' | 'down';
  dryRun?: boolean;
  strict?: boolean;
}

// =============================================================================
// Deployment
// =============================================================================

/** Deployment gate result */
export interface DeploymentGateResult {
  stage: string;
  passed: boolean;
  duration?: number;
  error?: string;
  details?: Record<string, unknown>;
}

/** Deployment options */
export interface DeploymentOptions {
  environment: CiEnvironment;
  version: string;
  artifacts: ReleaseArtifactDescriptor[];
  strategy: 'rolling' | 'blue-green' | 'canary' | 'recreate';
  rollbackEnabled: boolean;
  preDeployGates?: string[];
  postDeployGates?: string[];
}

// =============================================================================
// Post-Deploy Verification
// =============================================================================

/** Post-deploy verification result */
export interface PostDeployVerificationResult {
  check: string;
  passed: boolean;
  duration?: number;
  error?: string;
  details?: Record<string, unknown>;
}

/** Post-deploy verification options */
export interface PostDeployVerificationOptions {
  environment: CiEnvironment;
  baseUrl: string;
  controlPlaneUrl?: string;
  timeout?: number;
  checks?: string[];
}

// =============================================================================
// Rollback
// =============================================================================

/** Rollback readiness result */
export interface RollbackReadinessResult {
  ready: boolean;
  previousVersion?: string;
  artifactsAvailable: boolean;
  migrationsRollbackable: boolean;
  issues?: string[];
}

/** Rollback execution plan */
export interface RollbackExecutionPlan {
  version: string;
  steps: RollbackStep[];
  estimatedDuration: number;
  risk: 'low' | 'medium' | 'high';
}

export interface RollbackStep {
  order: number;
  action: 'revert-code' | 'revert-config' | 'rollback-migration' | 'scale-down' | 'scale-up';
  target: string;
  command?: string;
  rollbackCommand?: string;
}

/** Rollback options */
export interface RollbackOptions {
  environment: CiEnvironment;
  currentVersion: string;
  targetVersion?: string;
  skipMigrationRollback?: boolean;
}

// =============================================================================
// Diagnostics
// =============================================================================

/** CI diagnostics summary */
export interface CiDiagnosticsSummary {
  workflow: string;
  runId: string;
  job: string;
  stage: string;
  exitCode: number;
  duration: number;
  errors: string[];
  warnings: string[];
  artifacts?: string[];
  logs?: string;
}

/** Workflow failure summary */
export interface WorkflowFailureSummary {
  workflow: string;
  runUrl: string;
  failedJob: string;
  failedStage: string;
  error: string;
  context: Record<string, unknown>;
  suggestions?: string[];
}
