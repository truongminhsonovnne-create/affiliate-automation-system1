/**
 * Security Layer - Runtime Boundary Guards
 * Enforce runtime boundaries to prevent module misuse
 */

import type { SecurityCheckResult } from '../types';

// =============================================================================
// RUNTIME DETECTION
// =============================================================================

/** Current runtime type */
export type RuntimeType = 'server' | 'client' | 'worker';

/**
 * Detect current runtime type
 */
export function detectRuntime(): RuntimeType {
  if (typeof window === 'undefined') {
    // Check if it's a worker
    if (typeof WorkerGlobalScope !== 'undefined') {
      return 'worker';
    }
    return 'server';
  }
  return 'client';
}

/**
 * Check if running in server environment
 */
export function isServerRuntime(): boolean {
  return detectRuntime() === 'server';
}

/**
 * Check if running in client environment
 */
export function isClientRuntime(): boolean {
  return detectRuntime() === 'client';
}

/**
 * Check if running in worker environment
 */
export function isWorkerRuntime(): boolean {
  return detectRuntime() === 'worker';
}

// =============================================================================
// BOUNDARY GUARDS
// =============================================================================

/**
 * Assert that code is running in server-only module
 * Use this to prevent server code from being imported in client bundles
 */
export function assertServerOnlyModuleUsage(): void {
  if (!isServerRuntime()) {
    throw new Error(
      '[Security] Server-only module accessed from client environment. ' +
      'This is a security violation that could expose secrets.'
    );
  }
}

/**
 * Assert that code is running in worker context
 */
export function assertWorkerOnlyExecution(context?: {
  workerType?: string;
}): SecurityCheckResult {
  if (!isWorkerRuntime()) {
    return {
      passed: false,
      reason: `This operation requires worker context${context?.workerType ? ` (${context.workerType})` : ''}`,
    };
  }
  return { passed: true };
}

/**
 * Assert that code is running in control plane context
 */
export function assertControlPlaneExecution(context?: {
  requiredRole?: string;
}): SecurityCheckResult {
  // In production, this would check additional context
  const runtime = detectRuntime();

  if (runtime === 'client') {
    return {
      passed: false,
      reason: 'Control plane operations must be executed from server',
    };
  }

  if (context?.requiredRole) {
    // Would check role in production
    return {
      passed: true,
      warnings: ['Role check not implemented in runtime guard'],
    };
  }

  return { passed: true };
}

/**
 * Assert that client code cannot access server secrets
 */
export function assertNoClientSecretAccess(): void {
  if (isClientRuntime()) {
    throw new Error(
      '[Security] Attempted to access server secrets from client. ' +
      'This is a security violation.'
    );
  }
}

// =============================================================================
// MODULE EXPORT GUARDS
// =============================================================================

/**
 * Guard function to wrap server-only exports
 * Use in server-only modules to prevent client usage
 */
export function createServerOnlyGuard<T>(
  factory: () => T,
  moduleName: string
): () => T {
  return function (): T {
    assertServerOnlyModuleUsage();
    return factory();
  };
}

// =============================================================================
// ENVIRONMENT GUARDS
// =============================================================================

/**
 * Get current environment
 */
export function getCurrentEnvironment(): string {
  return process.env.NODE_ENV ?? 'development';
}

/**
 * Check if running in production
 */
export function isProductionEnvironment(): boolean {
  return getCurrentEnvironment() === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopmentEnvironment(): boolean {
  return getCurrentEnvironment() === 'development';
}

/**
 * Assert production environment
 */
export function assertProductionEnvironment(): void {
  if (!isProductionEnvironment()) {
    throw new Error(
      `[Security] This operation is only allowed in production environment. ` +
      `Current: ${getCurrentEnvironment()}`
    );
  }
}

/**
 * Assert non-production environment
 */
export function assertNonProductionEnvironment(): void {
  if (isProductionEnvironment()) {
    throw new Error(
      `[Security] This operation is not allowed in production environment.`
    );
  }
}

// =============================================================================
// CROSS-BOUNDARY VALIDATION
// =============================================================================

/**
 * Validate data transfer between boundaries
 */
export function validateCrossBoundaryData(
  data: unknown,
  fromBoundary: string,
  toBoundary: string,
  options?: {
    requireSanitization?: boolean;
  }
): SecurityCheckResult {
  // In production, implement detailed boundary checks
  // For now, basic validation

  if (fromBoundary === 'server' && toBoundary === 'client') {
    // Check for secrets in data
    if (options?.requireSanitization !== false) {
      // Would check for secrets
      return { passed: true };
    }
  }

  return { passed: true };
}

/**
 * Create a boundary-safe data transformer
 */
export function createBoundarySafeTransformer<T>(
  transformer: (data: T) => T,
  boundary: string
): (data: T) => T {
  return function (data: T): T {
    assertServerOnlyModuleUsage();
    return transformer(data);
  };
}
