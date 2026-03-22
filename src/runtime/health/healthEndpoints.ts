/**
 * Runtime Layer - Health Endpoints
 * Health, readiness, and liveness endpoints
 */

import type { RuntimeHealthStatus, RuntimeReadinessStatus } from '../types';
import { HEALTH_STATUS } from '../types';
import { runRoleDependencyChecks } from '../bootstrap/dependencyChecks';
import { getProcessIdentity, getLifecycleHooks } from '../bootstrap/bootstrapRuntime';
import { resolveRuntimeRole } from '../environment';

// =============================================================================
// HEALTH ENDPOINTS
// =============================================================================

/** Health endpoint response */
export interface HealthEndpointResponse {
  status: string;
  role?: string;
  environment?: string;
  version?: string;
  instanceId?: string;
  uptime?: number;
  timestamp: string;
  checks?: Record<string, unknown>;
}

/**
 * Build liveness response
 * Always returns healthy if process is running
 */
export function buildLivenessResponse(): HealthEndpointResponse {
  const identity = getProcessIdentity();

  return {
    status: 'healthy',
    role: identity?.role,
    version: identity?.version,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build readiness response
 * Checks if runtime can handle requests
 */
export async function buildReadinessResponse(): Promise<RuntimeReadinessStatus> {
  const identity = getProcessIdentity();

  try {
    // Run dependency checks
    const role = identity?.role ?? resolveRuntimeRole();
    const dependencyChecks = await runRoleDependencyChecks(role);

    // Determine readiness
    const unhealthy = dependencyChecks.filter((c) => c.status === 'unhealthy');

    if (unhealthy.length > 0) {
      return {
        ready: false,
        reason: `Unhealthy dependencies: ${unhealthy.map((c) => c.name).join(', ')}`,
        checks: dependencyChecks,
      };
    }

    return {
      ready: true,
      checks: dependencyChecks,
    };
  } catch (error) {
    return {
      ready: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
      checks: [],
    };
  }
}

/**
 * Build startup response
 * Checks if runtime initialization is complete
 */
export function buildStartupResponse(): {
  status: string;
  ready: boolean;
  timestamp: string;
} {
  const identity = getProcessIdentity();
  const hooks = getLifecycleHooks();

  // If there's an onStartup hook and no onHealthCheck yet, we're starting
  const isStarting = !hooks.onHealthCheck;

  return {
    status: isStarting ? 'starting' : 'ready',
    ready: !isStarting,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build full health status
 */
export async function buildHealthStatus(): Promise<RuntimeHealthStatus> {
  const identity = getProcessIdentity();

  const dependencyChecks = await runRoleDependencyChecks(
    identity?.role ?? resolveRuntimeRole(),
    { timeout: 5000 }
  );

  const unhealthy = dependencyChecks.filter((c) => c.status === 'unhealthy');
  const degraded = dependencyChecks.filter((c) => c.status === 'degraded');

  let status: typeof HEALTH_STATUS[keyof typeof HEALTH_STATUS];
  if (unhealthy.length > 0) {
    status = HEALTH_STATUS.UNHEALTHY;
  } else if (degraded.length > 0) {
    status = HEALTH_STATUS.DEGRADED;
  } else {
    status = HEALTH_STATUS.HEALTHY;
  }

  return {
    status,
    checks: dependencyChecks,
    uptime: identity ? Date.now() - identity.startedAt.getTime() : 0,
    timestamp: new Date(),
  };
}

// =============================================================================
// EXPRESS/KOA INTEGRATION
// =============================================================================

/**
 * Register health endpoints to Express
 */
export function registerHealthEndpoints(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app: any,
  options?: {
    livenessPath?: string;
    readinessPath?: string;
    startupPath?: string;
    healthPath?: string;
  }
): void {
  const {
    livenessPath = '/health/live',
    readinessPath = '/health/ready',
    startupPath = '/health/startup',
    healthPath = '/health',
  } = options;

  // Liveness probe - basic process check
  app.get(livenessPath, (_req, res) => {
    const response = buildLivenessResponse();
    res.json(response);
  });

  // Readiness probe - dependency check
  app.get(readinessPath, async (_req, res) => {
    const response = await buildReadinessResponse();
    res.status(response.ready ? 200 : 503).json(response);
  });

  // Startup probe - initialization check
  app.get(startupPath, (_req, res) => {
    const response = buildStartupResponse();
    res.json(response);
  });

  // Full health check
  app.get(healthPath, async (_req, res) => {
    const response = await buildHealthStatus();
    res.status(response.status === HEALTH_STATUS.HEALTHY ? 200 : 503).json(response);
  });
}

// =============================================================================
// NEXT.JS API ROUTE EXAMPLE
// =============================================================================

/**
 * Example Next.js API route handler for health
 */
export async function healthApiRoute() {
  const health = await buildHealthStatus();
  return {
    status: health.status,
    checks: health.checks.map((c) => ({ name: c.name, status: c.status })),
    timestamp: health.timestamp.toISOString(),
  };
}
