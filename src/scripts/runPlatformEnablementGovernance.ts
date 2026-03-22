/**
 * Platform Enablement Governance Review CLI Script
 *
 * Manages platform enablement reviews and phase transitions.
 */

import { platformEnablementGovernanceService } from '../platform/shared/resolution/service/platformEnablementGovernanceService.js';
import { ENABLEMENT_PHASES } from '../platform/shared/resolution/constants.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('\n===========================================');
  console.log('PLATFORM ENABLEMENT GOVERNANCE');
  console.log('===========================================\n');

  try {
    switch (command) {
      case 'review': {
        const platform = args[1];
        const targetPhase = args[2] as keyof typeof ENABLEMENT_PHASES;
        const requestedBy = args[3] || 'system';

        if (!platform || !targetPhase) {
          console.log('Usage: npm run governance:review -- <platform> <targetPhase> [requestedBy]');
          console.log('Example: npm run governance:review -- tiktok_shop sandbox_preview admin@example.com');
          console.log('\nAvailable phases: disabled, internal_only, sandbox_preview, limited_public_preview, production_candidate, production_enabled');
          process.exit(1);
        }

        console.log(`Requesting enablement review for ${platform} -> ${targetPhase}\n`);

        const review = await platformEnablementGovernanceService.requestEnablementReview(
          platform,
          targetPhase,
          requestedBy
        );

        console.log('REVIEW CREATED:');
        console.log(`  Review ID: ${review.reviewId}`);
        console.log(`  Platform: ${review.platform}`);
        console.log(`  Current Phase: ${review.currentPhase}`);
        console.log(`  Target Phase: ${review.targetPhase}`);
        console.log(`  Readiness Score: ${review.readinessScore}%`);
        console.log(`  Decision: ${review.decision}`);

        if (review.blockers && review.blockers.length > 0) {
          console.log('\nBLOCKERS:');
          for (const blocker of review.blockers) {
            console.log(`  - [${blocker.severity}] ${blocker.title}: ${blocker.description}`);
          }
        }

        if (review.risks && review.risks.length > 0) {
          console.log('\nRISKS:');
          for (const risk of review.risks) {
            console.log(`  - [${risk.likelihood}/${risk.impact}] ${risk.title}`);
          }
        }

        console.log('\n===========================================\n');
        break;
      }

      case 'approve': {
        const reviewId = args[1];
        const approvedBy = args[2];

        if (!reviewId || !approvedBy) {
          console.log('Usage: npm run governance:approve -- <reviewId> <approvedBy>');
          console.log('Example: npm run governance:approve -- abc-123 admin@example.com');
          process.exit(1);
        }

        console.log(`Approving review ${reviewId}\n`);

        const review = await platformEnablementGovernanceService.approveReview(
          reviewId,
          approvedBy
        );

        if (!review) {
          console.log('Review not found');
          process.exit(1);
        }

        console.log('REVIEW APPROVED:');
        console.log(`  Review ID: ${review.reviewId}`);
        console.log(`  Platform: ${review.platform}`);
        console.log(`  Phase: ${review.currentPhase} -> ${review.targetPhase}`);
        console.log(`  Effective From: ${review.effectiveFrom}`);

        console.log('\n===========================================\n');
        break;
      }

      case 'reject': {
        const reviewId = args[1];
        const rejectedBy = args[2];
        const reason = args.slice(3).join(' ');

        if (!reviewId || !rejectedBy || !reason) {
          console.log('Usage: npm run governance:reject -- <reviewId> <rejectedBy> <reason>');
          console.log('Example: npm run governance:reject -- abc-123 admin@example.com "Not ready for production"');
          process.exit(1);
        }

        console.log(`Rejecting review ${reviewId}\n`);

        const review = await platformEnablementGovernanceService.rejectReview(
          reviewId,
          rejectedBy,
          reason
        );

        if (!review) {
          console.log('Review not found');
          process.exit(1);
        }

        console.log('REVIEW REJECTED:');
        console.log(`  Review ID: ${review.reviewId}`);
        console.log(`  Platform: ${review.platform}`);
        console.log(`  Reason: ${reason}`);

        console.log('\n===========================================\n');
        break;
      }

      case 'pending': {
        const platform = args[1];

        console.log('PENDING REVIEWS:\n');

        const reviews = await platformEnablementGovernanceService.getPendingReviews(platform);

        if (reviews.length === 0) {
          console.log('No pending reviews');
        } else {
          for (const review of reviews) {
            console.log(`- ${review.reviewId}: ${review.platform} ${review.currentPhase} -> ${review.targetPhase}`);
            console.log(`  Score: ${review.readinessScore}%, Requested: ${review.reviewRequestedAt}`);
          }
        }

        console.log('\n===========================================\n');
        break;
      }

      case 'readiness': {
        const platform = args[1];

        if (!platform) {
          console.log('Usage: npm run governance:readiness -- <platform>');
          console.log('Example: npm run governance:readiness -- tiktok_shop');
          process.exit(1);
        }

        console.log(`Running readiness checks for ${platform}\n`);

        const checks = await platformEnablementGovernanceService.runReadinessChecks(platform);

        const passed = checks.filter(c => c.status === 'pass').length;
        const warnings = checks.filter(c => c.status === 'warning').length;
        const failed = checks.filter(c => c.status === 'fail').length;
        const score = Math.round(checks.reduce((sum, c) => sum + c.score, 0) / checks.length);

        console.log(`SUMMARY: ${passed} passed, ${warnings} warnings, ${failed} failed (Score: ${score}%)\n`);
        console.log('CHECKS:');

        for (const check of checks) {
          const icon = check.status === 'pass' ? '✓' : check.status === 'warning' ? '⚠' : '✗';
          console.log(`  ${icon} [${check.category}] ${check.checkName}: ${check.score}%`);
          console.log(`      ${check.details}`);
        }

        console.log('\n===========================================\n');
        break;
      }

      default:
        console.log('Commands:');
        console.log('  review <platform> <targetPhase> [requestedBy]  - Request enablement review');
        console.log('  approve <reviewId> <approvedBy>                 - Approve review');
        console.log('  reject <reviewId> <rejectedBy> <reason>        - Reject review');
        console.log('  pending [platform]                             - List pending reviews');
        console.log('  readiness <platform>                           - Run readiness checks');
        console.log('\nAvailable phases: disabled, internal_only, sandbox_preview, limited_public_preview, production_candidate, production_enabled');
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
