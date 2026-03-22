/**
 * Platform Gate Evaluation CLI Script
 *
 * Evaluates platform resolution gates and outputs support state.
 */

import { platformGateEvaluationService } from '../platform/shared/resolution/service/platformGateEvaluationService.js';
import { PLATFORMS } from '../platform/shared/resolution/constants.js';
import { SUPPORT_STATE_LEVELS, ENABLEMENT_PHASE_LEVELS } from '../platform/shared/resolution/constants.js';

async function main() {
  console.log('\n===========================================');
  console.log('PLATFORM GATE EVALUATION');
  console.log('===========================================\n');

  const args = process.argv.slice(2);
  const platform = args[0];

  try {
    if (platform) {
      // Evaluate specific platform
      console.log(`Evaluating platform: ${platform}\n`);
      const evaluation = await platformGateEvaluationService.evaluatePlatformGates(platform);

      console.log('SUPPORT STATE:');
      console.log(`  State: ${evaluation.supportState}`);
      console.log(`  Phase: ${evaluation.enablementPhase}`);
      console.log(`  Quality Score: ${evaluation.qualityScore}%`);

      console.log('\nREADINESS:');
      console.log(`  Domain: ${evaluation.domainReady ? '✓' : '✗'}`);
      console.log(`  Data Foundation: ${evaluation.dataFoundationReady ? '✓' : '✗'}`);
      console.log(`  Acquisition: ${evaluation.acquisitionReady ? '✓' : '✗'}`);
      console.log(`  Resolution: ${evaluation.resolutionReady ? '✓' : '✗'}`);
      console.log(`  Governance: ${evaluation.governanceApproved ? '✓' : '✗'}`);

      console.log('\nDECISION:');
      console.log(`  Can Resolve: ${evaluation.canResolve}`);
      console.log(`  Can Use Sandbox: ${evaluation.canUseSandbox}`);
      console.log(`  Can Use Production: ${evaluation.canUseProduction}`);
      console.log(`  Should Block: ${evaluation.shouldBlock}`);

      console.log('\n===========================================\n');
    } else {
      // Evaluate all platforms
      console.log('Evaluating all platforms...\n');
      const evaluations = await platformGateEvaluationService.evaluateAllPlatforms();

      // Sort by state level
      const sorted = Object.entries(evaluations).sort(
        ([, a], [, b]) => SUPPORT_STATE_LEVELS[b.supportState] - SUPPORT_STATE_LEVELS[a.supportState]
      );

      console.log('PLATFORM SUPPORT STATES:');
      console.log('-'.repeat(80));

      for (const [plat, eval_] of sorted) {
        const stateLevel = SUPPORT_STATE_LEVELS[eval_.supportState] || 0;
        const phaseLevel = ENABLEMENT_PHASE_LEVELS[eval_.enablementPhase] || 0;
        const stateIcon = eval_.canResolve ? '✓' : '✗';

        console.log(`${stateIcon} ${plat.padEnd(15)} ${eval_.supportState.padEnd(20)} ${eval_.enablementPhase.padEnd(25)} Score: ${eval_.qualityScore}%`);
      }

      console.log('-'.repeat(80));

      // Summary
      const supported = Object.values(evaluations).filter(e => e.canUseProduction).length;
      const sandbox = Object.values(evaluations).filter(e => e.canUseSandbox && !e.canUseProduction).length;
      const blocked = Object.values(evaluations).filter(e => !e.canResolve).length;

      console.log(`\nSummary: ${supported} production, ${sandbox} sandbox, ${blocked} blocked`);
      console.log('===========================================\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('\nERROR:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
