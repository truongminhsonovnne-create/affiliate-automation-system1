/**
 * Operational Snapshot CLI Script
 *
 * Generates comprehensive operational snapshots including health checks,
 * metrics, safeguards status, and alerts.
 */

import dotenv from 'dotenv';
import {
  generateOperationalSnapshot,
  generateQuickSnapshot,
  getSnapshotSummary,
  log,
} from '../observability/index.js';

dotenv.config();

/** Format bytes to human readable */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Format number with commas */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

/** Print metrics summary */
function printMetricsSummary(metrics: any): void {
  console.log('\n📈 Key Metrics:');

  // Counters
  const importantCounters = [
    'runner_jobs_published',
    'runner_jobs_failed',
    'publishing_jobs_created',
    'system_heartbeats_sent',
  ];

  for (const name of importantCounters) {
    const value = metrics.counters[name];
    if (value !== undefined) {
      console.log(`   ${name}: ${formatNumber(value)}`);
    }
  }

  // Gauges
  if (Object.keys(metrics.gauges).length > 0) {
    console.log('\n   Gauges:');
    for (const [key, value] of Object.entries(metrics.gauges)) {
      if (key.includes('memory') || key.includes('cpu')) {
        console.log(`   ${key}: ${value}`);
      }
    }
  }

  // Histograms
  if (Object.keys(metrics.histograms).length > 0) {
    console.log('\n   Latency Histograms (p99):');
    for (const [key, hist] of Object.entries(metrics.histograms)) {
      const h = hist as any;
      if (h.p99) {
        console.log(`   ${key}: ${h.p99.toFixed(2)}ms`);
      }
    }
  }
}

/** Print safeguards summary */
function printSafeguardsSummary(snapshot: any): void {
  const { safeguards } = snapshot;

  // Circuit breakers
  if (safeguards.circuitBreakers.length > 0) {
    console.log('\n🔌 Circuit Breakers:');
    const open = safeguards.circuitBreakers.filter((cb: any) => cb.state === 'open');
    const halfOpen = safeguards.circuitBreakers.filter((cb: any) => cb.state === 'half_open');

    if (open.length > 0) {
      console.log(`   🔴 Open: ${open.map((cb: any) => cb.name).join(', ')}`);
    }
    if (halfOpen.length > 0) {
      console.log(`   🟡 Half-Open: ${halfOpen.map((cb: any) => cb.name).join(', ')}`);
    }
    if (open.length === 0 && halfOpen.length === 0) {
      console.log(`   ✅ All closed`);
    }
  }

  // Stuck jobs
  if (safeguards.stuckJobs.length > 0) {
    console.log('\n🔧 Stuck Jobs:');
    const critical = safeguards.stuckJobs.filter((j: any) => j.severity === 'critical').length;
    const high = safeguards.stuckJobs.filter((j: any) => j.severity === 'high').length;
    const medium = safeguards.stuckJobs.filter((j: any) => j.severity === 'medium').length;

    if (critical > 0) console.log(`   🔴 Critical: ${critical}`);
    if (high > 0) console.log(`   🟠 High: ${high}`);
    if (medium > 0) console.log(`   🟡 Medium: ${medium}`);
  }

  // Rate limits
  const blocked = safeguards.rateLimits.filter((rl: any) => rl.blocked);
  if (blocked.length > 0) {
    console.log('\n🚦 Rate Limits (blocked):');
    for (const rl of blocked) {
      console.log(`   🔴 ${rl.name} - blocked until ${rl.blockedUntil}`);
    }
  }
}

/** Print alerts */
function printAlerts(alerts: any[]): void {
  if (alerts.length === 0) {
    console.log('\n🔔 Alerts: None');
    return;
  }

  console.log('\n🔔 Alerts:');

  const critical = alerts.filter((a: any) => a.severity === 'critical');
  const error = alerts.filter((a: any) => a.severity === 'error');
  const warning = alerts.filter((a: any) => a.severity === 'warning');
  const info = alerts.filter((a: any) => a.severity === 'info');

  if (critical.length > 0) {
    console.log(`   🔴 Critical (${critical.length}):`);
    for (const a of critical) {
      console.log(`      - ${a.message}`);
    }
  }

  if (error.length > 0) {
    console.log(`   🔴 Error (${error.length}):`);
    for (const a of error) {
      console.log(`      - ${a.message}`);
    }
  }

  if (warning.length > 0) {
    console.log(`   ⚠️ Warning (${warning.length}):`);
    for (const a of warning) {
      console.log(`      - ${a.message}`);
    }
  }

  if (info.length > 0) {
    console.log(`   ℹ️ Info (${info.length}):`);
    for (const a of info) {
      console.log(`      - ${a.message}`);
    }
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const quick = args.includes('--quick') || args.includes('-q');
  const json = args.includes('--json') || args.includes('-j');

  console.log('='.repeat(60));
  console.log('Operational Snapshot');
  console.log('='.repeat(60));
  console.log();

  try {
    let snapshot;

    if (quick) {
      console.log('📸 Generating quick snapshot...\n');
      snapshot = generateQuickSnapshot();
    } else {
      console.log('📸 Generating full snapshot (this may take a moment)...\n');
      snapshot = await generateOperationalSnapshot();
    }

    if (json) {
      // Output as JSON
      console.log(JSON.stringify(snapshot, null, 2));
      console.log();
    }

    // Health summary
    const healthIcon = {
      healthy: '✅',
      degraded: '⚠️',
      unhealthy: '❌',
    }[snapshot.health.overall] || '❓';

    console.log(`Overall Health: ${healthIcon} ${snapshot.health.overall.toUpperCase()}`);

    // Component health
    if (snapshot.health.checks.length > 0) {
      const healthy = snapshot.health.checks.filter((h: any) => h.status === 'healthy').length;
      const degraded = snapshot.health.checks.filter((h: any) => h.status === 'degraded').length;
      const unhealthy = snapshot.health.checks.filter((h: any) => h.status === 'unhealthy').length;

      console.log(`Components: ${healthy} ✅ ${degraded} ⚠️ ${unhealthy} ❌`);
    }

    // Print detailed sections
    printMetricsSummary(snapshot.metrics);
    printSafeguardsSummary(snapshot);

    if (!quick) {
      printAlerts(snapshot.alerts);
    }

    console.log();
    console.log(`Generated: ${snapshot.timestamp}`);
    console.log(`Duration: ${snapshot.durationMs}ms`);
    console.log('='.repeat(60));

    // Exit code based on health
    if (snapshot.health.overall === 'unhealthy') {
      process.exit(2);
    } else if (snapshot.health.overall === 'degraded') {
      process.exit(1);
    }

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Snapshot generation failed:', err);
    process.exit(2);
  }
}

main();
