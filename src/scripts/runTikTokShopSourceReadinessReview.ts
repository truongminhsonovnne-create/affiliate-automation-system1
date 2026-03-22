/**
 * TikTok Shop Source Readiness Review CLI Script
 * Reviews source readiness for TikTok Shop data sources
 */

import { evaluateTikTokShopSourceHealth, buildTikTokShopSourceHealthSummary } from '../platform/tiktokShop/data/sourceHealth/tiktokShopSourceHealthService.js';
import { getTikTokShopDataSources } from '../platform/tiktokShop/data/sourceRegistry/tiktokShopSourceRegistry.js';
import { logger } from '../utils/logger.js';

async function main() {
  logger.info({ msg: 'Starting TikTok Shop Source Readiness Review' });

  try {
    // Get all sources
    const sources = await getTikTokShopDataSources();

    console.log('\n===========================================');
    console.log('TIKTOK SHOP SOURCE READINESS REVIEW');
    console.log('===========================================\n');

    console.log(`Total Sources: ${sources.length}\n`);

    // Evaluate health for each source
    const healthSummary = await buildTikTokShopSourceHealthSummary();

    console.log('HEALTH SUMMARY:');
    console.log('--------------');
    console.log(`  Healthy: ${healthSummary.summary.healthy}`);
    console.log(`  Degraded: ${healthSummary.summary.degraded}`);
    console.log(`  Unhealthy: ${healthSummary.summary.unhealthy}`);
    console.log(`  Unknown: ${healthSummary.summary.unknown}`);
    console.log(`  Average Score: ${(healthSummary.summary.averageHealthScore * 100).toFixed(0)}%`);

    console.log('\nSOURCE DETAILS:');
    console.log('---------------');
    for (const result of healthSummary.sources) {
      console.log(`\n  ${result.sourceKey}:`);
      console.log(`    Health Status: ${result.healthStatus}`);
      console.log(`    Health Score: ${(result.healthScore * 100).toFixed(0)}%`);
      console.log(`    Checks:`);
      for (const check of result.checks) {
        const status = check.passed ? '✓' : '✗';
        console.log(`      ${status} ${check.checkName}: ${check.message}`);
      }
    }

    // Get recommendations
    const recommendations = healthSummary.sources.length > 0
      ? healthSummary.sources
          .filter((r) => r.healthStatus !== 'healthy')
          .map((r) => ({
            sourceKey: r.sourceKey,
            status: r.healthStatus,
            message: r.checks.find((c) => !c.passed)?.message || 'Unknown issue',
          }))
      : [];

    if (recommendations.length > 0) {
      console.log('\nRECOMMENDATIONS:');
      console.log('---------------');
      for (const rec of recommendations) {
        console.log(`  ${rec.sourceKey}: ${rec.message}`);
      }
    }

    console.log('\n===========================================\n');

    // Exit with appropriate code
    if (healthSummary.summary.healthy === 0) {
      process.exit(1);
    } else if (healthSummary.summary.averageHealthScore < 0.5) {
      process.exit(2);
    }

    process.exit(0);
  } catch (error) {
    logger.error({ msg: 'Failed to run TikTok Shop Source Readiness Review', error });
    console.error('\nERROR:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
