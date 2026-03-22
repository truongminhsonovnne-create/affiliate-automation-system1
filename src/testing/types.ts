/**
 * Testing Types and Interfaces
 *
 * Shared types for the Affiliate Automation System test architecture.
 */

// =============================================================================
// Test Layers
// =============================================================================

/** Test layer types */
export type TestLayer = 'unit' | 'integration' | 'workflow' | 'e2e' | 'smoke';

/** Test suite kinds */
export type TestSuiteKind =
  | 'unit'
  | 'integration'
  | 'workflow'
  | 'e2e'
  | 'smoke'
  | 'regression'
  | 'staging-verification';

/** Test environment */
export type TestEnvironment = 'local' | 'ci' | 'staging' | 'production';

// =============================================================================
// Test Scenarios
// =============================================================================

/** Test scenario descriptor */
export interface TestScenario {
  id: string;
  name: string;
  description: string;
  layer: TestLayer;
  tags: string[];
  timeout?: number;
  retries?: number;
  flaky?: boolean;
}

// =============================================================================
// Fixtures
// =============================================================================

/** Fixture descriptor */
export interface TestFixtureDescriptor {
  name: string;
  type: 'sample' | 'mock' | 'fixture' | 'stub';
  description: string;
  data: unknown;
  tags: string[];
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

/** Dataset descriptor */
export interface TestDatasetDescriptor {
  name: string;
  description: string;
  fixtures: string[];
  size: number;
  classification: 'synthetic' | 'anonymized' | 'edge-case';
}

// =============================================================================
// Verification Packs
// =============================================================================

/** Verification pack */
export interface VerificationPack {
  name: string;
  description: string;
  scenarios: TestScenario[];
  environment: TestEnvironment;
  timeout?: number;
  parallel?: boolean;
}

/** Verification pack result */
export interface VerificationPackResult {
  pack: string;
  passed: boolean;
  duration: number;
  executed: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  results: VerificationPackItemResult[];
  errors: string[];
}

export interface VerificationPackItemResult {
  scenario: string;
  passed: boolean;
  duration: number;
  error?: string;
}

// =============================================================================
// Reliability
// =============================================================================

/** Reliability check result */
export interface ReliabilityCheckResult {
  check: string;
  passed: boolean;
  duration: number;
  metric?: string;
  value?: number;
  threshold?: number;
  error?: string;
}

/** Failure injection scenario */
export interface FailureInjectionScenario {
  id: string;
  name: string;
  type: 'transient' | 'timeout' | 'invalid-payload' | 'dependency-unavailable';
  target: 'repository' | 'ai' | 'publishing' | 'crawler';
  injected: boolean;
  expectedBehavior: string;
}

// =============================================================================
// Regression
// =============================================================================

/** Regression pack */
export interface RegressionPack {
  name: string;
  description: string;
  scenarios: TestScenario[];
  baseline?: RegressionBaseline;
}

export interface RegressionBaseline {
  date: Date;
  passed: number;
  failed: number;
  duration: number;
}

// =============================================================================
// Smoke Tests
// =============================================================================

/** Smoke check result */
export interface SmokeCheckResult {
  check: string;
  passed: boolean;
  endpoint?: string;
  responseTime?: number;
  error?: string;
}

// =============================================================================
// Contract Validation
// =============================================================================

/** Contract validation result */
export interface ContractValidationResult {
  contract: string;
  passed: boolean;
  errors: ContractValidationError[];
  warnings: string[];
}

export interface ContractValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

// =============================================================================
// Assertions
// =============================================================================

/** Extraction quality assertion */
export interface ExtractionQualityAssertion {
  field: string;
  expected: string;
  actual: string;
  threshold?: number;
  passed: boolean;
}

/** AI output validation result */
export interface AiOutputValidationResult {
  schemaValid: boolean;
  hasRequiredFields: boolean;
  hasContent: boolean;
  hasHashtags: boolean;
  qualityPass: boolean;
  errors: string[];
  warnings: string[];
}

/** Publish lifecycle validation result */
export interface PublishLifecycleValidationResult {
  lifecycleValid: boolean;
  transitions: PublishTransition[];
  errors: string[];
}

export interface PublishTransition {
  from: string;
  to: string;
  valid: boolean;
  timestamp?: Date;
}

// =============================================================================
// Execution
// =============================================================================

/** Test execution summary */
export interface TestExecutionSummary {
  layer: TestLayer;
  environment: TestEnvironment;
  startedAt: Date;
  completedAt: Date;
  duration: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  results: TestResultItem[];
}

export interface TestResultItem {
  name: string;
  layer: TestLayer;
  passed: boolean;
  duration: number;
  error?: string;
  flaky?: boolean;
}

// =============================================================================
// Test Context
// =============================================================================

/** Test context */
export interface TestContext {
  id: string;
  environment: TestEnvironment;
  layer: TestLayer;
  correlationId: string;
  startedAt: Date;
  metadata: Record<string, unknown>;
  fixtures: Map<string, unknown>;
  cleanup: Array<() => Promise<void>>;
}

/** Test execution context options */
export interface TestExecutionContextOptions {
  environment?: TestEnvironment;
  layer?: TestLayer;
  correlationId?: string;
  metadata?: Record<string, unknown>;
  fixtures?: Record<string, unknown>;
}

// =============================================================================
// Test Profiles
// =============================================================================

/** Test profile */
export interface TestProfile {
  name: string;
  environment: TestEnvironment;
  layer: TestLayer;
  timeoutMultiplier: number;
  retries: number;
  parallel: boolean;
  skipSlow: boolean;
}

/** Verification profile */
export interface VerificationProfile {
  name: string;
  checks: VerificationCheck[];
  timeout: number;
}

export interface VerificationCheck {
  name: string;
  type: 'health' | 'readiness' | 'database' | 'worker' | 'api';
  endpoint?: string;
  expectedStatus?: number;
  timeout?: number;
}

// =============================================================================
// Mock Types
// =============================================================================

/** Mock HTTP response */
export interface MockResponse<T> {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Map<string, string>;
  data: T;
  delay?: number;
}

/** Mock endpoint handler */
export interface MockEndpointHandler<TRequest, TResponse> {
  handle(request: TRequest): Promise<TResponse>;
  delay?: number;
  shouldFail?: boolean;
  failureError?: string;
}
