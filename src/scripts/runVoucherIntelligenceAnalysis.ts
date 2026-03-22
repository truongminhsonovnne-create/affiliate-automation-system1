/**
 * Voucher Intelligence Analysis Script
 *
 * CLI script to run voucher intelligence analysis
 */

import { runVoucherIntelligenceAnalysis } from '../voucherIntelligence/service/voucherIntelligenceService.js';
import { INTELLIGENCE_WINDOWS } from '../voucherIntelligence/constants/index.js';

// ============================================================================
// Types
// ============================================================================

interface CliOptions {
  hours?: number;
  days?: number;
  platform?: string;
  minSampleSize?: number;
  maxInsights?: number;
  verbose?: boolean;
}

// ============================================================================
// Parse Arguments
// ============================================================================

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--hours':
      case '-h':
        options.hours = parseInt(args[++i], 10);
        break;
      case '--days':
      case '-d':
        options.days = parseInt(args[++i], 10);
        break;
      case '--platform':
      case '-p':
        options.platform = args[++i];
        break;
      case '--min-sample':
        options.minSampleSize = parseInt(args[++i], 10);
        break;
      case '--max-insights':
        options.maxInsights = parseInt(args[++i], 10);
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Voucher Intelligence Analysis

Usage: npm run voucher:intelligence:analyze [options]

Options:
  --hours, -h <n>       Analysis window in hours (default: 24)
  --days, -d <n>        Analysis window in days
  --platform, -p <name> Platform to analyze (shopee, tiktok, lazada)
  --min-sample <n>      Minimum sample size (default: 30)
  --max-insights <n>    Maximum insights to generate (default: 50)
  --verbose, -v         Verbose output
  --help               Show this help message

Examples:
  npm run voucher:intelligence:analyze -- --hours 24
  npm run voucher:intelligence:analyze -- --days 7 --platform shopee
  `);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const options = parseArgs();

  // Calculate time window
  const now = new Date();
  let start: Date;

  if (options.days) {
    start = new Date(now.getTime() - options.days * 24 * 60 * 60 * 1000);
  } else if (options.hours) {
    start = new Date(now.getTime() - options.hours * 60 * 60 * 1000);
  } else {
    start = new Date(now.getTime() - INTELLIGENCE_WINDOWS.SHORT_HOURS * 60 * 60 * 1000);
  }

  console.log('========================================');
  console.log('Voucher Intelligence Analysis');
  console.log('========================================');
  console.log(`Time window: ${start.toISOString()} to ${now.toISOString()}`);
  if (options.platform) {
    console.log(`Platform: ${options.platform}`);
  }
  console.log('');

  try {
    const result = await runVoucherIntelligenceAnalysis({
      timeWindow: { start, end: now },
      platform: options.platform as any,
      minSampleSize: options.minSampleSize || 30,
      maxInsights: options.maxInsights || 50,
    });

    if (!result.success) {
      console.log('❌ Analysis failed');
      if (result.errors) {
        console.log('Errors:', result.errors);
      }
      process.exit(1);
    }

    // Print summary
    console.log('📊 Summary');
    console.log('─'.repeat(40));
    console.log(`Total Resolutions: ${result.summary.totalResolutions}`);
    console.log(`Total Signals: ${result.summary.totalSignals}`);
    console.log(`Copy Success Rate: ${(result.summary.copySuccessRate * 100).toFixed(1)}%`);
    console.log(`Open Shopee Rate: ${(result.summary.openShopeeClickRate * 100).toFixed(1)}%`);
    console.log(`Best Selection Rate: ${(result.summary.bestVoucherSelectionRate * 100).toFixed(1)}%`);
    console.log(`No-Match Rate: ${(result.summary.noMatchRate * 100).toFixed(1)}%`);
    console.log(`Insights Generated: ${result.summary.insightsGenerated}`);
    console.log('');

    // Print top insights
    if (result.insights.length > 0) {
      console.log('🔍 Top Insights');
      console.log('─'.repeat(40));

      for (let i = 0; i < Math.min(10, result.insights.length); i++) {
        const insight = result.insights[i];
        const severity = getSeverityEmoji(insight.severity);
        console.log(`${severity} [${insight.severity.toUpperCase()}] ${insight.insightType}`);
      }
      console.log('');
    }

    // Print ranking advice
    if (result.rankingAdvice) {
      console.log('⚙️  Ranking Advice');
      console.log('─'.repeat(40));
      console.log(result.rankingAdvice.summary);
      console.log('');
    }

    console.log('✅ Analysis complete');

  } catch (error) {
    console.error('❌ Analysis error:', error);
    process.exit(1);
  }
}

function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'critical':
      return '🔴';
    case 'high':
      return '🟠';
    case 'medium':
      return '🟡';
    case 'low':
      return '🟢';
    default:
      return '⚪';
  }
}

// Run
main().catch(console.error);
