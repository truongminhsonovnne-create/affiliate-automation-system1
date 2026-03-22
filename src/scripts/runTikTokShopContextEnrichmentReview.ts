/**
 * TikTok Shop Context Enrichment Review CLI Script
 * Reviews context enrichment readiness for TikTok Shop
 */

import { buildTikTokShopContextSupportMatrix, buildTikTokShopDataCoverageSummary } from '../platform/tiktokShop/data/readiness/tiktokShopContextSupportMatrix.js';
import { runTikTokShopContextEnrichmentReview } from '../platform/tiktokShop/data/service/tiktokShopDataFoundationService.js';
import { logger } from '../utils/logger.js';

async function main() {
  logger.info({ msg: 'Starting TikTok Shop Context Enrichment Review' });

  try {
    console.log('\n===========================================');
    console.log('TIKTOK SHOP CONTEXT ENRICHMENT REVIEW');
    console.log('===========================================\n');

    // Build context support matrix
    const matrix = await buildTikTokShopContextSupportMatrix();

    // Product context
    console.log('PRODUCT CONTEXT:');
    console.log('----------------');
    for (const [field, support] of Object.entries(matrix.product)) {
      const status = support.supported ? '✓' : '✗';
      const score = support.qualityScore ? ` (${(support.qualityScore * 100).toFixed(0)}%)` : '';
      console.log(`  ${status} ${field}${score}`);
      if (support.gaps.length > 0) {
        console.log(`      Gaps: ${support.gaps.join(', ')}`);
      }
    }

    // Seller context
    console.log('\nSELLER CONTEXT:');
    console.log('---------------');
    for (const [field, support] of Object.entries(matrix.seller)) {
      const status = support.supported ? '✓' : '✗';
      const score = support.qualityScore ? ` (${(support.qualityScore * 100).toFixed(0)}%)` : '';
      console.log(`  ${status} ${field}${score}`);
      if (support.gaps.length > 0) {
        console.log(`      Gaps: ${support.gaps.join(', ')}`);
      }
    }

    // Category context
    console.log('\nCATEGORY CONTEXT:');
    console.log('-----------------');
    for (const [field, support] of Object.entries(matrix.category)) {
      const status = support.supported ? '✓' : '✗';
      const score = support.qualityScore ? ` (${(support.qualityScore * 100).toFixed(0)}%)` : '';
      console.log(`  ${status} ${field}${score}`);
      if (support.gaps.length > 0) {
        console.log(`      Gaps: ${support.gaps.join(', ')}`);
      }
    }

    // Price context
    console.log('\nPRICE CONTEXT:');
    console.log('--------------');
    for (const [field, support] of Object.entries(matrix.price)) {
      const status = support.supported ? '✓' : '✗';
      const score = support.qualityScore ? ` (${(support.qualityScore * 100).toFixed(0)}%)` : '';
      console.log(`  ${status} ${field}${score}`);
      if (support.gaps.length > 0) {
        console.log(`      Gaps: ${support.gaps.join(', ')}`);
      }
    }

    // Coverage summary
    const coverage = buildTikTokShopDataCoverageSummary(matrix);

    console.log('\nCOVERAGE SUMMARY:');
    console.log('-----------------');
    console.log(`  Total Fields: ${coverage.totalFields}`);
    console.log(`  Supported: ${coverage.supportedFields} (${coverage.coveragePercentage.toFixed(0)}%)`);
    console.log(`  Unsupported: ${coverage.unsupportedFields}`);

    console.log('\n  By Category:');
    for (const [category, stats] of Object.entries(coverage.byCategory)) {
      console.log(`    ${category}: ${stats.supported}/${stats.total} (${stats.percentage.toFixed(0)}%)`);
    }

    // Run enrichment review
    const enrichmentResult = await runTikTokShopContextEnrichmentReview();

    console.log('\nENRICHMENT QUALITY:');
    console.log('-------------------');
    console.log(`  Quality Score: ${(enrichmentResult.summary.averageQualityScore * 100).toFixed(0)}%`);
    console.log(`  Enriched Records: ${enrichmentResult.summary.enrichedRecords}/${enrichmentResult.summary.totalRecords}`);

    if (enrichmentResult.warnings.length > 0) {
      console.log('\n  Gaps Detected:');
      for (const warning of enrichmentResult.warnings.slice(0, 5)) {
        console.log(`    - ${warning.message}`);
      }
      if (enrichmentResult.warnings.length > 5) {
        console.log(`    ... and ${enrichmentResult.warnings.length - 5} more`);
      }
    }

    console.log('\n===========================================\n');

    // Determine exit code based on coverage
    if (coverage.coveragePercentage < 30) {
      console.log('Context enrichment coverage is below 30% - significant work needed');
      process.exit(1);
    } else if (coverage.coveragePercentage < 50) {
      console.log('Context enrichment coverage is below 50% - more work needed');
      process.exit(2);
    }

    process.exit(0);
  } catch (error) {
    logger.error({ msg: 'Failed to run TikTok Shop Context Enrichment Review', error });
    console.error('\nERROR:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
