/**
 * Publisher Runner CLI Script
 *
 * Run the publisher job runner from command line
 */

import dotenv from 'dotenv';
import { getRuntimeConfig, type RuntimeConfig } from './config.js';

// Load environment
dotenv.config();

interface CliArgs {
  dryRun: boolean;
  channel?: string;
  limit?: number;
  workerId?: string;
  concurrency?: number;
  interval?: number;
  continuous: boolean;
  help: boolean;
}

/**
 * Parse CLI arguments
 */
function parseArgs(): CliArgs {
  const args: CliArgs = {
    dryRun: false,
    continuous: false,
  };

  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '--dry-run':
      case '-d':
        args.dryRun = true;
        break;

      case '--channel':
      case '-c':
        args.channel = argv[++i];
        break;

      case '--limit':
      case '-l':
        args.limit = parseInt(argv[++i], 10);
        break;

      case '--worker-id':
        args.workerId = argv[++i];
        break;

      case '--concurrency':
      case '-C':
        args.concurrency = parseInt(argv[++i], 10);
        break;

      case '--interval':
      case '-i':
        args.interval = parseInt(argv[++i], 10);
        break;

      case '--continuous':
      case '-t':
        args.continuous = true;
        break;

      case '--help':
      case '-h':
        args.help = true;
        break;

      default:
        console.warn(`Unknown option: ${arg}`);
    }
  }

  return args;
}

/**
 * Print usage
 */
function printUsage() {
  console.log(`
Publisher Job Runner CLI

Usage: npx tsx src/scripts/runPublisher.ts [options]

Options:
  --dry-run, -d           Run in dry-run mode (no actual publishing)
  --channel, -c <channel> Run for specific channel (tiktok, facebook, website)
  --limit, -l <num>       Limit number of jobs to process (default: 10)
  --worker-id <id>        Override worker identity
  --concurrency, -C <num>  Number of concurrent jobs (default: 5)
  --interval, -i <ms>     Poll interval in ms for continuous mode (default: 5000)
  --continuous, -t        Run continuously (for long-running workers)
  --help, -h              Show this help message

Examples:
  # Run once for all channels
  npx tsx src/scripts/runPublisher.ts

  # Dry-run
  npx tsx src/scripts/runPublisher.ts --dry-run

  # Run for specific channel
  npx tsx src/scripts/runPublisher.ts --channel tiktok

  # Run continuously
  npx tsx src/scripts/runPublisher.ts --continuous --interval 10000

  # Run with limits
  npx tsx tsx src/scripts/runPublisher.ts --limit 5 --dry-run
`);
}

/**
 * Main function
 */
async function main() {
  const args = parseArgs();

  if (args.help) {
    printUsage();
    process.exit(0);
  }

  console.log('='.repeat(60));
  console.log('Publisher Job Runner');
  console.log('='.repeat(60));

  // Import after dotenv config
  const { runPublisherOnce, runPublisherDryRun, runPublisherForChannel, createWorkerIdentity } = await import('../publishing/runner/index.js');

  // Build options
  const channels = args.channel ? [args.channel as any] : undefined;

  const options = {
    channels,
    dryRun: args.dryRun,
    limit: args.limit ?? 10,
    concurrency: args.concurrency ?? 5,
    workerIdentity: args.workerId ? {
      workerId: args.workerId,
      workerName: 'CLI Runner',
    } : createWorkerIdentity({ workerName: 'CLI Runner' }),
  };

  console.log('\n📋 Configuration:');
  console.log(`   Dry Run: ${options.dryRun ? '✅ Yes' : '❌ No'}`);
  console.log(`   Channels: ${channels?.join(', ') || 'all'}`);
  console.log(`   Limit: ${options.limit}`);
  console.log(`   Concurrency: ${options.concurrency}`);
  console.log(`   Worker: ${options.workerIdentity.workerId}`);
  console.log(`   Continuous: ${args.continuous ? '✅ Yes' : '❌ No'}`);
  console.log();

  try {
    if (args.continuous) {
      // Continuous mode
      console.log('🔄 Starting continuous mode...');
      console.log('   Press Ctrl+C to stop\n');

      let iteration = 0;
      while (true) {
        iteration++;

        console.log(`\n📦 Iteration ${iteration}`);
        console.log('-'.repeat(40));

        const result = args.channel
          ? await runPublisherForChannel(args.channel as any, options)
          : await runPublisherOnce(options);

        console.log('\n📊 Results:');
        console.log(`   Status: ${result.status}`);
        console.log(`   Selected: ${result.selectedCount}`);
        console.log(`   Claimed: ${result.claimedCount}`);
        console.log(`   Executed: ${result.executedCount}`);
        console.log(`   Published: ${result.publishedCount}`);
        console.log(`   Failed: ${result.failedCount}`);
        console.log(`   Retry Scheduled: ${result.retryScheduledCount}`);
        console.log(`   Duration: ${result.durationMs}ms`);

        if (result.errors.length > 0) {
          console.log('\n❌ Errors:');
          result.errors.slice(0, 5).forEach((e: any) => {
            console.log(`   - [${e.code}] ${e.message}`);
          });
        }

        if (result.warnings.length > 0) {
          console.log('\n⚠️ Warnings:');
          result.warnings.slice(0, 3).forEach((w: any) => {
            console.log(`   - [${w.code}] ${w.message}`);
          });
        }

        // Wait before next iteration
        const interval = args.interval ?? 5000;
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    } else {
      // Single run
      console.log('🚀 Starting publisher run...\n');

      const result = args.channel
        ? await runPublisherForChannel(args.channel as any, options)
        : await runPublisherOnce(options);

      console.log('='.repeat(60));
      console.log('📊 Results:');
      console.log('='.repeat(60));
      console.log(`   Status: ${result.status}`);
      console.log(`   Selected: ${result.selectedCount}`);
      console.log(`   Claimed: ${result.claimedCount}`);
      console.log(`   Executed: ${result.executedCount}`);
      console.log(`   Published: ${result.publishedCount}`);
      console.log(`   Failed: ${result.failedCount}`);
      console.log(`   Retry Scheduled: ${result.retryScheduledCount}`);
      console.log(`   Skipped: ${result.skippedCount}`);
      console.log(`   Duration: ${result.durationMs}ms`);

      if (result.errors.length > 0) {
        console.log('\n❌ Errors:');
        result.errors.slice(0, 5).forEach((e: any) => {
          console.log(`   - [${e.code}] ${e.message}`);
          if (e.jobId) console.log(`     Job: ${e.jobId}`);
        });
      }

      if (result.warnings.length > 0) {
        console.log('\n⚠️ Warnings:');
        result.warnings.slice(0, 3).forEach((w: any) => {
          console.log(`   - [${w.code}] ${w.message}`);
        });
      }

      console.log('\n' + '='.repeat(60));

      // Exit with appropriate code
      if (result.status === 'failed') {
        process.exit(1);
      }
    }
  } catch (err) {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  }
}

// Run
main().catch(console.error);

// Helper for config (placeholder)
function getRuntimeConfig(): RuntimeConfig {
  return {
    dryRun: false,
    channel: undefined,
    limit: 10,
    concurrency: 5,
  };
}
