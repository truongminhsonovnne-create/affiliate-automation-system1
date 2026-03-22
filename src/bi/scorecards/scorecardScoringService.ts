/**
 * Scorecard Scoring Service
 *
 * Production-grade scoring service for scorecards.
 */

import type { ExecutiveScorecard, ScorecardHealthStatus, ScorecardTrend } from '../types.js';
import { SCORECARD_HEALTH_THRESHOLDS } from '../constants.js';

/**
 * Scorecard Scoring Service
 */
export class ScorecardScoringService {
  /**
   * Build scorecard health score
   */
  buildScorecardHealthScore(scorecard: ExecutiveScorecard): number {
    const { metrics, headline, risks } = scorecard;

    // Base score from headline
    let score = headline.score;

    // Penalize for risks
    for (const risk of risks) {
      switch (risk.severity) {
        case 'critical':
          score -= 0.15;
          break;
        case 'high':
          score -= 0.1;
          break;
        case 'medium':
          score -= 0.05;
          break;
        case 'low':
          score -= 0.02;
          break;
      }
    }

    // Ensure within bounds
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Classify scorecard health
   */
  classifyScorecardHealth(score: number): ScorecardHealthStatus {
    if (score >= SCORECARD_HEALTH_THRESHOLDS.HEALTHY_MIN) return 'healthy';
    if (score >= SCORECARD_HEALTH_THRESHOLDS.WARNING_MIN) return 'warning';
    return 'critical';
  }

  /**
   * Build scorecard risk summary
   */
  buildScorecardRiskSummary(scorecards: ExecutiveScorecard[]): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    criticalItems: Array<{ scorecard: string; risk: string; severity: string }>;
  } {
    const risks: Array<{ scorecard: string; risk: string; severity: string }> = [];
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };

    for (const scorecard of scorecards) {
      for (const risk of scorecard.risks) {
        risks.push({
          scorecard: scorecard.type,
          risk: risk.description,
          severity: risk.severity,
        });

        byType[risk.type] = (byType[risk.type] ?? 0) + 1;
        bySeverity[risk.severity]++;
      }
    }

    const criticalItems = risks
      .filter(r => r.severity === 'critical' || r.severity === 'high')
      .slice(0, 10);

    return {
      total: risks.length,
      byType,
      bySeverity,
      criticalItems,
    };
  }
}

let service: ScorecardScoringService | null = null;

export function getScorecardScoringService(): ScorecardScoringService {
  if (!service) service = new ScorecardScoringService();
  return service;
}

export function buildScorecardHealthScore(scorecard: ExecutiveScorecard): number {
  return getScorecardScoringService().buildScorecardHealthScore(scorecard);
}

export function classifyScorecardHealth(score: number): ScorecardHealthStatus {
  return getScorecardScoringService().classifyScorecardHealth(score);
}

export function buildScorecardRiskSummary(scorecards: ExecutiveScorecard[]): ReturnType<ScorecardScoringService['buildScorecardRiskSummary']> {
  return getScorecardScoringService().buildScorecardRiskSummary(scorecards);
}
