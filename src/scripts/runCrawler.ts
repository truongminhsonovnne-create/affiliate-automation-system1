/**
 * CLI Crawler Script
 *
 * Run pipeline from command line:
 *   npm run crawl -- --mode=flash-sale
 *   npm run crawl -- --mode=search --keyword="tai nghe bluetooth"
 */

import { getEnv, env } from '../config/env.js';
import { log } from '../utils/logger.js';
import { setupBrowserCleanup, closeBrowser } from '../crawler/browser.js';
import {
  runFlashSalePipeline,
  runSearchPipeline,
} from '../orchestrator/runPipeline.js';

// ============================================
// Types
// ============================================

interface CliArgs {
  mode: 'flash-sale' | 'search';
  keyword?: string;
  maxProducts?: number;
  maxScrolls?: number;
  verbose?: boolean;
}

// ============================================
// CLI Parser
// ============================================

/**
 * Simple CLI argument parser
 */
function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    mode: 'flash-sale',
    maxProducts: 30,
    maxScrolls: 15,
    verbose: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // --mode=<value> or --mode <value>
    if (arg.startsWith('--mode=')) {
      const value = arg.replace('--mode=', '');
      if (value === 'flash-sale' || value === 'search') {
        result.mode = value;
      } else {
        throw new Error(`Invalid mode: ${value}. Use "flash-sale" or "search"`);
      }
    } else if (arg === '--mode' && args[i + 1]) {
      const value = args[++i];
      if (value === 'flash-sale' || value === 'search') {
        result.mode = value;
      } else {
        throw new Error(`Invalid mode: ${value}. Use "flash-sale" or "search"`);
      }
    }

    // --keyword=<value> or --keyword <value>
    else if (arg.startsWith('--keyword=')) {
      result.keyword = arg.replace('--keyword=', '');
    } else if (arg === '--keyword' && args[i + 1]) {
      result.keyword = args[++i];
    }

    // --max-products=<value>
    else if (arg.startsWith('--max-products=')) {
      const value = parseInt(arg.replace('--max-products=', ''), 10);
      if (!isNaN(value) && value > 0) {
        result.maxProducts = value;
      }
    }

    // --max-scrolls=<value>
    else if (arg.startsWith('--max-scrolls=')) {
      const value = parseInt(arg.replace('--max-scrolls=', ''), 10);
      if (!isNaN(value) && value > 0) {
        result.maxScrolls = value;
      }
    }

    // --verbose
    else if (arg === '--verbose') {
      result.verbose = true;
    }

    // --help
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    // Unknown argument
    else if (arg.startsWith('--')) {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return result;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Affiliate Automation Crawler CLI

Usage:
  npm run crawl -- [options]

Options:
  --mode=<mode>           Run mode: "flash-sale" or "search" (default: flash-sale)
  --keyword=<keyword>    Search keyword (required for search mode)
  --max-products=<n>     Maximum products to crawl (default: 30)
  --max-scrolls=<n>     Maximum scroll actions (default: 15)
  --verbose             Enable verbose logging
  --help, -h            Show this help message

Examples:
  # Crawl Flash Sale
  npm run crawl -- --mode=flash-sale

  # Search for products
  npm run crawl -- --mode=search --keyword="tai nghe bluetooth"

  # Search with custom limits
  npm run crawl -- --mode=search --keyword="laptop" --max-products=50 --max-scrolls=20
  `.trim());
}

// ============================================
// Validation
// ============================================

/**
 * Validate CLI arguments
 */
function validateArgs(args: CliArgs): void {
  // Validate mode
  if (args.mode !== 'flash-sale' && args.mode !== 'search') {
    throw new Error('Mode must be "flash-sale" or "search"');
  }

  // Search mode requires keyword
  if (args.mode === 'search' && !args.keyword) {
    throw new Error('--keyword is required for search mode');
  }

  // Validate max products
  if (args.maxProducts && args.maxProducts < 1) {
    throw new Error('--max-products must be greater than 0');
  }

  // Validate max scrolls
  if (args.maxScrolls && args.maxScrolls < 1) {
    throw new Error('--max-scrolls must be greater than 0');
  }
}

// ============================================
// Main
// ============================================

async function main() {
  // Setup cleanup handlers
  setupBrowserCleanup();

  console.log('\n' + '='.repeat(50));
  console.log('  Affiliate Automation Crawler');
  console.log('='.repeat(50) + '\n');

  let args: CliArgs;

  try {
    // Parse arguments
    args = parseArgs();
    validateArgs(args);
  } catch (error) {
    console.error('\n❌ Error:', (error as Error).message);
    console.log('\nRun with --help for usage information.\n');
    process.exit(1);
  }

  // Load environment (will throw if invalid)
  try {
    getEnv();
  } catch (error) {
    console.error('\n❌ Environment validation failed:');
    console.error((error as Error).message);
    console.log('\nPlease check your .env file.\n');
    process.exit(1);
  }

  // Display config
  console.log('📋 Configuration:');
  console.log(`   Mode:        ${args.mode}`);
  if (args.keyword) {
    console.log(`   Keyword:     ${args.keyword}`);
  }
  console.log(`   Max Products: ${args.maxProducts}`);
  console.log(`   Max Scrolls:  ${args.maxScrolls}`);
  console.log('');

  const config = {
    maxProducts: args.maxProducts,
    maxScrolls: args.maxScrolls,
    verbose: args.verbose,
  };

  try {
    let result;

    if (args.mode === 'flash-sale') {
      console.log('🚀 Starting Flash Sale crawl...\n');
      result = await runFlashSalePipeline(config);
    } else {
      console.log(`🚀 Starting search crawl for: "${args.keyword}"...\n`);
      result = await runSearchPipeline(args.keyword!, config);
    }

    // Display results
    console.log('\n' + '='.repeat(50));
    console.log('  Results');
    console.log('='.repeat(50));
    console.log(`   Status:      ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`   Crawled:     ${result.crawled}`);
    console.log(`   Normalized:  ${result.normalized}`);
    console.log(`   AI Processed: ${result.aiProcessed}`);
    console.log(`   Saved:       ${result.saved}`);
    console.log(`   Duration:    ${(result.duration / 1000).toFixed(2)}s`);
    console.log('');

    if (result.errors.length > 0) {
      console.log('   Errors:');
      result.errors.forEach((err) => console.log(`     - ${err}`));
      console.log('');
    }

    if (!result.success) {
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Pipeline execution failed:');
    console.error(error instanceof Error ? error.stack : error);
    process.exit(1);
  }

  // Cleanup
  await closeBrowser();
  console.log('👋 Done!\n');
  process.exit(0);
}

// Run
main();
