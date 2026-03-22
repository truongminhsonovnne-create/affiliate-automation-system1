/**
 * BI Events
 */

import { logger } from '../../utils/logger.js';

export const biEvents = {
  scorecardBuildStart: (types: string[]) => logger.info({ type: 'bi_event', event: 'scorecard.build.start', types }),
  scorecardBuildComplete: (types: string[], count: number) => logger.info({ type: 'bi_event', event: 'scorecard.build.complete', types, count }),
  decisionSupportStart: () => logger.info({ type: 'bi_event', event: 'decision_support.start' }),
  decisionSupportComplete: (count: number) => logger.info({ type: 'bi_event', event: 'decision_support.complete', count }),
  alertingCycleStart: () => logger.info({ type: 'bi_event', event: 'alerting.cycle.start' }),
  alertingCycleComplete: (count: number) => logger.info({ type: 'bi_event', event: 'alerting.cycle.complete', count }),
};
