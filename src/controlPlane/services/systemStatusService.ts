/**
 * System Status Service
 *
 * Provides system health, operational snapshot, and metrics summary.
 */

import type { ControlPlaneRequestContext, AdminActionResult } from '../types.js';
import {
  generateOperationalSnapshot,
  runAllHealthChecks,
  getAllCircuitBreakers,
  getAllRateLimits,
  getAllRetryBudgets,
  takeSnapshot,
} from '../../observability/index.js';
import { createLogger } from '../../observability/logger/structuredLogger.js';

const logger = createLogger({ subsystem: 'system_status_service' });

/**
 * Get system health summary
 */
export async function getSystemHealthSummary(
  context: ControlPlaneRequestContext
): Promise<AdminActionResult> {
  const startTime = Date.now();

  try {
    const healthResults = await runAllHealthChecks();

    const healthy = healthResults.filter(h => h.status === 'healthy').length;
    const degraded = healthResults.filter(h => h.status === 'degraded').length;
    const unhealthy = healthResults.filter(h => h.status === 'unhealthy').length;

    const result = {
      overall: unhealthy > 0 ? 'unhealthy' : degraded > 0 ? 'degraded' : 'healthy',
      components: {
        healthy,
        degraded,
        unhealthy,
        total: healthResults.length,
      },
      checks: healthResults.map(h => ({
        component: h.component,
        status: h.status,
        message: h.message,
        durationMs: h.durationMs,
      })),
      generatedAt: new Date().toISOString(),
    };

    logger.info('System health retrieved', {
      actorId: context.actor.id,
      correlationId: context.correlationId,
    });

    return {
      success: true,
      data: result,
      correlationId: context.correlationId,
      actionType: 'system.health.read',
    };
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to get system health', error, { actorId: context.actor.id });

    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      correlationId: context.correlationId,
      actionType: 'system.health.read',
    };
  }
}

/**
 * Get operational snapshot summary
 */
export async function getOperationalSnapshotSummary(
  context: ControlPlaneRequestContext,
  options?: {
    includeSafeguards?: boolean;
    detectStuckJobs?: boolean;
  }
): Promise<AdminActionResult> {
  try {
    const snapshot = await generateOperationalSnapshot({
      includeSafeguards: options?.includeSafeguards !== false,
      detectStuckJobs: options?.detectStuckJobs !== false,
    });

    const result = {
      timestamp: snapshot.timestamp,
      health: snapshot.health.overall,
      healthChecks: snapshot.health.checks.length,
      safeguards: {
        circuitBreakers: snapshot.safeguards.circuitBreakers.length,
        open: snapshot.safeguards.circuitBreakers.filter(cb => cb.state === 'open').length,
        rateLimits: snapshot.safeguards.rateLimits.length,
        blocked: snapshot.safeguards.rateLimits.filter(rl => rl.blocked).length,
        retryBudgets: snapshot.safeguards.retryBudgets.length,
        exhausted: snapshot.safeguards.retryBudgets.filter(rb => !rb.available).length,
        stuckJobs: snapshot.safeguards.stuckJobs.length,
      },
      alerts: {
        total: snapshot.alerts.length,
        critical: snapshot.alerts.filter(a => a.severity === 'critical').length,
        error: snapshot.alerts.filter(a => a.severity === 'error').length,
        warning: snapshot.alerts.filter(a => a.severity === 'warning').length,
      },
      durationMs: snapshot.durationMs,
    };

    logger.info('Operational snapshot retrieved', {
      actorId: context.actor.id,
      correlationId: context.correlationId,
    });

    return {
      success: true,
      data: result,
      correlationId: context.correlationId,
      actionType: 'system.snapshot.read',
    };
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to get operational snapshot', error, { actorId: context.actor.id });

    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      correlationId: context.correlationId,
      actionType: 'system.snapshot.read',
    };
  }
}

/**
 * Get metrics summary
 */
export function getMetricsSummary(
  context: ControlPlaneRequestContext
): AdminActionResult {
  try {
    const snapshot = takeSnapshot();

    // Extract key counters
    const keyCounters = Object.entries(snapshot.counters).slice(0, 20);

    // Extract key gauges
    const keyGauges = Object.entries(snapshot.gauges).slice(0, 10);

    // Extract histogram summaries
    const histograms = Object.entries(snapshot.histograms)
      .slice(0, 10)
      .map(([name, hist]) => ({
        name,
        count: hist.count,
        p50: hist.p50,
        p90: hist.p90,
        p99: hist.p99,
      }));

    const result = {
      counters: Object.fromEntries(keyCounters),
      gauges: Object.fromEntries(keyGauges),
      histograms,
      totalCounters: Object.keys(snapshot.counters).length,
      totalGauges: Object.keys(snapshot.gauges).length,
      totalHistograms: Object.keys(snapshot.histograms).length,
      generatedAt: snapshot.timestamp,
    };

    logger.info('Metrics summary retrieved', {
      actorId: context.actor.id,
      correlationId: context.correlationId,
    });

    return {
      success: true,
      data: result,
      correlationId: context.correlationId,
      actionType: 'system.metrics.read',
    };
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to get metrics summary', error, { actorId: context.actor.id });

    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      correlationId: context.correlationId,
      actionType: 'system.metrics.read',
    };
  }
}

/**
 * Get worker status summary
 */
export async function getWorkerStatusSummary(
  context: ControlPlaneRequestContext
): Promise<AdminActionResult> {
  try {
    const { getActiveWorkers, getStaleWorkers } = await import('../../observability/health/heartbeat.js');

    const activeWorkers = getActiveWorkers();
    const staleWorkers = getStaleWorkers();

    const result = {
      active: activeWorkers.length,
      stale: staleWorkers.length,
      workers: [
        ...activeWorkers.map(w => ({
          workerId: w.workerId,
          workerName: w.workerName,
          status: 'alive',
          lastSeenAt: w.lastSeenAt,
          currentJobId: w.currentJobId,
          currentOperation: w.currentOperation,
        })),
        ...staleWorkers.map(w => ({
          workerId: w.workerId,
          workerName: w.workerName,
          status: 'stale',
          lastSeenAt: w.lastSeenAt,
        })),
      ],
      generatedAt: new Date().toISOString(),
    };

    logger.info('Worker status retrieved', {
      actorId: context.actor.id,
      correlationId: context.correlationId,
    });

    return {
      success: true,
      data: result,
      correlationId: context.correlationId,
      actionType: 'system.workers.read',
    };
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to get worker status', error, { actorId: context.actor.id });

    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      correlationId: context.correlationId,
      actionType: 'system.workers.read',
    };
  }
}

/**
 * Get circuit breaker status
 */
export function getCircuitBreakerStatus(
  context: ControlPlaneRequestContext
): AdminActionResult {
  try {
    const breakers = getAllCircuitBreakers();

    const result = {
      total: breakers.length,
      closed: breakers.filter(cb => cb.state === 'closed').length,
      open: breakers.filter(cb => cb.state === 'open').length,
      halfOpen: breakers.filter(cb => cb.state === 'half_open').length,
      breakers: breakers.map(cb => ({
        name: cb.name,
        state: cb.state,
        totalCalls: cb.totalCalls,
        totalFailures: cb.totalFailures,
        totalSuccesses: cb.totalSuccesses,
        lastFailureAt: cb.lastFailureAt,
      })),
      generatedAt: new Date().toISOString(),
    };

    return {
      success: true,
      data: result,
      correlationId: context.correlationId,
      actionType: 'system.health.read',
    };
  } catch (err) {
    const error = err as Error;
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      correlationId: context.correlationId,
      actionType: 'system.health.read',
    };
  }
}
