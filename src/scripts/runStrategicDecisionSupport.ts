/**
 * Run Strategic Decision Support Script
 */

import { parseISO, subDays } from 'date-fns';
import { buildStrategicDecisionSupportPack } from '../bi/service/businessIntelligenceService.js';
import { logger } from '../utils/logger.js';

async function main() {
  const args = process.argv.slice(2);
  let startDate = subDays(new Date(), 7);
  let endDate = new Date();

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--start-date' && args[i + 1]) {
      startDate = parseISO(args[i + 1]);
      i++;
    } else if (args[i] === '--end-date' && args[i + 1]) {
      endDate = parseISO(args[i + 1]);
      i++;
    }
  }

  logger.info({ msg: 'Building strategic decision support', startDate: startDate.toISOString(), endDate: endDate.toISOString() });

  const result = await buildStrategicDecisionSupportPack({ startDate, endDate });

  if (result.success && result.data) {
    logger.info({ msg: 'Decision support built', count: result.data.length });
    console.log(`\n=== Strategic Decisions ===`);
    for (const rec of result.data) {
      console.log(`\n${rec.area}:`);
      console.log(`  Recommendation: ${rec.recommendation} (${rec.priority})`);
      console.log(`  Confidence: ${(rec.confidence * 100).toFixed(0)}%`);
      console.log(`  Evidence: ${rec.evidence.length} items`);
    }
  } else {
    logger.error({ msg: 'Failed to build decision support', error: result.error });
    process.exit(1);
  }
}

main();
