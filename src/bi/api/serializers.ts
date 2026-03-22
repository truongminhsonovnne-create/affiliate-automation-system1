/**
 * BI API Serializers
 */

import type { ExecutiveScorecard, ExecutiveScorecardDto, ExecutiveScorecardPackDto, BiAlertDto, StrategicDecisionRecommendationDto } from '../types.js';

export function serializeScorecard(scorecard: ExecutiveScorecard): ExecutiveScorecardDto {
  return {
    type: scorecard.type,
    key: scorecard.key,
    period: { start: scorecard.period.start.toISOString(), end: scorecard.period.end.toISOString() },
    headline: {
      score: scorecard.headline.score,
      status: scorecard.headline.status,
      trend: scorecard.headline.trend,
    },
    metrics: scorecard.metrics.map(m => ({
      key: m.key,
      name: m.name,
      value: m.value,
      unit: m.unit,
      trend: m.trend,
      changePercent: m.changePercent,
    })),
    risks: scorecard.risks.map(r => ({ type: r.type, severity: r.severity, description: r.description })),
    decisionHints: scorecard.decisionHints,
    confidence: scorecard.confidence,
    generatedAt: scorecard.generatedAt.toISOString(),
  };
}

export function serializeScorecardPack(scorecards: ExecutiveScorecard[], period: { start: Date; end: Date }): ExecutiveScorecardPackDto {
  const overall = scorecards.find(s => s.type === 'overall') ?? scorecards[0];
  return {
    overall: serializeScorecard(overall),
    scorecards: scorecards.map(serializeScorecard),
    period: { start: period.start.toISOString(), end: period.end.toISOString() },
    generatedAt: new Date().toISOString(),
  };
}

export function serializeAlert(alert: any): BiAlertDto {
  return {
    id: alert.id,
    type: alert.type,
    severity: alert.severity,
    sourceArea: alert.sourceArea,
    targetEntityType: alert.targetEntityType,
    targetEntityId: alert.targetEntityId,
    description: alert.payload?.description ?? '',
    createdAt: alert.createdAt.toISOString(),
  };
}
