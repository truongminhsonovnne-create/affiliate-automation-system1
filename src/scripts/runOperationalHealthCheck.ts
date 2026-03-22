/**
 * Operational Health Check CLI Script
 *
 * Runs comprehensive health checks on all system components
 * and reports their status.
 */

import dotenv from 'dotenv';
import {
  runAllHealthChecks,
  getOverallHealthStatus,
  getCircuitBreaker,
  getAllCircuitBreakers,
  getRetryBudget,
  getAllRetryBudgets,
  getRateLimit,
  getAllRateLimits,
  log,
} from '../observability/index.js';
import type { HealthStatus } from '../observability/types.js';

dotenv.config();

/** Status icons */
const STATUS_ICONS: Record<HealthStatus, string> = {
  healthy: '✅',
  degraded: '⚠️',
  unhealthy: '❌',
  unknown: '❓',
};

/** Format duration */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/** Print health check result */
function printHealthCheck(result: {
  component: string;
  status: HealthStatus;
  message?: string;
  durationMs: number;
  details?: Record<string, unknown>;
}): void {
  const icon = STATUS_ICONS[result.status] || '❓';
  console.log(`  ${icon} ${result.component.padEnd(20)} | ${result.status.padEnd(12)} | ${result.message || 'OK'}`);

  if (result.details && result.status !== 'healthy') {
    console.log(`     Details: ${JSON.stringify(result.details)}`);
  }
}

/** Print circuit breaker status */
function printCircuitBreaker(name: string): void {
  const cb = getCircuitBreaker(name);
  const icons: Record<string, string> = {
    closed: '✅',
    open: '🔴',
    half_open: '🟡',
  };
  const icon = icons[cb.state] || '❓';

  console.log(`  ${icon} ${name.padEnd(15)} | ${cb.state.padEnd(10)} | failures: ${cb.totalFailures} / ${cb.totalCalls}`);
}

/** Print rate limit status */
function printRateLimit(name: string): void {
  const rl = getRateLimit(name);
  const usage = ((rl.current / rl.max) * 100).toFixed(0);

  let icon = '✅';
  if (rl.blocked) icon = '🔴';
  else if (rl.remaining < rl.max * 0.2) icon = '⚠️';

  console.log(`  ${icon} ${name.padEnd(20)} | ${rl.current}/${rl.max} (${usage}%) | remaining: ${rl.remaining}`);
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Operational Health Check');
  console.log('='.repeat(60));
  console.log();

  try {
    // Run health checks
    console.log('🔍 Running health checks...\n');
    const healthResults = await runAllHealthChecks();

    // Print health results
    console.log('📊 Health Status:');
    console.log('-'.repeat(60));

    for (const result of healthResults) {
      printHealthCheck(result);
    }

    // Overall status
    const overallStatus = getOverallHealthStatus(healthResults);
    const overallIcon = STATUS_ICONS[overallStatus] || '❓';

    console.log();
    console.log(`Overall Status: ${overallIcon} ${overallStatus.toUpperCase()}`);
    console.log();

    // Circuit breakers
    console.log('🔌 Circuit Breakers:');
    console.log('-'.repeat(60));
    const breakers = getAllCircuitBreakers();

    if (breakers.length === 0) {
      console.log('  No circuit breakers registered');
    } else {
      for (const cb of breakers) {
        printCircuitBreaker(cb.name);
      }
    }
    console.log();

    // Rate limits
    console.log('🚦 Rate Limits:');
    console.log('-'.repeat(60));
    const limits = getAllRateLimits();

    if (limits.length === 0) {
      console.log('  No rate limits tracked');
    } else {
      for (const rl of limits) {
        printRateLimit(rl.name);
      }
    }
    console.log();

    // Retry budgets
    console.log('🔄 Retry Budgets:');
    console.log('-'.repeat(60));
    const budgets = getAllRetryBudgets();

    if (budgets.length === 0) {
      console.log('  No retry budgets tracked');
    } else {
      for (const budget of budgets) {
        const icon = budget.available ? '✅' : '❌';
        console.log(`  ${icon} ${budget.operation.padEnd(20)} | remaining: ${budget.remainingRetries} | used in window: ${budget.usedInWindow}`);
      }
    }
    console.log();

    console.log('='.repeat(60));

    // Exit code based on health
    if (overallStatus === 'unhealthy') {
      process.exit(2);
    } else if (overallStatus === 'degraded') {
      process.exit(1);
    }

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Health check failed:', err);
    process.exit(2);
  }
}

main();
