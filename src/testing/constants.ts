/**
 * Testing Constants
 *
 * Default values and configuration for the test architecture.
 */

// =============================================================================
// Test Timeouts
// =============================================================================

/** Unit test timeout (ms) */
export const UNIT_TEST_TIMEOUT_MS = 5000;

/** Integration test timeout (ms) */
export const INTEGRATION_TEST_TIMEOUT_MS = 30000;

/** Workflow test timeout (ms) */
export const WORKFLOW_TEST_TIMEOUT_MS = 60000;

/** E2E test timeout (ms) */
export const E2E_TEST_TIMEOUT_MS = 120000;

/** Smoke test timeout (ms) */
export const SMOKE_TEST_TIMEOUT_MS = 30000;

// =============================================================================
// Retry Configuration
// =============================================================================

/** Unit test retries */
export const UNIT_TEST_RETRIES = 0;

/** Integration test retries */
export const INTEGRATION_TEST_RETRIES = 1;

/** Workflow test retries */
export const WORKFLOW_TEST_RETRIES = 2;

/** E2E test retries */
export const E2E_TEST_RETRIES = 2;

// =============================================================================
// Test Fixtures
// =============================================================================

/** Fixture directories */
export const FIXTURE_DIRECTORIES = {
  sample: 'src/testing/fixtures/sampleData',
  mock: 'src/testing/fixtures/mocks',
  database: 'src/testing/fixtures/database',
};

/** Default fixture path */
export const DEFAULT_FIXTURE_PATH = 'src/testing/fixtures';

// =============================================================================
// Quality Thresholds
// =============================================================================

/** Minimum extraction coverage percentage */
export const MIN_EXTRACTION_COVERAGE = 80;

/** Maximum AI description length */
export const MAX_AI_DESCRIPTION_LENGTH = 500;

/** Maximum AI hashtags count */
export const MAX_AI_HASHTAGS_COUNT = 10;

/** Minimum AI hashtags count */
export const MIN_AI_HASHTAGS_COUNT = 3;

/** AI response quality threshold */
export const AI_QUALITY_THRESHOLD = 0.7;

// =============================================================================
// Publish Lifecycle Timing
// =============================================================================

/** Job claim timeout (ms) */
export const JOB_CLAIM_TIMEOUT_MS = 30000;

/** Job processing timeout (ms) */
export const JOB_PROCESSING_TIMEOUT_MS = 120000;

/** Job retry delay base (ms) */
export const JOB_RETRY_DELAY_BASE_MS = 1000;

/** Job max retry delay (ms) */
export const JOB_MAX_RETRY_DELAY_MS = 60000;

/** Stale job detection threshold (ms) */
export const STALE_JOB_THRESHOLD_MS = 300000;

// =============================================================================
// Staging Verification
// =============================================================================

/** Staging verification time budget (ms) */
export const STAGING_VERIFICATION_TIME_BUDGET_MS = 600000;

/** Health check timeout (ms) */
export const HEALTH_CHECK_TIMEOUT_MS = 10000;

/** Readiness check timeout (ms) */
export const READINESS_CHECK_TIMEOUT_MS = 30000;

/** Database check timeout (ms) */
export const DATABASE_CHECK_TIMEOUT_MS = 15000;

/** Worker startup timeout (ms) */
export const WORKER_STARTUP_TIMEOUT_MS = 60000;

// =============================================================================
// Smoke Pack Defaults
// =============================================================================

/** Quick smoke time budget (ms) */
export const QUICK_SMOKE_TIME_BUDGET_MS = 120000;

/** Full smoke time budget (ms) */
export const FULL_SMOKE_TIME_BUDGET_MS = 300000;

/** Smoke check parallel limit */
export const SMOKE_PARALLEL_LIMIT = 5;

// =============================================================================
// Regression Pack
// =============================================================================

/** Regression pack time budget (ms) */
export const REGRESSION_PACK_TIME_BUDGET_MS = 900000;

/** Max regression scenarios */
export const MAX_REGRESSION_SCENARIOS = 100;

// =============================================================================
// Test Profiles
// =============================================================================

/** Local fast profile */
export const LOCAL_FAST_PROFILE = {
  name: 'local-fast',
  timeoutMultiplier: 0.5,
  retries: 0,
  parallel: true,
  skipSlow: true,
};

/** Local full profile */
export const LOCAL_FULL_PROFILE = {
  name: 'local-full',
  timeoutMultiplier: 1.0,
  retries: 0,
  parallel: false,
  skipSlow: false,
};

/** CI profile */
export const CI_PROFILE = {
  name: 'ci',
  timeoutMultiplier: 1.0,
  retries: 1,
  parallel: true,
  skipSlow: false,
};

/** Staging pre-release profile */
export const STAGING_PRERELEASE_PROFILE = {
  name: 'staging-prerelease',
  timeoutMultiplier: 1.5,
  retries: 2,
  parallel: false,
  skipSlow: false,
};

/** Post-deploy smoke profile */
export const POSTDEPLOY_SMOKE_PROFILE = {
  name: 'postdeploy-smoke',
  timeoutMultiplier: 1.0,
  retries: 0,
  parallel: true,
  skipSlow: true,
};

// =============================================================================
// Failure Injection
// =============================================================================

/** Default failure injection rate */
export const DEFAULT_FAILURE_INJECTION_RATE = 0.1;

/** Timeout failure duration (ms) */
export const TIMEOUT_FAILURE_DURATION_MS = 5000;

/** Transient failure recovery time (ms) */
export const TRANSIENT_FAILURE_RECOVERY_MS = 1000;

// =============================================================================
// Test Database
// =============================================================================

/** Test database name prefix */
export const TEST_DB_PREFIX = 'affiliate_test';

/** Test database timeout (ms) */
export const TEST_DB_TIMEOUT_MS = 30000;

/** Test database pool size */
export const TEST_DB_POOL_SIZE = 5;

// =============================================================================
// Flaky Test Handling
// =============================================================================

/** Flaky test retry limit */
export const FLAKY_RETRY_LIMIT = 2;

/** Flaky threshold before quarantine */
export const FLAKY_THRESHOLD = 3;

// =============================================================================
// Report Settings
// =============================================================================

/** Report retention days */
export const REPORT_RETENTION_DAYS = 30;

/** Detailed report threshold (ms) */
export const DETAILED_REPORT_THRESHOLD_MS = 5000;
