/**
 * Run Experiment Analysis Script
 */

import { getActiveExperiments } from '../experimentation/registry/experimentRegistry.js';
import { analyzeExperimentPerformance } from '../experimentation/analysis/experimentAnalysisService.js';

async function main() {
  console.log('Running experiment analysis...\n');

  const experiments = await getActiveExperiments();

  if (experiments.length === 0) {
    console.log('No active experiments found.');
    return;
  }

  for (const exp of experiments) {
    console.log(`Analyzing: ${exp.experimentName} (${exp.experimentKey})`);

    const result = await analyzeExperimentPerformance(exp);

    console.log(`  Exposures: ${result.summary.totalExposures}`);
    console.log(`  Conversions: ${result.summary.totalConversions}`);
    console.log(`  Rate: ${(result.summary.conversionRate * 100).toFixed(2)}%`);
    console.log('');
  }
}

main().catch(console.error);
