/**
 * Run Continuous Improvement Cycle CLI Script
 *
 * Executes a continuous improvement cycle and generates a report.
 */

import * as ciService from '../productGovernance/continuousImprovement/continuousImprovementService';

function parseArgs(): { periodDays: number } {
  const args = process.argv.slice(2);
  let periodDays = 30;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--period-days' && args[i + 1]) {
      periodDays = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return { periodDays };
}

async function main() {
  const { periodDays } = parseArgs();

  console.log('='.repeat(60));
  console.log('Continuous Improvement Cycle');
  console.log('='.repeat(60));
  console.log(`Period: Last ${periodDays} days`);
  console.log('');

  try {
    console.log('Building improvement report...');

    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    const report = await ciService.buildContinuousImprovementReport({
      periodStart,
      periodEnd,
    });

    console.log('');
    console.log('Quality Trends:');
    console.log('-'.repeat(40));
    console.log(`Resolution Rate: ${report.qualityTrends.resolutionRate}%`);
    console.log(`Avg Resolution Time: ${report.qualityTrends.averageResolutionTime} days`);
    console.log(`Recurring Issues: ${report.qualityTrends.recurringIssueCount}`);
    console.log('');

    console.log('Improvement Backlog:');
    console.log('-'.repeat(40));
    console.log(`Total Open: ${report.improvementBacklog.totalOpen}`);
    console.log(`Overdue: ${report.improvementBacklog.overdueCount}`);
    console.log('');

    console.log('Governance Effectiveness:');
    console.log('-'.repeat(40));
    console.log(`Decisions Made: ${report.governanceEffectiveness.decisionsMade}`);
    console.log(`Follow-up Completion: ${report.governanceEffectiveness.followupCompletionRate}%`);
    console.log('');

    if (report.unresolvedHotspots.length > 0) {
      console.log('Unresolved Hotspots:');
      console.log('-'.repeat(40));
      report.unresolvedHotspots.slice(0, 5).forEach((hotspot, i) => {
        console.log(`  ${i + 1}. [${hotspot.severity}] ${hotspot.title} - ${hotspot.daysOpen} days open`);
      });
    }

    console.log('');
    console.log('✓ Improvement cycle completed successfully');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('✗ Improvement cycle failed:', error);
    process.exit(1);
  }
}

main();
