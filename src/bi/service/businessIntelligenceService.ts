/**
 * Business Intelligence Service
 */

import type { ExecutiveScorecard, StrategicDecisionRecommendation, BiAlertSignal } from '../types.js';
import { buildExecutiveScorecards } from '../scorecards/executiveScorecardBuilder.js';
import { buildOperatorBiView, type OperatorBiSurfaceType } from '../operator/operatorBiViewBuilder.js';
import { buildStrategicDecisionSupport } from '../decisionSupport/strategicDecisionSupportService.js';
import { detectBiAlerts } from '../alerts/biAlertService.js';
import { aggregateBiInsights } from '../insights/insightAggregationService.js';
import { getScorecardSnapshotRepository } from '../repositories/scorecardSnapshotRepository.js';
import { logger } from '../../utils/logger.js';

/**
 * Build executive scorecard pack
 */
export async function buildExecutiveScorecardPack(params: {
  startDate: Date;
  endDate: Date;
  types?: string[];
}) {
  const result = await buildExecutiveScorecards({
    startDate: params.startDate,
    endDate: params.endDate,
    types: params.types as any,
  });

  if (result.success && result.data) {
    // Persist snapshots
    const repo = getScorecardSnapshotRepository();
    for (const scorecard of result.data) {
      try {
        await repo.create({
          snapshotWindowStart: scorecard.period.start,
          snapshotWindowEnd: scorecard.period.end,
          scorecardType: scorecard.type,
          scorecardKey: scorecard.key,
          scorecardPayload: scorecard as any,
        });
      } catch (e) {
        logger.warn({ msg: 'Failed to persist scorecard', error: e });
      }
    }
  }

  return result;
}

/**
 * Build operator BI surface
 */
export async function buildOperatorBiSurface(surface: OperatorBiSurfaceType, filters: any) {
  return buildOperatorBiView(surface, filters);
}

/**
 * Build strategic decision support pack
 */
export async function buildStrategicDecisionSupportPack(params: {
  startDate: Date;
  endDate: Date;
  areas?: string[];
}) {
  return buildStrategicDecisionSupport({
    startDate: params.startDate,
    endDate: params.endDate,
    areas: params.areas as any,
  });
}

/**
 * Run BI alerting cycle
 */
export async function runBiAlertingCycle() {
  const metrics = { no_match_rate: 0.25, quality_score: 0.75 };
  const alerts = await detectBiAlerts(metrics);
  return { generated: alerts.length, alerts };
}

/**
 * Build BI operational report
 */
export async function buildBusinessIntelligenceOperationalReport(startDate: Date, endDate: Date) {
  const scorecards = await buildExecutiveScorecardPack({ startDate, endDate });
  const insights = await aggregateBiInsights(startDate, endDate);
  const decisions = await buildStrategicDecisionSupportPack({ startDate, endDate });

  return {
    scorecards: scorecards.success ? scorecards.data : [],
    insights,
    decisions: decisions.success ? decisions.data : [],
    generatedAt: new Date(),
  };
}
