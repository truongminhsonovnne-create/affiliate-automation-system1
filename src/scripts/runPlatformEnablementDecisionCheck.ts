#!/usr/bin/env node
/**
 * Run Platform Enablement Decision Check
 *
 * CLI script to check enablement decision for a platform.
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildPlatformEnablementDecisionSupport } from '../platform/enablement/service/platformEnablementService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const platformKey = process.argv[2] || 'tiktok_shop';

  console.log('='.repeat(60));
  console.log('Platform Enablement Decision Check');
  console.log('='.repeat(60));
  console.log(`Platform: ${platformKey}`);
  console.log('');

  try {
    const decisionSupport = await buildPlatformEnablementDecisionSupport(platformKey);

    console.log('Decision Support:');
    console.log('');
    console.log(`Recommendation: ${decisionSupport.recommendation}`);
    console.log(`Summary: ${decisionSupport.summary}`);
    console.log(`Confidence: ${(decisionSupport.confidence * 100).toFixed(0)}%`);
    console.log('');

    if (decisionSupport.blockersSummary.length > 0) {
      console.log('Blockers:');
      decisionSupport.blockersSummary.forEach(b => console.log(`  - ${b}`));
      console.log('');
    }

    if (decisionSupport.warningsSummary.length > 0) {
      console.log('Warnings:');
      decisionSupport.warningsSummary.forEach(w => console.log(`  - ${w}`));
      console.log('');
    }

    if (decisionSupport.nextSteps.length > 0) {
      console.log('Next Steps:');
      decisionSupport.nextSteps.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
