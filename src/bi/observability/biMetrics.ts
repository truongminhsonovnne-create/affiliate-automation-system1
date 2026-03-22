/**
 * BI Metrics
 */

import { logger } from '../../utils/logger.js';

export const biMetrics = {
  scorecardGenerated: (type: string) => logger.info({ type: 'metric', name: 'bi.scorecard.generated', scorecardType: type }),
  decisionGenerated: (area: string) => logger.info({ type: 'metric', name: 'bi.decision.generated', decisionArea: area }),
  alertGenerated: (type: string, severity: string) => logger.info({ type: 'metric', name: 'bi.alert.generated', alertType: type, severity }),
  staleScorecard: (type: string, hoursStale: number) => logger.warn({ type: 'metric', name: 'bi.scorecard.stale', scorecardType: type, hoursStale }),
};
