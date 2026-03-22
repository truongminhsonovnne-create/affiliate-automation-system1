/**
 * Release Automation Constants
 *
 * Default values and constants for CI/CD and release automation.
 */

import type { CiEnvironment } from './types';

// =============================================================================
// Workflow Timeouts
// =============================================================================

/** Default job timeout (minutes) */
export const DEFAULT_JOB_TIMEOUT = 30;

/** Build job timeout (minutes) */
export const BUILD_JOB_TIMEOUT = 20;

/** Deploy job timeout (minutes) */
export const DEPLOY_JOB_TIMEOUT = 45;

/** Verification job timeout (minutes) */
export const VERIFICATION_JOB_TIMEOUT = 15;

// =============================================================================
// Cache Configuration
// =============================================================================

/** NPM cache TTL (hours) */
export const NPM_CACHE_TTL = 24;

/** Docker layer cache TTL (hours) */
export const DOCKER_CACHE_TTL = 168; // 7 days

/** Build artifact retention (days) */
export const ARTIFACT_RETENTION_DAYS = 30;

// =============================================================================
// Release Stage Timeouts
// =============================================================================

/** Prepare stage timeout (minutes) */
export const PREPARE_STAGE_TIMEOUT = 5;

/** Build stage timeout (minutes) */
export const BUILD_STAGE_TIMEOUT = 20;

/** Container stage timeout (minutes) */
export const CONTAINER_STAGE_TIMEOUT = 30;

/** Migration stage timeout (minutes) */
export const MIGRATION_STAGE_TIMEOUT = 15;

/** Deploy stage timeout (minutes) */
export const DEPLOY_STAGE_TIMEOUT = 30;

/** Verification stage timeout (minutes) */
export const VERIFICATION_STAGE_TIMEOUT = 15;

// =============================================================================
// Approval Requirements
// =============================================================================

/** Environments requiring approval */
export const APPROVAL_REQUIRED_ENVIRONMENTS: CiEnvironment[] = ['production'];

/** Minimum reviewers for production release */
export const MIN_PRODUCTION_REVIEWERS = 2;

// =============================================================================
// Concurrency
// =============================================================================

/** Maximum concurrent releases per environment */
export const MAX_CONCURRENT_RELEASES = 1;

/** Concurrent staging releases */
export const MAX_STAGING_RELEASES = 2;

// =============================================================================
// Container Registry
// =============================================================================

/** Default container registry */
export const DEFAULT_REGISTRY = 'ghcr.io';

/** Image naming pattern */
export const IMAGE_NAME_PATTERN = '{registry}/{repository}:{role}-{version}';

/** Image tag latest pattern */
export const LATEST_TAG_PATTERN = '{role}-latest';

// =============================================================================
// Quality Gate Thresholds
// =============================================================================

/** Maximum allowed type errors */
export const MAX_TYPE_ERRORS = 0;

/** Maximum allowed ESLint errors */
export const MAX_ESLINT_ERRORS = 0;

/** Maximum allowed ESLint warnings */
export const MAX_ESLINT_WARNINGS = 50;

/** Minimum test coverage percentage */
export const MIN_TEST_COVERAGE = 70;

/** Maximum build duration (seconds) */
export const MAX_BUILD_DURATION = 600; // 10 minutes

// =============================================================================
// Migration Safety
// =============================================================================

/** Allowed migration operations per risk level */
export const MIGRATION_RISK_ALLOWANCE = {
  low: {
    allowed: ['CREATE TABLE', 'CREATE INDEX', 'CREATE SEQUENCE', 'ALTER TABLE ADD COLUMN'],
  },
  medium: {
    allowed: ['ALTER TABLE ALTER COLUMN', 'CREATE VIEW', 'CREATE FUNCTION'],
  },
  high: {
    allowed: [],
  },
  critical: {
    allowed: [],
    blocked: ['DROP TABLE', 'TRUNCATE', 'DROP COLUMN'],
  },
};

/** Production migration restrictions */
export const PRODUCTION_MIGRATION_RESTRICTIONS = {
  requireApproval: true,
  requireRollbackPlan: true,
  maxDangerousOps: 0,
  requireDowntimeWindow: false,
};

// =============================================================================
// Smoke Verification Thresholds
// =============================================================================

/** Health check timeout (seconds) */
export const HEALTH_CHECK_TIMEOUT = 30;

/** Readiness check timeout (seconds) */
export const READINESS_CHECK_TIMEOUT = 60;

/** Maximum retries for health checks */
export const HEALTH_CHECK_RETRIES = 3;

/** Retry delay for health checks (seconds) */
export const HEALTH_CHECK_RETRY_DELAY = 5;

/** Control plane check timeout (seconds) */
export const CONTROL_PLANE_CHECK_TIMEOUT = 30;

/** Worker boot check timeout (seconds) */
export const WORKER_BOOT_CHECK_TIMEOUT = 60;

// =============================================================================
// Versioning
// =============================================================================

/** Version pattern (semver) */
export const VERSION_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$/;

/** Release tag prefix */
export const RELEASE_TAG_PREFIX = 'v';

/** Staging version prefix */
export const STAGING_VERSION_PREFIX = 'staging-';

/** Development version prefix */
export const DEV_VERSION_PREFIX = 'dev-';

// =============================================================================
// Environment-Specific Settings
// =============================================================================

/** Environment-specific settings */
export const ENVIRONMENT_SETTINGS: Record<CiEnvironment, {
  autoDeploy: boolean;
  requireApproval: boolean;
  strictMigrationPolicy: boolean;
  maxBuildDuration: number;
  allowRollback: boolean;
}> = {
  local: {
    autoDeploy: true,
    requireApproval: false,
    strictMigrationPolicy: false,
    maxBuildDuration: 300,
    allowRollback: true,
  },
  development: {
    autoDeploy: true,
    requireApproval: false,
    strictMigrationPolicy: false,
    maxBuildDuration: 300,
    allowRollback: true,
  },
  staging: {
    autoDeploy: false,
    requireApproval: false,
    strictMigrationPolicy: true,
    maxBuildDuration: 600,
    allowRollback: true,
  },
  production: {
    autoDeploy: false,
    requireApproval: true,
    strictMigrationPolicy: true,
    maxBuildDuration: 900,
    allowRollback: true,
  },
};

// =============================================================================
// GitHub Actions Settings
// =============================================================================

/** Default runner */
export const DEFAULT_RUNNER = 'ubuntu-latest';

/** Large build runner */
export const LARGE_BUILD_RUNNER = 'ubuntu-latest-4-cores';

/** Runner labels by job type */
export const RUNNER_LABELS = {
  build: DEFAULT_RUNNER,
  test: DEFAULT_RUNNER,
  deploy: DEFAULT_RUNNER,
  container: LARGE_BUILD_RUNNER,
};
