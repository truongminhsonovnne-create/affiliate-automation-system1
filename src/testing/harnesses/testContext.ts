/**
 * Test Context
 *
 * Provides test execution context with fixtures, cleanup, and correlation.
 */

import { randomUUID } from 'crypto';
import type {
  TestContext,
  TestExecutionContextOptions,
  TestEnvironment,
  TestLayer,
} from '../types';

/**
 * Default test context options
 */
const defaultContextOptions: Required<TestExecutionContextOptions> = {
  environment: 'local',
  layer: 'unit',
  correlationId: '',
  metadata: {},
  fixtures: {},
};

/**
 * Create a new test context
 */
export function createTestContext(
  options?: TestExecutionContextOptions
): TestContext {
  const opts = { ...defaultContextOptions, ...options };

  return {
    id: randomUUID(),
    environment: opts.environment,
    layer: opts.layer,
    correlationId: opts.correlationId || randomUUID(),
    startedAt: new Date(),
    metadata: { ...opts.metadata },
    fixtures: new Map(Object.entries(opts.fixtures)),
    cleanup: [],
  };
}

/**
 * Clone test context with overrides
 */
export function cloneTestContext(
  original: TestContext,
  overrides?: Partial<TestExecutionContextOptions>
): TestContext {
  return {
    ...original,
    ...overrides,
    metadata: { ...original.metadata, ...overrides?.metadata },
    fixtures: new Map([...original.fixtures, ...(overrides?.fixtures ?? {})]),
  };
}

/**
 * Add fixture to context
 */
export function addFixtureToContext<T>(
  context: TestContext,
  name: string,
  fixture: T
): void {
  context.fixtures.set(name, fixture);
}

/**
 * Get fixture from context
 */
export function getFixtureFromContext<T>(context: TestContext, name: string): T | undefined {
  return context.fixtures.get(name) as T | undefined;
}

/**
 * Add cleanup handler to context
 */
export function addCleanupHandler(
  context: TestContext,
  handler: () => Promise<void>
): void {
  context.cleanup.push(handler);
}

/**
 * Execute all cleanup handlers
 */
export async function executeCleanup(context: TestContext): Promise<void> {
  const errors: Error[] = [];

  for (const handler of context.cleanup.reverse()) {
    try {
      await handler();
    } catch (error) {
      errors.push(error as Error);
    }
  }

  if (errors.length > 0) {
    console.warn(`Cleanup errors (${errors.length}):`, errors.map((e) => e.message));
  }
}

/**
 * Create async test context (for use with async/await)
 */
export async function createAsyncTestContext(
  options?: TestExecutionContextOptions
): Promise<TestContext> {
  return createTestContext(options);
}

/**
 * Get context metadata
 */
export function getContextMetadata(context: TestContext): Record<string, unknown> {
  return {
    ...context.metadata,
    contextId: context.id,
    correlationId: context.correlationId,
    environment: context.environment,
    layer: context.layer,
    startedAt: context.startedAt.toISOString(),
  };
}

/**
 * Validate context has required fixtures
 */
export function validateContextFixtures(
  context: TestContext,
  required: string[]
): { valid: boolean; missing: string[] } {
  const missing = required.filter((name) => !context.fixtures.has(name));
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Create test context with timeout
 */
export function createTimedTestContext(
  options: TestExecutionContextOptions & { timeout?: number }
): TestContext & { timeout: number } {
  const context = createTestContext(options);
  return {
    ...context,
    timeout: options.timeout ?? 30000,
  };
}

/**
 * Context factory for different test layers
 */
export function createLayerContext(
  layer: TestLayer,
  environment: TestEnvironment = 'local'
): TestContext {
  return createTestContext({ layer, environment });
}

/**
 * Context factory for different environments
 */
export function createEnvironmentContext(
  environment: TestEnvironment,
  layer: TestLayer = 'unit'
): TestContext {
  return createTestContext({ environment, layer });
}
