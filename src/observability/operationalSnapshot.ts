/**
 * Operational Snapshot
 *
 * Generates comprehensive operational snapshots combining health checks,
 * metrics, safeguards status, and alerts for production monitoring.
 */

import { createLogger } from './logger/structuredLogger.js';
import type {
  OperationalSnapshot,
  OperationalAlert,
  HealthCheckResult,
  CircuitBreakerState,
  RetryBudgetState,
  RateLimitState,
  StuckJobInfo,
} from './types.js';
import { ALERTING_ENABLED, ALERT_COOLDOWN_MS } from './constants.js';

import {
  runAllHealthChecks,
  getCachedHealthResults,
} from './health/healthChecks.js';

import { takeSnapshot as takeMetricsSnapshot } from './metrics/inMemoryMetrics.js';

import {
  getAllCircuitBreakers,
} from './safeguards/circuitBreaker.js';

import {
  getAllRetryBudgets,
} from './safeguards/retryBudget.js';

import {
  getAllRateLimits,
} from './safeguards/rateLimitGuard.js';

import {
  detectAllStuckJobs,
  getCriticalStuckJobs,
} from './safeguards/stuckJobDetector.js';

import {
  getAllDeadLetters,
  getDeadLetterCounts,
} from './safeguards/deadLetter.js';

const logger = createLogger({ subsystem: 'operational_snapshot' });

/** Alert cooldown tracking */
const alertCooldowns: Map<string, number> = new Map();

/** Generate unique alert ID */
function generateAlertId(): string {
  return `alert_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Check if alert is in cooldown
 */
function isAlertInCooldown(alertKey: string): boolean {
  const lastAlert = alertCooldowns.get(alertKey);
  if (!lastAlert) return false;
  return Date.now() - lastAlert < ALERT_COOLDOWN_MS;
}

/**
 * Record alert cooldown
 */
function recordAlert(alertKey: string): void {
  alertCooldowns.set(alertKey, Date.now());
}

/**
 * Generate health alerts
 */
function generateHealthAlerts(healthResults: HealthCheckResult[]): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];

  for (const health of healthResults) {
    if (health.status === 'unhealthy') {
      const alertKey = `health_unhealthy_${health.component}`;
      if (!isAlertInCooldown(alertKey)) {
        alerts.push({
          id: generateAlertId(),
          severity: 'error',
          component: health.component,
          message: `Health check failed: ${health.message}`,
          details: health.details,
          detectedAt: health.timestamp,
        });
        recordAlert(alertKey);
      }
    } else if (health.status === 'degraded') {
      const alertKey = `health_degraded_${health.component}`;
      if (!isAlertInCooldown(alertKey)) {
        alerts.push({
          id: generateAlertId(),
          severity: 'warning',
          component: health.component,
          message: `Health check degraded: ${health.message}`,
          details: health.details,
          detectedAt: health.timestamp,
        });
        recordAlert(alertKey);
      }
    }
  }

  return alerts;
}

/**
 * Generate circuit breaker alerts
 */
function generateCircuitBreakerAlerts(breakers: CircuitBreakerState[]): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];

  for (const breaker of breakers) {
    if (breaker.state === 'open') {
      const alertKey = `circuit_open_${breaker.name}`;
      if (!isAlertInCooldown(alertKey)) {
        alerts.push({
          id: generateAlertId(),
          severity: 'error',
          component: 'circuit_breaker',
          message: `Circuit breaker open: ${breaker.name}`,
          details: {
            totalFailures: breaker.totalFailures,
            lastFailureAt: breaker.lastFailureAt,
            lastFailureReason: breaker.lastFailureReason,
          },
          detectedAt: new Date().toISOString(),
        });
        recordAlert(alertKey);
      }
    }
  }

  return alerts;
}

/**
 * Generate stuck job alerts
 */
function generateStuckJobAlerts(stuckJobs: StuckJobInfo[]): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];

  // Group by severity
  const critical = stuckJobs.filter(j => j.severity === 'critical');
  const high = stuckJobs.filter(j => j.severity === 'high');

  if (critical.length > 0) {
    const alertKey = 'stuck_jobs_critical';
    if (!isAlertInCooldown(alertKey)) {
      alerts.push({
        id: generateAlertId(),
        severity: 'critical',
        component: 'stuck_jobs',
        message: `${critical.length} critical stuck jobs detected`,
        details: {
          jobs: critical.map(j => ({ jobId: j.jobId, issue: j.issue, recommendation: j.recommendation })),
        },
        detectedAt: new Date().toISOString(),
      });
      recordAlert(alertKey);
    }
  }

  if (high.length > 0) {
    const alertKey = 'stuck_jobs_high';
    if (!isAlertInCooldown(alertKey)) {
      alerts.push({
        id: generateAlertId(),
        severity: 'error',
        component: 'stuck_jobs',
        message: `${high.length} high-severity stuck jobs detected`,
        details: {
          jobs: high.map(j => ({ jobId: j.jobId, issue: j.issue })),
        },
        detectedAt: new Date().toISOString(),
      });
      recordAlert(alertKey);
    }
  }

  return alerts;
}

/**
 * Generate dead letter alerts
 */
function generateDeadLetterAlerts(deadLetterCounts: Record<string, number>): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];

  const quarantined = deadLetterCounts.quarantined || 0;
  const review = deadLetterCounts.review || 0;

  if (quarantined > 10) {
    const alertKey = 'dead_letter_quarantine';
    if (!isAlertInCooldown(alertKey)) {
      alerts.push({
        id: generateAlertId(),
        severity: 'warning',
        component: 'dead_letter',
        message: `${quarantined} items in quarantine`,
        details: { quarantined },
        detectedAt: new Date().toISOString(),
      });
      recordAlert(alertKey);
    }
  }

  if (review > 5) {
    const alertKey = 'dead_letter_review';
    if (!isAlertInCooldown(alertKey)) {
      alerts.push({
        id: generateAlertId(),
        severity: 'error',
        component: 'dead_letter',
        message: `${review} items require review`,
        details: { review },
        detectedAt: new Date().toISOString(),
      });
      recordAlert(alertKey);
    }
  }

  return alerts;
}

/**
 * Generate rate limit alerts
 */
function generateRateLimitAlerts(rateLimits: RateLimitState[]): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];

  for (const limit of rateLimits) {
    if (limit.blocked) {
      const alertKey = `rate_limit_blocked_${limit.name}`;
      if (!isAlertInCooldown(alertKey)) {
        alerts.push({
          id: generateAlertId(),
          severity: 'error',
          component: 'rate_limit',
          message: `Rate limit blocked: ${limit.name}`,
          details: {
            current: limit.current,
            max: limit.max,
            blockedUntil: limit.blockedUntil,
          },
          detectedAt: new Date().toISOString(),
        });
        recordAlert(alertKey);
      }
    }
  }

  return alerts;
}

/**
 * Generate operational snapshot
 */
export async function generateOperationalSnapshot(
  options?: {
    includeHealth?: boolean;
    includeSafeguards?: boolean;
    includeAlerts?: boolean;
    detectStuckJobs?: boolean;
  }
): Promise<OperationalSnapshot> {
  const startTime = Date.now();

  const includeHealth = options?.includeHealth !== false;
  const includeSafeguards = options?.includeSafeguards !== false;
  const includeAlerts = options?.includeAlerts !== false && ALERTING_ENABLED;
  const detectStuckJobs = options?.detectStuckJobs !== false;

  // Run health checks
  let healthResults: HealthCheckResult[] = [];
  if (includeHealth) {
    healthResults = await runAllHealthChecks();
  }

  // Get metrics snapshot
  const metricsSnapshot = takeMetricsSnapshot();

  // Get safeguards status
  let circuitBreakers: CircuitBreakerState[] = [];
  let retryBudgets: RetryBudgetState[] = [];
  let rateLimits: RateLimitState[] = [];
  let stuckJobs: StuckJobInfo[] = [];
  let deadLetterCounts: Record<string, number> = {
    quarantined: 0,
    review: 0,
    resolved: 0,
    discarded: 0,
  };

  if (includeSafeguards) {
    circuitBreakers = getAllCircuitBreakers();
    retryBudgets = getAllRetryBudgets();
    rateLimits = getAllRateLimits();

    if (detectStuckJobs) {
      stuckJobs = await detectAllStuckJobs();
    }

    deadLetterCounts = getDeadLetterCounts();
  }

  // Determine overall health status
  let overallHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  if (healthResults.length > 0) {
    const hasUnhealthy = healthResults.some(h => h.status === 'unhealthy');
    const hasDegraded = healthResults.some(h => h.status === 'degraded');

    if (hasUnhealthy) {
      overallHealth = 'unhealthy';
    } else if (hasDegraded) {
      overallHealth = 'degraded';
    }
  }

  // Generate alerts
  let alerts: OperationalAlert[] = [];
  if (includeAlerts) {
    alerts = [
      ...generateHealthAlerts(healthResults),
      ...generateCircuitBreakerAlerts(circuitBreakers),
      ...generateStuckJobAlerts(stuckJobs),
      ...generateDeadLetterAlerts(deadLetterCounts),
      ...generateRateLimitAlerts(rateLimits),
    ];
  }

  const snapshot: OperationalSnapshot = {
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    health: {
      overall: overallHealth,
      checks: healthResults,
    },
    metrics: metricsSnapshot,
    safeguards: {
      circuitBreakers,
      retryBudgets,
      rateLimits,
      stuckJobs,
    },
    alerts,
    metadata: {
      generatedAt: new Date().toISOString(),
      alertsEnabled: ALERTING_ENABLED,
      version: process.env.SERVICE_VERSION || '1.0.0',
    },
  };

  // Log summary
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const errorAlerts = alerts.filter(a => a.severity === 'error');

  if (criticalAlerts.length > 0) {
    logger.error(`Operational snapshot: ${criticalAlerts.length} critical alerts`, {
      alerts: criticalAlerts.map(a => a.message),
    });
  } else if (errorAlerts.length > 0) {
    logger.warn(`Operational snapshot: ${errorAlerts.length} error alerts`, {
      alerts: errorAlerts.map(a => a.message),
    });
  } else {
    logger.debug('Operational snapshot: all systems operational');
  }

  return snapshot;
}

/**
 * Generate lightweight snapshot (no async operations)
 */
export function generateQuickSnapshot(): OperationalSnapshot {
  const healthResults = getCachedHealthResults();
  const metricsSnapshot = takeMetricsSnapshot();
  const circuitBreakers = getAllCircuitBreakers();
  const retryBudgets = getAllRetryBudgets();
  const rateLimits = getAllRateLimits();
  const stuckJobs = getCriticalStuckJobs();
  const deadLetterCounts = getDeadLetterCounts();

  // Determine overall health
  let overallHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  if (healthResults.length > 0) {
    const hasUnhealthy = healthResults.some(h => h.status === 'unhealthy');
    const hasDegraded = healthResults.some(h => h.status === 'degraded');

    if (hasUnhealthy) {
      overallHealth = 'unhealthy';
    } else if (hasDegraded) {
      overallHealth = 'degraded';
    }
  }

  return {
    timestamp: new Date().toISOString(),
    durationMs: 0,
    health: {
      overall: overallHealth,
      checks: healthResults,
    },
    metrics: metricsSnapshot,
    safeguards: {
      circuitBreakers,
      retryBudgets,
      rateLimits,
      stuckJobs,
    },
    alerts: [],
    metadata: {
      quick: true,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Get snapshot summary for logging
 */
export function getSnapshotSummary(snapshot: OperationalSnapshot): string {
  const lines: string[] = [];

  lines.push(`📊 Operational Snapshot: ${snapshot.timestamp}`);
  lines.push(`   Health: ${snapshot.health.overall.toUpperCase()}`);

  if (snapshot.health.checks.length > 0) {
    const healthy = snapshot.health.checks.filter(h => h.status === 'healthy').length;
    const degraded = snapshot.health.checks.filter(h => h.status === 'degraded').length;
    const unhealthy = snapshot.health.checks.filter(h => h.status === 'unhealthy').length;
    lines.push(`   Components: ${healthy} ✅ ${degraded} ⚠️ ${unhealthy} ❌`);
  }

  const openCircuits = snapshot.safeguards.circuitBreakers.filter(c => c.state === 'open').length;
  if (openCircuits > 0) {
    lines.push(`   Circuit Breakers: ${openCircuits} OPEN 🔴`);
  }

  if (snapshot.safeguards.stuckJobs.length > 0) {
    lines.push(`   Stuck Jobs: ${snapshot.safeguards.stuckJobs.length} 🔧`);
  }

  const alertCount = snapshot.alerts.length;
  if (alertCount > 0) {
    const critical = snapshot.alerts.filter(a => a.severity === 'critical').length;
    const error = snapshot.alerts.filter(a => a.severity === 'error').length;
    lines.push(`   Alerts: ${alertCount} (${critical} critical, ${error} error)`);
  }

  return lines.join('\n');
}
