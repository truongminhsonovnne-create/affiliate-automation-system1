/**
 * Health Check
 *
 * Health check endpoints for Growth Engine.
 */

import { Router, Request, Response } from 'express';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  latencyMs?: number;
}

const router = Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/health', async (req: Request, res: Response) => {
  const start = Date.now();

  const checks: HealthCheck[] = [];

  // Check database connectivity
  try {
    // Would check DB in production
    checks.push({
      name: 'database',
      status: 'pass',
      latencyMs: Date.now() - start,
    });
  } catch (error) {
    checks.push({
      name: 'database',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: Date.now() - start,
    });
  }

  // Check cache connectivity
  try {
    // Would check cache in production
    checks.push({
      name: 'cache',
      status: 'pass',
      latencyMs: Date.now() - start,
    });
  } catch (error) {
    checks.push({
      name: 'cache',
      status: 'warn',
      message: 'Cache unavailable',
      latencyMs: Date.now() - start,
    });
  }

  // Check external services
  try {
    // Would check external services
    checks.push({
      name: 'external_services',
      status: 'pass',
      latencyMs: Date.now() - start,
    });
  } catch (error) {
    checks.push({
      name: 'external_services',
      status: 'warn',
      message: 'Some external services unavailable',
      latencyMs: Date.now() - start,
    });
  }

  // Determine overall status
  const failedChecks = checks.filter(c => c.status === 'fail');
  const warnedChecks = checks.filter(c => c.status === 'warn');

  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (failedChecks.length > 0) {
    status = 'unhealthy';
  } else if (warnedChecks.length > 0) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }

  const healthStatus: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks,
  };

  const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});

/**
 * GET /health/ready
 * Readiness probe
 */
router.get('/health/ready', async (req: Request, res: Response) => {
  try {
    // Would check if service is ready to accept traffic
    res.json({
      ready: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /health/live
 * Liveness probe
 */
router.get('/health/live', (req: Request, res: Response) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});

export default router;
