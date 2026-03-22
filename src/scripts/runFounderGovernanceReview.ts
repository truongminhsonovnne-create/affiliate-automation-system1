/**
 * Run Founder Governance Review
 *
 * CLI script to execute governance review for founder cockpit including:
 * - Risk assessment
 * - Follow-up backlog analysis
 * - Decision queue review
 */

import { detectStaleFounderFollowups, getFounderFollowupBacklog } from '../founderCockpit/followups/followupBacklogService.js';
import { getDecisionQueueRepository } from '../founderCockpit/repositories/decisionQueueRepository.js';
import { logger } from '../utils/logger.js';

async function main(): Promise<void> {
  logger.info({ msg: 'Starting Founder Governance Review' });

  try {
    // Check stale follow-ups
    const staleFollowups = await detectStaleFounderFollowups(7);
    logger.info({ msg: 'Stale follow-ups found', count: staleFollowups.length });

    // Check pending decisions
    const pendingDecisions = await getDecisionQueueRepository().findByFilters('pending', undefined, 50);
    logger.info({ msg: 'Pending decisions', count: pendingDecisions.length });

    // Get all pending follow-ups
    const pendingFollowups = await getFounderFollowupBacklog('pending');
    logger.info({ msg: 'Pending follow-ups', count: pendingFollowups.length });

    // Summary
    const healthReport = {
      timestamp: new Date().toISOString(),
      staleFollowupsCount: staleFollowups.length,
      pendingDecisionsCount: pendingDecisions.length,
      pendingFollowupsCount: pendingFollowups.length,
      riskLevel:
        staleFollowups.length > 5 || pendingDecisions.length > 10
          ? 'high'
          : staleFollowups.length > 2 || pendingDecisions.length > 5
            ? 'medium'
            : 'low',
    };

    console.log('\n=== Founder Governance Review ===');
    console.log(`Timestamp: ${healthReport.timestamp}`);
    console.log(`Stale Follow-ups: ${healthReport.staleFollowupsCount}`);
    console.log(`Pending Decisions: ${healthReport.pendingDecisionsCount}`);
    console.log(`Pending Follow-ups: ${healthReport.pendingFollowupsCount}`);
    console.log(`Risk Level: ${healthReport.riskLevel}`);

    if (staleFollowups.length > 0) {
      console.log('\nStale Follow-ups:');
      staleFollowups.slice(0, 5).forEach(f => {
        console.log(`  - ${f.id}: ${f.sourceType} (${f.status})`);
      });
    }

    if (pendingDecisions.length > 0) {
      console.log('\nTop Priority Decisions:');
      pendingDecisions.slice(0, 5).forEach(d => {
        console.log(`  - [${d.priority}] ${d.title}`);
      });
    }

    process.exit(0);
  } catch (error) {
    logger.error({ msg: 'Founder Governance Review Failed', error });
    console.error('\n!!! Governance Review Failed !!!');
    console.error(error);
    process.exit(1);
  }
}

main();
