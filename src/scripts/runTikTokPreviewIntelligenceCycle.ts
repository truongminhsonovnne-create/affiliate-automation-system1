/**
 * TikTok Shop Preview Intelligence Cycle CLI Script
 *
 * Runs the preview intelligence cycle to collect and analyze TikTok Shop preview data.
 */

import { runTikTokPreviewIntelligenceCycle } from '../platform/tiktokShop/preview/service/tiktokPreviewIntelligenceService.js';

async function main() {
  const args = process.argv.slice(2);
  const days = parseInt(args[0]) || 7;

  console.log('\n===========================================');
  console.log('TIKTOK SHOP PREVIEW INTELLIGENCE CYCLE');
  console.log('===========================================\n');

  console.log(`Running preview intelligence for last ${days} days...\n`);

  try {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const to = new Date();

    const result = await runTikTokPreviewIntelligenceCycle({ from, to });

    console.log('FUNNEL SUMMARY:');
    console.log(`  Total Sessions: ${result.funnelSummary.totalSessions}`);
    console.log(`  Total Events: ${result.funnelSummary.totalEvents}`);
    console.log(`  Surface Views: ${result.funnelSummary.surfaceViews}`);
    console.log(`  Input Submissions: ${result.funnelSummary.inputSubmissions}`);
    console.log(`  Resolution Attempts: ${result.funnelSummary.resolutionAttempts}`);
    console.log(`  Supported: ${result.funnelSummary.supportedResolutions}`);
    console.log(`  Partial: ${result.funnelSummary.partialResolutions}`);
    console.log(`  Unavailable: ${result.funnelSummary.unavailableResolutions}`);

    console.log('\nQUALITY EVALUATION:');
    console.log(`  Usefulness Score: ${result.usefulnessResult.overallScore}%`);
    console.log(`  Clarity: ${result.usefulnessResult.dimensions.clarity}%`);
    console.log(`  Honest Representation: ${result.usefulnessResult.dimensions.honestRepresentation}%`);
    console.log(`  Outcome Quality: ${result.usefulnessResult.dimensions.outcomeQuality}%`);
    console.log(`  User Actionability: ${result.usefulnessResult.dimensions.userActionability}%`);

    if (result.usefulnessResult.strengths.length > 0) {
      console.log('\n  Strengths:');
      result.usefulnessResult.strengths.forEach(s => console.log(`    ✓ ${s}`));
    }

    if (result.usefulnessResult.weaknesses.length > 0) {
      console.log('\n  Weaknesses:');
      result.usefulnessResult.weaknesses.forEach(w => console.log(`    ✗ ${w}`));
    }

    console.log('\nSTABILITY EVALUATION:');
    console.log(`  Stability Score: ${result.stabilityResult.overallScore}%`);
    console.log(`  Support State Stability: ${result.stabilityResult.supportStateStability}%`);
    console.log(`  Outcome Consistency: ${result.stabilityResult.outcomeConsistency}%`);
    console.log(`  Error Rate: ${result.stabilityResult.errorRate}%`);
    console.log(`  Drift Risk: ${result.stabilityResult.driftRisk}%`);

    if (result.stabilityResult.risks.length > 0) {
      console.log('\n  Risks:');
      result.stabilityResult.risks.forEach(r => console.log(`    ⚠ ${r}`));
    }

    console.log('\n===========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\nERROR:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
