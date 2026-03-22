/**
 * TikTok Shop Commercial Readiness Review CLI Script
 *
 * Runs commercial readiness review for TikTok Shop preview.
 */

import { runTikTokCommercialReadinessReview } from '../platform/tiktokShop/preview/service/tiktokPreviewIntelligenceService.js';

async function main() {
  console.log('\n===========================================');
  console.log('TIKTOK SHOP COMMERCIAL READINESS REVIEW');
  console.log('===========================================\n');

  try {
    const result = await runTikTokCommercialReadinessReview();

    console.log('COMMERCIAL READINESS:');
    console.log(`  Overall Score: ${result.commercialReadinessResult.overallScore}%`);
    console.log(`  Status: ${result.commercialReadinessResult.status}`);

    console.log('\n  Dimensions:');
    console.log(`    Support State Stability: ${result.commercialReadinessResult.dimensions.supportStateStability}%`);
    console.log(`    Preview Usefulness: ${result.commercialReadinessResult.dimensions.previewUsefulness}%`);
    console.log(`    Click Lineage: ${result.commercialReadinessResult.dimensions.clickLineageCompleteness}%`);
    console.log(`    Product Context: ${result.commercialReadinessResult.dimensions.productContextCompleteness}%`);
    console.log(`    Governance: ${result.commercialReadinessResult.dimensions.governanceReadiness}%`);
    console.log(`    Operator: ${result.commercialReadinessResult.dimensions.operatorReadiness}%`);
    console.log(`    BI Integration: ${result.commercialReadinessResult.dimensions.biIntegrationReadiness}%`);

    console.log('\nGUARDRAILS:');
    console.log(`  Decision: ${result.guardrailResult.decision}`);
    console.log(`  Score: ${result.guardrailResult.overallScore}%`);

    if (result.guardrailResult.blockers.length > 0) {
      console.log('\n  BLOCKERS:');
      result.guardrailResult.blockers.forEach(b => console.log(`    ✗ [${b.severity}] ${b.message}`));
    }

    if (result.guardrailResult.warnings.length > 0) {
      console.log('\n  WARNINGS:');
      result.guardrailResult.warnings.forEach(w => console.log(`    ⚠ [${w.severity}] ${w.message}`));
    }

    console.log('\nGOVERNANCE:');
    console.log(`  Current Stage: ${result.governanceSummary.currentStage}`);
    console.log(`  Risk Level: ${result.governanceSummary.riskLevel}`);
    console.log(`  Open Blockers: ${result.governanceSummary.openBlockers.length}`);

    console.log('\n===========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\nERROR:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
