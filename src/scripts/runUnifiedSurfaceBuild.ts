/**
 * Run Unified Surface Build
 * CLI script to build unified ops/BI/governance surfaces
 */

import { getLogger } from '../utils/logger.js';
import {
  buildUnifiedOpsSurfacePack,
  buildUnifiedBiSurfacePack,
  buildUnifiedGovernanceSurfacePack,
} from '../platformParity/service/platformParityHardeningService.js';
import {
  recordSurfaceBuilt,
  getMetricsSummary,
} from '../platformParity/observability/platformParityMetrics.js';

const logger = getLogger('run-unified-surface-build');

interface CliArgs {
  surfaceType?: 'ops' | 'bi' | 'governance' | 'all';
  verbose?: boolean;
  output?: 'json' | 'text';
}

/**
 * Parse command line arguments
 */
function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    surfaceType: 'all',
    output: 'text',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--ops') {
      result.surfaceType = 'ops';
    } else if (arg === '--bi') {
      result.surfaceType = 'bi';
    } else if (arg === '--governance') {
      result.surfaceType = 'governance';
    } else if (arg === '--all') {
      result.surfaceType = 'all';
    } else if (arg === '--json') {
      result.output = 'json';
    } else if (arg === '--verbose' || arg === '-v') {
      result.verbose = true;
    }
  }

  return result;
}

/**
 * Build sample metrics
 */
function buildSampleMetrics() {
  return {
    shopeeMetrics: {
      totalProducts: 15000,
      activeProducts: 12500,
      errorRate: 0.03,
      crawlSuccessRate: 0.97,
      totalRevenue: 125000,
      conversionRate: 0.045,
      growthRates: 0.12,
      releaseReadinessScore: 0.92,
      enablementRiskScore: 0.08,
      backlogCount: 5,
      governanceCompliance: 0.95,
    },
    tiktokMetrics: {
      totalProducts: 8500,
      activeProducts: 6800,
      errorRate: 0.065,
      crawlSuccessRate: 0.91,
      totalRevenue: 28000,
      conversionRate: 0.032,
      growthRates: 0.28,
      releaseReadinessScore: 0.58,
      enablementRiskScore: 0.42,
      backlogCount: 12,
      governanceCompliance: 0.72,
    },
  };
}

/**
 * Main execution function
 */
async function main() {
  const args = parseArgs();

  logger.info('Starting unified surface build', { args });

  const startTime = Date.now();

  try {
    const { shopeeMetrics, tiktokMetrics } = buildSampleMetrics();
    const input = { shopeeMetrics, tiktokMetrics };

    const results: Record<string, unknown> = {};

    // Build requested surfaces
    if (args.surfaceType === 'ops' || args.surfaceType === 'all') {
      logger.info('Building unified ops surfaces');
      results.ops = await buildUnifiedOpsSurfacePack(input);
      recordSurfaceBuilt();
    }

    if (args.surfaceType === 'bi' || args.surfaceType === 'all') {
      logger.info('Building unified BI surfaces');
      results.bi = await buildUnifiedBiSurfacePack(input);
      recordSurfaceBuilt();
    }

    if (args.surfaceType === 'governance' || args.surfaceType === 'all') {
      logger.info('Building unified governance surfaces');
      results.governance = await buildUnifiedGovernanceSurfacePack(input);
      recordSurfaceBuilt();
    }

    const duration = Date.now() - startTime;

    // Output results
    if (args.output === 'json') {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log('\n=== Unified Surface Build Complete ===\n');
      console.log(`Duration: ${duration}ms\n`);

      if (results.ops) {
        console.log('=== OPS Surfaces ===\n');
        console.log(`Overview Health: ${(results.ops as any).overview.healthStatus}`);
        console.log(`Product Ops Health: ${(results.ops as any).productOps.healthStatus}`);
        console.log(`Commercial Ops Health: ${(results.ops as any).commercialOps.healthStatus}`);
        console.log(`Growth Ops Health: ${(results.ops as any).growthOps.healthStatus}`);
        console.log(`Release Ops Health: ${(results.ops as any).releaseOps.healthStatus}\n`);
      }

      if (results.bi) {
        console.log('=== BI Surfaces ===\n');
        console.log(`Executive Surface: ${(results.bi as any).executive.surfaceKey}`);
        console.log(`Operator Surface: ${(results.bi as any).operator.surfaceKey}`);
        console.log(`Founder Surface: ${(results.bi as any).founder.surfaceKey}\n`);
      }

      if (results.governance) {
        console.log('=== Governance Surfaces ===\n');
        console.log(`Governance Surface: ${(results.governance as any).governance.surfaceKey}`);
        console.log(`Governance Status: ${(results.governance as any).governance.governanceMetrics.governanceStatus}`);
      }
    }

    if (args.verbose) {
      console.log('\n=== Metrics Summary ===\n');
      console.log(JSON.stringify(getMetricsSummary(), null, 2));
    }

    logger.info('Unified surface build completed', { duration, surfaceType: args.surfaceType });

    process.exit(0);
  } catch (error) {
    logger.error('Unified surface build failed', { error });

    console.error('\n=== Unified Surface Build FAILED ===\n');
    console.error(error);

    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
