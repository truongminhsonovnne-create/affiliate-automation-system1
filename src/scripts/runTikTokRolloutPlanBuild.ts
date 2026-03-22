#!/usr/bin/env node
/**
 * Run TikTok Shop Rollout Plan Build
 */

import { fileURLToPath } from 'url';
import { runPlatformRolloutPlanningCycle } from '../platform/rollout/service/platformRolloutOrchestrator.js';

const __filename = fileURLToPath(import.meta.url);

async function main() {
  const platformKey = process.argv[2] || 'tiktok_shop';
  const targetStage = process.argv[3] || 'full_production';

  console.log('='.repeat(60));
  console.log('TikTok Shop Rollout Plan Builder');
  console.log('='.repeat(60));
  console.log(`Platform: ${platformKey}`);
  console.log(`Target: ${targetStage}`);
  console.log('');

  const result = await runPlatformRolloutPlanningCycle({
    platformKey,
    targetStage,
    createdBy: 'cli',
  });

  if (result.success) {
    console.log('✅ Rollout plan created');
    console.log(`Plan Key: ${result.plan?.rolloutKey}`);
  } else {
    console.log('❌ Failed to create plan');
    result.errors.forEach(e => console.log(`Error: ${e.code} - ${e.message}`));
    process.exit(1);
  }
}

main().catch(console.error);
