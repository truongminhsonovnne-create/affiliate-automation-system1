/**
 * Run Release Readiness Review CLI Script
 *
 * Executes a release readiness review for a given release key.
 */

import * as governanceService from '../productGovernance/service/productGovernanceService';

interface CLIOptions {
  releaseKey: string;
  environment: string;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  let releaseKey = '';
  let environment = 'production';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--release-key' && args[i + 1]) {
      releaseKey = args[i + 1];
      i++;
    } else if (args[i] === '--environment' && args[i + 1]) {
      environment = args[i + 1];
      i++;
    }
  }

  if (!releaseKey) {
    console.error('Error: --release-key is required');
    process.exit(1);
  }

  return { releaseKey, environment };
}

async function main() {
  const options = parseArgs();

  console.log('='.repeat(60));
  console.log('Release Readiness Review');
  console.log('='.repeat(60));
  console.log(`Release Key: ${options.releaseKey}`);
  console.log(`Environment: ${options.environment}`);
  console.log('');

  try {
    console.log('Running release readiness review...');

    const result = await governanceService.runReleaseReadinessReview({
      releaseKey: options.releaseKey,
      environment: options.environment,
    });

    console.log('');
    console.log('Review Results:');
    console.log('-'.repeat(40));
    console.log(`Status: ${result.review.status}`);
    console.log(`Readiness Score: ${result.review.readinessScore ?? 'N/A'}`);
    console.log(`Blocking Issues: ${result.review.blockingIssuesCount}`);
    console.log(`Warning Issues: ${result.review.warningIssuesCount}`);
    console.log(`Signals Evaluated: ${result.signals.length}`);
    console.log('');

    // Print decision support
    console.log('Decision Support:');
    console.log('-'.repeat(40));
    console.log(`Can Approve: ${result.reviewPack.decisionSupport.canApprove}`);
    console.log(`Can Conditional Approve: ${result.reviewPack.decisionSupport.canConditionalApprove}`);
    console.log(`Can Block: ${result.reviewPack.decisionSupport.canBlock}`);
    console.log('');

    if (result.reviewPack.decisionSupport.recommendedActions.length > 0) {
      console.log('Recommended Actions:');
      result.reviewPack.decisionSupport.recommendedActions.forEach((action, i) => {
        console.log(`  ${i + 1}. ${action.action} (Priority: ${action.priority})`);
        console.log(`     Rationale: ${action.rationale}`);
      });
    }

    console.log('');
    console.log('✓ Review completed successfully');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('✗ Review failed:', error);
    process.exit(1);
  }
}

main();
