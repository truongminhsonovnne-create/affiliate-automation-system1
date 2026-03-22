/**
 * Release Automation - Main Export
 *
 * Production-grade CI/CD and release automation for Affiliate Automation System.
 */

// =============================================================================
// Types
// =============================================================================

export type {
  CiEnvironment,
  CiJobType,
  WorkflowTrigger,
  QualityGateResult,
  QualityGateSummary,
  QualityGateOptions,
  ReleaseWorkflowStage,
  ReleaseExecutionContext,
  ReleaseArtifactDescriptor,
  ReleasePromotionDecision,
  ContainerBuildResult,
  ContainerBuildOptions,
  MigrationGateResult,
  MigrationGateSummary,
  MigrationGateOptions,
  DeploymentGateResult,
  DeploymentOptions,
  PostDeployVerificationResult,
  PostDeployVerificationOptions,
  RollbackReadinessResult,
  RollbackExecutionPlan,
  RollbackOptions,
  CiDiagnosticsSummary,
  WorkflowFailureSummary,
} from './types';

// =============================================================================
// Constants
// =============================================================================

export {
  DEFAULT_JOB_TIMEOUT,
  BUILD_JOB_TIMEOUT,
  DEPLOY_JOB_TIMEOUT,
  VERIFICATION_JOB_TIMEOUT,
  NPM_CACHE_TTL,
  DOCKER_CACHE_TTL,
  ARTIFACT_RETENTION_DAYS,
  APPROVAL_REQUIRED_ENVIRONMENTS,
  MIN_PRODUCTION_REVIEWERS,
  MAX_CONCURRENT_RELEASES,
  DEFAULT_REGISTRY,
  MAX_TYPE_ERRORS,
  MAX_ESLINT_ERRORS,
  MAX_ESLINT_WARNINGS,
  MIN_TEST_COVERAGE,
  MAX_BUILD_DURATION,
  ENVIRONMENT_SETTINGS,
} from './constants';

// =============================================================================
// Quality Gates
// =============================================================================

export {
  runQualityGates,
  evaluateQualityGateSummary,
  isReleaseBlockedByQualityGates,
  getQualityGateThresholds,
} from './qualityGates';

// =============================================================================
// Migration Gates
// =============================================================================

export {
  runMigrationGates,
  evaluateMigrationRisk,
  isMigrationAllowedForRelease,
  buildMigrationGateSummaryFromResults,
  getProductionMigrationRestrictions,
} from './migrationGates';

// =============================================================================
// Container Build
// =============================================================================

export {
  buildReleaseImages,
  validateBuiltImages,
  publishReleaseImages,
  buildContainerArtifactSummary,
  getDockerfileForRole,
  getImageTagForRole,
} from './containerBuild';

// =============================================================================
// Deployment
// =============================================================================

export {
  runStagingDeployment,
  runProductionDeployment,
  buildDeploymentPlan,
  evaluateDeploymentPreconditions,
} from './deploy/deploymentOrchestrator';

export {
  canPromoteToEnvironment,
  buildPromotionDecision,
  enforcePromotionPolicy,
  getNextEnvironment,
  getPromotionChain,
} from './deploy/environmentPromotion';

// =============================================================================
// Verification
// =============================================================================

export {
  runPreDeployVerification,
  runPostDeployVerification,
  runSmokeVerification,
  buildVerificationSummary,
} from './verification/releaseVerificationRunner';

// =============================================================================
// Rollback
// =============================================================================

export {
  assessRollbackReadiness,
  buildRollbackExecutionPlan,
  buildRollbackSummary,
  executeRollback,
} from './rollback/rollbackOrchestrator';

// =============================================================================
// Versioning
// =============================================================================

export {
  resolveReleaseVersion,
  validateReleaseVersion,
  buildReleaseMetadata,
  extractVersionFromTag,
  createTagFromVersion,
  compareVersions,
  getLatestStableVersion,
} from './versioning/releaseVersion';

// =============================================================================
// GitHub Actions
// =============================================================================

export {
  writeWorkflowSummary,
  appendQualityGateSummary,
  appendMigrationSummary,
  appendReleaseVerificationSummary,
  createTableSection,
  createListSection,
  createCodeSection,
  generateDeploymentSummary,
} from './github/githubActionsSummary';

export {
  collectWorkflowDiagnostics,
  buildWorkflowFailureSummary,
  attachDiagnosticsArtifacts,
  formatDiagnostics,
  createFailureContext,
  extractRelevantLogs,
} from './github/workflowDiagnostics';

// =============================================================================
// Version
// =============================================================================

export const RELEASE_AUTOMATION_VERSION = '1.0.0';
