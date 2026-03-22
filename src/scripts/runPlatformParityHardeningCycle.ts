/**
 * Run Platform Parity Hardening Cycle
 * CLI script to execute the full parity hardening workflow
 */

import { getLogger } from '../utils/logger.js';
import { runPlatformParityHardeningCycle } from '../platformParity/service/platformParityHardeningService.js';
import {
  recordHardeningCycleRun,
  recordHardeningCycleError,
  getMetricsSummary,
} from '../platformParity/observability/platformParityMetrics.js';
import {
  emitHardeningCycleStarted,
  emitHardeningCycleCompleted,
  emitHardeningCycleFailed,
} from '../platformParity/observability/platformParityEvents.js';

const logger = getLogger('run-platform-parity-hardening-cycle');

interface CliArgs {
  shopeeMetrics?: Record<string, number>;
  tiktokMetrics?: Record<string, number>;
  dryRun?: boolean;
  verbose?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '--verbose' || arg === '-v') {
      result.verbose = true;
    }
  }

  return result;
}

/**
 * Build sample metrics (in production, would fetch from actual data sources)
 */
function buildSampleMetrics(): { shopeeMetrics: Record<string, number>; tiktokMetrics: Record<string, number> } {
  // Shopee metrics (production-grade)
  const shopeeMetrics: Record<string, number> = {
    // Operational
    totalProducts: 15000,
    activeProducts: 12500,
    errorRate: 0.03,
    crawlSuccessRate: 0.97,
    avgResponseTime: 250,
    dataQualityScore: 0.92,

    // Discovery
    discoveredProducts: 2500,
    discoverySuccessRate: 0.95,
    uniqueProductsFound: 2300,

    // Detail
    detailExtractionSuccess: 0.94,
    mediaQualityScore: 0.88,
    attributeCompleteness: 0.91,

    // Enrichment
    enrichmentSuccessRate: 0.89,
    aiProcessingTime: 1500,
    enrichmentQualityScore: 0.85,

    // Commercial
    totalRevenue: 125000,
    conversionRate: 0.045,
    avgOrderValue: 35,
    attributedSales: 112500,

    // Growth
    newProducts: 450,
    trendingProducts: 120,
    growthRates: 0.12,

    // Governance
    releaseReadinessScore: 0.92,
    enablementRiskScore: 0.08,
    backlogCount: 5,
    governanceCompliance: 0.95,

    // Additional
    customerSatisfaction: 0.88,
    pendingReleases: 2,
    completedReleases: 15,
    failedReleases: 0,
  };

  // TikTok Shop metrics (preview/staged)
  const tiktokMetrics: Record<string, number> = {
    // Operational (slightly lower due to being newer)
    totalProducts: 8500,
    activeProducts: 6800,
    errorRate: 0.065,
    crawlSuccessRate: 0.91,
    avgResponseTime: 380,
    dataQualityScore: 0.82,

    // Discovery
    discoveredProducts: 1200,
    discoverySuccessRate: 0.82,
    uniqueProductsFound: 1050,

    // Detail
    detailExtractionSuccess: 0.81,
    mediaQualityScore: 0.79,
    attributeCompleteness: 0.78,

    // Enrichment
    enrichmentSuccessRate: 0.72,
    aiProcessingTime: 2200,
    enrichmentQualityScore: 0.68,

    // Commercial (growing but smaller)
    totalRevenue: 28000,
    conversionRate: 0.032,
    avgOrderValue: 28,
    attributedSales: 24000,

    // Growth (faster growth rate)
    newProducts: 380,
    trendingProducts: 85,
    growthRates: 0.28,

    // Governance (lower readiness due to being in preview)
    releaseReadinessScore: 0.58,
    enablementRiskScore: 0.42,
    backlogCount: 12,
    governanceCompliance: 0.72,

    // Additional
    customerSatisfaction: 0.76,
    pendingReleases: 8,
    completedReleases: 6,
    failedReleases: 2,
  };

  return { shopeeMetrics, tiktokMetrics };
}

/**
 * Main execution function
 */
async function main() {
  const args = parseArgs();
  const correlationId = `hardening-${Date.now()}`;

  logger.info('Starting platform parity hardening cycle', { correlationId, args });

  const startTime = Date.now();

  try {
    // Build or fetch metrics
    const { shopeeMetrics, tiktokMetrics } = args.shopeeMetrics && args.tiktokMetrics
      ? { shopeeMetrics: args.shopeeMetrics, tiktokMetrics: args.tiktokMetrics }
      : buildSampleMetrics();

    // Emit started event
    emitHardeningCycleStarted(
      new Date(Date.now() - 24 * 60 * 60 * 1000),
      new Date(),
      correlationId
    );

    if (args.dryRun) {
      logger.info('Dry run mode - would execute with metrics:', { shopeeMetrics, tiktokMetrics });
      console.log('\n=== DRY RUN MODE ===\n');
      console.log('Shopee Metrics:', JSON.stringify(shopeeMetrics, null, 2));
      console.log('\nTikTok Metrics:', JSON.stringify(tiktokMetrics, null, 2));
      return;
    }

    // Run the hardening cycle
    const result = await runPlatformParityHardeningCycle({
      shopeeMetrics,
      tiktokMetrics,
    });

    const duration = Date.now() - startTime;

    // Record success
    recordHardeningCycleRun();

    // Emit completed event
    emitHardeningCycleCompleted(
      duration,
      result.gapsDetected,
      0, // gapsResolved would need separate tracking
      result.backlogCreated,
      correlationId
    );

    // Output results
    console.log('\n=== Platform Parity Hardening Cycle Complete ===\n');
    console.log(`Duration: ${duration}ms`);
    console.log(`Overall Parity Level: ${result.parityModel.overallParityLevel}`);
    console.log(`Snapshots Created: 1`);
    console.log(`Gaps Detected: ${result.gapsDetected}`);
    console.log(`Backlog Items Created: ${result.backlogCreated}`);
    console.log(`Recommendations: ${result.decisionSupport.recommendations.length}`);

    if (args.verbose) {
      console.log('\n=== Risk Summary ===\n');
      console.log(`Critical Gaps: ${result.decisionSupport.riskSummary.criticalGaps}`);
      console.log(`High Gaps: ${result.decisionSupport.riskSummary.highGaps}`);
      console.log(`Medium Gaps: ${result.decisionSupport.riskSummary.mediumGaps}`);
      console.log(`Low Gaps: ${result.decisionSupport.riskSummary.lowGaps}`);

      console.log('\n=== Top Recommendations ===\n');
      result.decisionSupport.recommendations.slice(0, 5).forEach((rec, idx) => {
        console.log(`${idx + 1}. [${rec.priorityScore}] ${rec.title}`);
        console.log(`   ${rec.description}\n`);
      });
    }

    // Output metrics summary
    if (args.verbose) {
      console.log('\n=== Metrics Summary ===\n');
      console.log(JSON.stringify(getMetricsSummary(), null, 2));
    }

    logger.info('Platform parity hardening cycle completed', {
      correlationId,
      duration,
      parityLevel: result.parityModel.overallParityLevel,
      gapsDetected: result.gapsDetected,
    });

    process.exit(0);
  } catch (error) {
    const duration = Date.now() - startTime;

    // Record error
    recordHardeningCycleError();

    // Emit failed event
    emitHardeningCycleFailed(
      String(error),
      duration,
      correlationId
    );

    logger.error('Platform parity hardening cycle failed', {
      correlationId,
      duration,
      error,
    });

    console.error('\n=== Platform Parity Hardening Cycle FAILED ===\n');
    console.error(error);

    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
