/**
 * Run Commercial Governance Review Script
 *
 * CLI script to run commercial governance review.
 */

import { parseISO, subDays } from 'date-fns';
import { runCommercialGovernanceCycle } from '../commercialIntelligence/service/commercialIntelligenceService.js';
import { logger } from '../utils/logger.js';

interface RunOptions {
  reviewType?: string;
  targetEntityType?: string;
  targetEntityId?: string;
  businessSummary?: string;
  startDate?: string;
  endDate?: string;
}

async function main() {
  const args = process.argv.slice(2);
  const options: RunOptions = {};

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--review-type' && args[i + 1]) {
      options.reviewType = args[i + 1];
      i++;
    } else if (args[i] === '--target-entity-type' && args[i + 1]) {
      options.targetEntityType = args[i + 1];
      i++;
    } else if (args[i] === '--target-entity-id' && args[i + 1]) {
      options.targetEntityId = args[i + 1];
      i++;
    } else if (args[i] === '--business-summary' && args[i + 1]) {
      options.businessSummary = args[i + 1];
      i++;
    } else if (args[i] === '--start-date' && args[i + 1]) {
      options.startDate = args[i + 1];
      i++;
    } else if (args[i] === '--end-date' && args[i + 1]) {
      options.endDate = args[i + 1];
      i++;
    }
  }

  // Default to revenue_quality_balance review for the past 7 days
  const reviewType = options.reviewType || 'revenue_quality_balance';
  const startDate = options.startDate ? parseISO(options.startDate) : subDays(new Date(), 7);
  const endDate = options.endDate ? parseISO(options.endDate) : new Date();

  logger.info({
    msg: 'Starting commercial governance review',
    reviewType,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  try {
    const result = await runCommercialGovernanceCycle({
      reviewType: reviewType as any,
      targetEntityType: options.targetEntityType,
      targetEntityId: options.targetEntityId,
      businessSummary: options.businessSummary ? JSON.parse(options.businessSummary) : {
        period: { start: startDate.toISOString(), end: endDate.toISOString() },
        revenue: 0,
        conversions: 0,
      },
      createdBy: 'system',
    });

    if (result.success && result.data) {
      logger.info({
        msg: 'Governance review completed',
        reviewId: result.data.id,
        status: result.data.revernStatus,
      });

      console.log('\n=== Governance Review Results ===');
      console.log(`Review ID: ${result.data.id}`);
      console.log(`Type: ${result.data.reviewType}`);
      console.log(`Status: ${result.data.reviewStatus}`);
      console.log(`Created At: ${result.data.createdAt.toISOString()}`);

      if (result.data.governancePayload) {
        const payload = result.data.governancePayload as any;
        if (payload.decisionSupport) {
          console.log(`\nDecision: ${payload.decisionSupport.recommendation}`);
          console.log(`Confidence: ${payload.decisionSupport.confidence}`);
          console.log(`Rationale: ${payload.decisionSupport.decisionRationale}`);
        }
      }
    } else {
      logger.error({
        msg: 'Governance review failed',
        error: result.error,
      });
      process.exit(1);
    }
  } catch (err) {
    logger.error({
      msg: 'Error running governance review',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    process.exit(1);
  }
}

main();
