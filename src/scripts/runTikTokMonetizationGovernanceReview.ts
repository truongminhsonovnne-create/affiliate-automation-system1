/**
 * TikTok Shop Monetization Governance Review CLI Script
 *
 * Runs monetization governance review for TikTok Shop.
 */

import { runTikTokPreviewGovernanceReview } from '../platform/tiktokShop/preview/governance/tiktokPreviewGovernanceService.js';
import { getCurrentMonetizationStage } from '../platform/tiktokShop/preview/governance/tiktokMonetizationEnablementService.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('\n===========================================');
  console.log('TIKTOK SHOP MONETIZATION GOVERNANCE');
  console.log('===========================================\n');

  try {
    switch (command) {
      case 'status': {
        const stage = await getCurrentMonetizationStage();
        const review = await runTikTokPreviewGovernanceReview();

        console.log('CURRENT STATUS:');
        console.log(`  Monetization Stage: ${stage}`);
        console.log(`  Risk Level: ${review.riskLevel}`);

        console.log('\n  Recent Actions:');
        review.recentActions.slice(0, 5).forEach(action => {
          console.log(`    - ${action.actionType} (${action.actionStatus})`);
        });

        console.log('\n  Pending Actions:');
        if (review.pendingActions.length === 0) {
          console.log('    None');
        } else {
          review.pendingActions.forEach(action => {
            console.log(`    - ${action.actionType}`);
          });
        }

        console.log('\n  Open Blockers:');
        if (review.openBlockers.length === 0) {
          console.log('    None');
        } else {
          review.openBlockers.forEach(item => {
            console.log(`    - [${item.priority}] ${item.backlogType}`);
          });
        }

        console.log('\n===========================================\n');
        break;
      }

      case 'hold': {
        const reason = args.slice(1).join(' ') || 'Manual hold';
        const { holdTikTokMonetizationStage } = await import('../platform/tiktokShop/preview/governance/tiktokMonetizationEnablementService.js');

        const action = await holdTikTokMonetizationStage(reason, 'cli');
        console.log('Monetization held:');
        console.log(`  Action ID: ${action.id}`);
        console.log(`  Reason: ${reason}`);
        console.log('\n===========================================\n');
        break;
      }

      case 'approve': {
        const stage = args[1] as any;
        const { approveTikTokMonetizationStage } = await import('../platform/tiktokShop/preview/governance/tiktokMonetizationEnablementService.js');

        const action = await approveTikTokMonetizationStage(stage, 'cli', 'Approved via CLI');
        console.log('Monetization stage approved:');
        console.log(`  Action ID: ${action.id}`);
        console.log(`  Stage: ${stage}`);
        console.log('\n===========================================\n');
        break;
      }

      case 'rollback': {
        const { rollbackTikTokMonetizationStage } = await import('../platform/tiktokShop/preview/governance/tiktokMonetizationEnablementService.js');
        const reason = args.slice(1).join(' ') || 'Manual rollback';

        const action = await rollbackTikTokMonetizationStage('disabled', reason, 'cli');
        console.log('Monetization rolled back:');
        console.log(`  Action ID: ${action.id}`);
        console.log(`  Reason: ${reason}`);
        console.log('\n===========================================\n');
        break;
      }

      default:
        console.log('Commands:');
        console.log('  status              - Show current governance status');
        console.log('  hold <reason>      - Hold monetization');
        console.log('  approve <stage>    - Approve monetization stage');
        console.log('  rollback <reason>  - Rollback monetization');
        console.log('\nAvailable stages: internal_validation_only, preview_signal_collection, limited_monetization_preview, production_candidate, production_enabled');
        console.log('===========================================\n');
        process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('\nERROR:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
