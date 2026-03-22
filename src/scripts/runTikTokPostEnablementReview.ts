#!/usr/bin/env node
/**
 * Run TikTok Shop Post-Enablement Review
 */

import { fileURLToPath } from 'url';
import { runPlatformPostEnablementReviewCycle } from '../platform/rollout/service/platformRolloutOrchestrator.js';

const __filename = fileURLToPath(import.meta.url);

async function main() {
  const platformKey = process.argv[2] || 'tiktok_shop';

  console.log('='.repeat(60));
  console.log('TikTok Shop Post-Enablement Review');
  console.log('='.repeat(60));
  console.log(`Platform: ${platformKey}`);
  console.log('');

  const result = await runPlatformPostEnablementReviewCycle({ platformKey });

  if (result.success) {
    console.log('✅ Review complete');
    console.log(`Health Score: ${result.healthSummary.healthScore ?? 'N/A'}`);
    console.log(`Recommendation: ${result.recommendation}`);

    if (result.healthSummary.issuesDetected.length > 0) {
      console.log('\nIssues Detected:');
      result.healthSummary.issuesDetected.forEach(issue => console.log(`  - ${issue}`));
    }
  } else {
    console.log('❌ Review failed');
    result.errors.forEach(e => console.log(`Error: ${e.code} - ${e.message}`));
    process.exit(1);
  }
}

main().catch(console.error);
