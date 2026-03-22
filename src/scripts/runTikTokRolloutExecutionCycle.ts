#!/usr/bin/env node
/**
 * Run TikTok Shop Rollout Execution Cycle
 */

import { fileURLToPath } from 'url';
import { runPlatformRolloutExecutionCycle } from '../platform/rollout/service/platformRolloutOrchestrator.js';

const __filename = fileURLToPath(import.meta.url);

async function main() {
  const platformKey = process.argv[2] || 'tiktok_shop';
  const stageKey = process.argv[3] || 'internal_only';

  console.log('='.repeat(60));
  console.log('TikTok Shop Rollout Execution');
  console.log('='.repeat(60));
  console.log(`Platform: ${platformKey}`);
  console.log(`Stage: ${stageKey}`);
  console.log('');

  const result = await runPlatformRolloutExecutionCycle({ platformKey, stageKey });

  if (result.success) {
    console.log('✅ Execution cycle complete');
    console.log(`Decision: ${result.decision.recommendation}`);
    console.log(`Summary: ${result.decision.summary}`);
    console.log(`Score: ${result.decision.confidence}`);
  } else {
    console.log('❌ Execution failed');
    result.errors.forEach(e => console.log(`Error: ${e.code} - ${e.message}`));
    process.exit(1);
  }
}

main().catch(console.error);
