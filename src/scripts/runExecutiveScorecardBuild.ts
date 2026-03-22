/**
 * Run Executive Scorecard Build Script
 */

import { parseISO, subDays } from 'date-fns';
import { buildExecutiveScorecardPack } from '../bi/service/businessIntelligenceService.js';
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

  logger.info({ msg: 'Building executive scorecards', startDate: startDate.toISOString(), endDate: endDate.toISOString() });

  const result = await buildExecutiveScorecardPack({ startDate, endDate });

  if (result.success && result.data) {
    logger.info({ msg: 'Scorecards built', count: result.data.length });
    console.log(`\n=== Executive Scorecards ===`);
    for (const sc of result.data) {
      console.log(`\n${sc.type.toUpperCase()}:`);
      console.log(`  Score: ${sc.headline.score.toFixed(2)} (${sc.headline.status})`);
      console.log(`  Trend: ${sc.headline.trend}`);
      console.log(`  Risks: ${sc.risks.length}`);
    }
  } else {
    logger.error({ msg: 'Failed to build scorecards', error: result.error });
    process.exit(1);
  }
}

main();
