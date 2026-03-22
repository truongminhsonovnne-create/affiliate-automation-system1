// =============================================================================
// Run Voucher Matching Evaluation
// CLI script for running voucher matching evaluation pack
// =============================================================================

import { evaluateVoucherResolutionAgainstExpectation } from '../voucherData/evaluation/voucherMatchingEvaluator.js';
import { buildRankingQualitySummary } from '../voucherData/evaluation/voucherRankingQualityService.js';
import { buildVoucherQualityFeedbackReport } from '../voucherData/evaluation/voucherQualityFeedbackLoop.js';
import { voucherMatchEvaluationRepository } from '../voucherData/repositories/voucherMatchEvaluationRepository.js';
import { logger } from '../utils/logger.js';

interface EvaluationOptions {
  platform?: string;
  limit?: number;
  sampleSize?: number;
}

async function main() {
  const args = process.argv.slice(2);
  const options: EvaluationOptions = {};

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--platform':
      case '-p':
        options.platform = args[++i];
        break;
      case '--limit':
      case '-l':
        options.limit = parseInt(args[++i], 10);
        break;
      case '--sample-size':
        options.sampleSize = parseInt(args[++i], 10);
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  try {
    console.log('=== Voucher Matching Evaluation ===\n');

    // Fetch recent evaluations
    const evaluations = await voucherMatchEvaluationRepository.findAll({
      platform: options.platform as 'shopee' | 'lazada' | 'tiktok' | 'general' | undefined,
      limit: options.limit || 100,
      offset: 0,
    });

    console.log(`Found ${evaluations.evaluations.length} evaluations`);

    if (evaluations.evaluations.length === 0) {
      console.log('\nNo evaluations found. Run some matching operations first.');
      process.exit(0);
    }

    // Build quality summary
    const summary = buildRankingQualitySummary(evaluations.evaluations, {
      minSampleSize: options.sampleSize || 10,
    });

    // Print summary
    console.log('\n=== Quality Summary ===');
    console.log(`Total Evaluations: ${summary.summary.totalEvaluations}`);
    console.log(`Average Quality Score: ${(summary.summary.averageQualityScore * 100).toFixed(1)}%`);
    console.log(`Average Top-K Recall: ${(summary.summary.averageTopKRecall * 100).toFixed(1)}%`);
    console.log(`Average Top-K Precision: ${(summary.summary.averageTopKPrecision * 100).toFixed(1)}%`);
    console.log(`Ranking Consistency: ${(summary.summary.rankingConsistency * 100).toFixed(1)}%`);

    // Print weaknesses
    if (summary.weaknesses.length > 0) {
      console.log('\n=== Weaknesses Detected ===');
      for (const weakness of summary.weaknesses) {
        console.log(`\n[${weakness.category}]`);
        console.log(`  Description: ${weakness.description}`);
        console.log(`  Affected: ${weakness.affectedCount} evaluations`);
        console.log(`  Recommendation: ${weakness.recommendation}`);
      }
    }

    // Print common issues
    if (summary.summary.commonIssues.length > 0) {
      console.log('\n=== Common Issues ===');
      for (const issue of summary.summary.commonIssues) {
        console.log(`\n[${issue.issueType}] Severity: ${issue.severity}`);
        console.log(`  Frequency: ${(issue.frequency * 100).toFixed(1)}%`);
        console.log(`  ${issue.description}`);
      }
    }

    // Print recommendation
    console.log('\n=== Recommendation ===');
    console.log(summary.recommendation);

    // Build feedback report
    const report = buildVoucherQualityFeedbackReport(evaluations.evaluations, {
      minSampleSize: options.sampleSize || 10,
    });

    if (report.recommendations.length > 0) {
      console.log('\n=== Feedback Recommendations ===');
      for (const rec of report.recommendations) {
        console.log(`  - ${rec}`);
      }
    }

    // Status based on quality
    console.log('\n=== Status ===');
    if (summary.summary.averageQualityScore >= 0.9) {
      console.log('Status: EXCELLENT');
    } else if (summary.summary.averageQualityScore >= 0.75) {
      console.log('Status: GOOD');
    } else if (summary.summary.averageQualityScore >= 0.6) {
      console.log('Status: ACCEPTABLE');
    } else if (summary.summary.averageQualityScore >= 0.4) {
      console.log('Status: NEEDS_IMPROVEMENT');
    } else {
      console.log('Status: POOR');
    }

    console.log('');
  } catch (error) {
    logger.error({ error }, 'Evaluation failed');
    console.error('\nEvaluation failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
Voucher Matching Evaluation Script

Usage:
  npm run voucher:evaluate [options]

Options:
  -p, --platform <name>    Filter by platform (shopee, lazada, tiktok, general)
  -l, --limit <number>     Limit number of evaluations to fetch (default: 100)
  --sample-size <number>   Minimum sample size for analysis (default: 10)
  -h, --help               Show this help message

Examples:
  npm run voucher:evaluate
  npm run voucher:evaluate -- --platform shopee
  npm run voucher:evaluate -- --limit 50 --sample-size 20
  `);
}

main();
