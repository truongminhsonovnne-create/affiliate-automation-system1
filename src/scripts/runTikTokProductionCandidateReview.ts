#!/usr/bin/env node
/**
 * Run TikTok Shop Production Candidate Review
 *
 * CLI script to run production candidate review for TikTok Shop.
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runPlatformProductionCandidateReview } from '../platform/enablement/service/platformEnablementService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const platformKey = process.argv[2] || 'tiktok_shop';

  console.log('='.repeat(60));
  console.log('TikTok Shop Production Candidate Review');
  console.log('='.repeat(60));
  console.log(`Platform: ${platformKey}`);
  console.log('');

  try {
    const result = await runPlatformProductionCandidateReview({
      platformKey,
      createdBy: 'cli',
    });

    if (result.success) {
      console.log('✅ Review completed successfully');
      console.log('');
      console.log(`Status: ${result.candidateStatus}`);
      console.log(`Overall Score: ${result.readinessScore.overall ?? 'N/A'}%`);
      console.log(`Blockers: ${result.blockerCount}`);
      console.log(`Warnings: ${result.warningCount}`);
      console.log(`Conditions: ${result.conditionCount}`);
      console.log('');

      // Print key blockers
      if (result.reviewPack.blockers.length > 0) {
        console.log('Key Blockers:');
        result.reviewPack.blockers.slice(0, 5).forEach((b, i) => {
          console.log(`  ${i + 1}. [${b.severity.toUpperCase()}] ${b.title}`);
          console.log(`     ${b.description}`);
        });
        console.log('');
      }

      // Print next steps
      if (result.reviewPack.nextSteps.length > 0) {
        console.log('Next Steps:');
        result.reviewPack.nextSteps.forEach((step, i) => {
          console.log(`  ${i + 1}. ${step}`);
        });
      }
    } else {
      console.log('❌ Review failed');
      console.log('');
      result.errors.forEach(e => {
        console.log(`Error: ${e.code} - ${e.message}`);
      });
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
