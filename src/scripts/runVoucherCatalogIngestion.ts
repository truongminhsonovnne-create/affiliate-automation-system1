// =============================================================================
// Run Voucher Catalog Ingestion
// CLI script for running voucher catalog ingestion
// =============================================================================

import { runVoucherCatalogIngestion, runAllActiveVoucherSourceIngestions } from '../voucherData/catalog/voucherIngestionService.js';
import { voucherCatalogSourceRepository } from '../voucherData/repositories/voucherCatalogSourceRepository.js';
import { logger } from '../utils/logger.js';

interface IngestionOptions {
  sourceId?: string;
  all?: boolean;
  since?: string;
  limit?: number;
  triggeredBy?: string;
}

async function main() {
  const args = process.argv.slice(2);
  const options: IngestionOptions = {};

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--source-id':
      case '-s':
        options.sourceId = args[++i];
        break;
      case '--all':
      case '-a':
        options.all = true;
        break;
      case '--since':
        options.since = args[++i];
        break;
      case '--limit':
      case '-l':
        options.limit = parseInt(args[++i], 10);
        break;
      case '--triggered-by':
        options.triggeredBy = args[++i];
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  try {
    if (options.all) {
      // Run ingestion for all active sources
      logger.info({}, 'Running ingestion for all active sources');

      const result = await runAllActiveVoucherSourceIngestions({
        since: options.since ? new Date(options.since) : undefined,
        limit: options.limit,
        triggeredBy: options.triggeredBy || 'cli',
      });

      logger.info(
        {
          totalSources: result.summary.totalSources,
          successfulSources: result.summary.successfulSources,
          failedSources: result.summary.failedSources,
          totalItemsProcessed: result.summary.totalItemsProcessed,
        },
        'Ingestion summary'
      );

      // Print results for each source
      for (const res of result.results) {
        console.log(`\nSource: ${res.runId}`);
        console.log(`  Success: ${res.success}`);
        console.log(`  Items Seen: ${res.itemsSeen}`);
        console.log(`  Items Inserted: ${res.itemsInserted}`);
        console.log(`  Items Updated: ${res.itemsUpdated}`);
        console.log(`  Items Failed: ${res.itemsFailed}`);
        console.log(`  Duration: ${res.duration}ms`);
      }
    } else if (options.sourceId) {
      // Run ingestion for specific source
      logger.info({ sourceId: options.sourceId }, 'Running ingestion for specific source');

      const result = await runVoucherCatalogIngestion(options.sourceId, {
        since: options.since ? new Date(options.since) : undefined,
        limit: options.limit,
        triggeredBy: options.triggeredBy || 'cli',
      });

      console.log('\n=== Ingestion Result ===');
      console.log(`Success: ${result.success}`);
      console.log(`Run ID: ${result.runId}`);
      console.log(`Items Seen: ${result.itemsSeen}`);
      console.log(`Items Inserted: ${result.itemsInserted}`);
      console.log(`Items Updated: ${result.itemsUpdated}`);
      console.log(`Items Skipped: ${result.itemsSkipped}`);
      console.log(`Items Failed: ${result.itemsFailed}`);
      console.log(`Duration: ${result.duration}ms`);

      if (result.errors.length > 0) {
        console.log('\nErrors:');
        for (const error of result.errors.slice(0, 10)) {
          console.log(`  [${error.itemIndex}] ${error.errorCode}: ${error.errorMessage}`);
        }
      }

      if (result.warnings.length > 0) {
        console.log('\nWarnings:');
        for (const warning of result.warnings.slice(0, 10)) {
          console.log(`  [${warning.itemIndex}] ${warning.warningCode}: ${warning.warningMessage}`);
        }
      }
    } else {
      // No source specified, list available sources
      console.log('No source specified. Available sources:\n');
      const sources = await voucherCatalogSourceRepository.findAll();

      for (const source of sources.sources) {
        console.log(`  ${source.id} - ${source.sourceName} (${source.sourceType}) [${source.isActive ? 'active' : 'inactive'}]`);
      }

      console.log('\nUse --source-id <id> or --all to run ingestion');
      console.log('Run with --help for usage information');
    }
  } catch (error) {
    logger.error({ error }, 'Ingestion failed');
    console.error('\nIngestion failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
Voucher Catalog Ingestion Script

Usage:
  npm run voucher:ingest [options]

Options:
  -s, --source-id <id>    Run ingestion for specific source
  -a, --all               Run ingestion for all active sources
  --since <date>          Only ingest items since this date (ISO format)
  -l, --limit <number>    Limit number of items to ingest
  --triggered-by <name>   Who/what triggered this ingestion
  -h, --help              Show this help message

Examples:
  npm run voucher:ingest -- --all
  npm run voucher:ingest -- --source-id <uuid>
  npm run voucher:ingest -- --all --limit 100
  `);
}

main();
