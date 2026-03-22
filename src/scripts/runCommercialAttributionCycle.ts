/**
 * Run Commercial Attribution Cycle Script
 *
 * CLI script to run the commercial attribution cycle.
 */

import { parseISO, subDays } from 'date-fns';
import { runCommercialAttributionCycle } from '../commercialIntelligence/service/commercialIntelligenceService.js';
import { logger } from '../utils/logger.js';

interface RunOptions {
  startDate?: string;
  endDate?: string;
  days?: number;
}

async function main() {
  const args = process.argv.slice(2);
  const options: RunOptions = {};

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--start-date' && args[i + 1]) {
      options.startDate = args[i + 1];
      i++;
    } else if (args[i] === '--end-date' && args[i + 1]) {
      options.endDate = args[i + 1];
      i++;
    } else if (args[i] === '--days' && args[i + 1]) {
      options.days = parseInt(args[i + 1], 10);
      i++;
    }
  }

  // Calculate dates
  let startDate: Date;
  let endDate: Date;

  if (options.startDate && options.endDate) {
    startDate = parseISO(options.startDate);
    endDate = parseISO(options.endDate);
  } else if (options.days) {
    endDate = new Date();
    startDate = subDays(endDate, options.days);
  } else {
    // Default: last 7 days
    endDate = new Date();
    startDate = subDays(endDate, 7);
  }

  logger.info({
    msg: 'Starting commercial attribution cycle',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  try {
    const result = await runCommercialAttributionCycle({
      startDate,
      endDate,
    });

    if (result.success && result.data) {
      logger.info({
        msg: 'Commercial attribution cycle completed',
        attributed: result.data.attributed,
        conversionsProcessed: result.data.conversionsProcessed,
        errors: result.data.errors,
      });

      console.log('\n=== Attribution Cycle Results ===');
      console.log(`Attributed: ${result.data.attributed ? 'Yes' : 'No'}`);
      console.log(`Conversions Processed: ${result.data.conversionsProcessed}`);
      console.log(`Errors: ${result.data.errors.length}`);
      if (result.data.errors.length > 0) {
        console.log('\nErrors:');
        result.data.errors.forEach(e => console.log(`  - ${e}`));
      }
    } else {
      logger.error({
        msg: 'Commercial attribution cycle failed',
        error: result.error,
      });
      process.exit(1);
    }
  } catch (err) {
    logger.error({
      msg: 'Error running commercial attribution cycle',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    process.exit(1);
  }
}

main();
