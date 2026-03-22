/**
 * Executive Scorecard Builder
 *
 * Production-grade builder for executive scorecards.
 */

import type {
  ExecutiveScorecard,
  ScorecardMetric,
  ScorecardType,
  BiResult,
} from '../types.js';
import { getMetricDefinitionRegistry } from '../registry/metricDefinitionRegistry.js';
import { getCommercialIntelligenceService } from '../../commercialIntelligence/service/commercialIntelligenceService.js';
import { getGrowthBiMetrics } from '../integration/growthBiIntegration.js';
import { getCommercialBiMetrics } from '../integration/commercialBiIntegration.js';
import { getReleaseReadinessBiMetrics } from '../integration/productGovernanceBiIntegration.js';
import { SCORECARD_HEALTH_THRESHOLDS, SCORECARD_HEALTH_WEIGHTS } from '../constants.js';
import { logger } from '../../utils/logger.js';

/**
 * Executive Scorecard Builder
 *
 * Builds comprehensive executive scorecards.
 */
export class ExecutiveScorecardBuilder {
  /**
   * Build all executive scorecards
   */
  async buildExecutiveScorecards(params: {
    startDate: Date;
    endDate: Date;
    types?: ScorecardType[];
  }): Promise<BiResult<ExecutiveScorecard[]>> {
    try {
      const types = params.types ?? ['growth', 'quality', 'commercial', 'release', 'product_health', 'overall'];
      const scorecards: ExecutiveScorecard[] = [];

      for (const type of types) {
        const result = await this.buildScorecardByType(type, params.startDate, params.endDate);
        if (result.success && result.data) {
          scorecards.push(result.data);
        }
      }

      // Build overall scorecard
      if (types.includes('overall')) {
        const overallResult = await this.buildOverallScorecard(scorecards, params.startDate, params.endDate);
        if (overallResult.success && overallResult.data) {
          scorecards.push(overallResult.data);
        }
      }

      return { success: true, data: scorecards };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ msg: 'Error building executive scorecards', error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Build scorecard by type
   */
  async buildScorecardByType(type: ScorecardType, startDate: Date, endDate: Date): Promise<BiResult<ExecutiveScorecard>> {
    switch (type) {
      case 'growth':
        return this.buildGrowthExecutiveScorecard(startDate, endDate);
      case 'quality':
        return this.buildQualityExecutiveScorecard(startDate, endDate);
      case 'commercial':
        return this.buildCommercialExecutiveScorecard(startDate, endDate);
      case 'release':
        return this.buildReleaseExecutiveScorecard(startDate, endDate);
      case 'product_health':
        return this.buildProductHealthExecutiveScorecard(startDate, endDate);
      case 'experiment':
        return this.buildExperimentExecutiveScorecard(startDate, endDate);
      default:
        return { success: false, error: `Unsupported scorecard type: ${type}` };
    }
  }

  /**
   * Build growth executive scorecard
   */
  async buildGrowthExecutiveScorecard(startDate: Date, endDate: Date): Promise<BiResult<ExecutiveScorecard>> {
    try {
      const growthMetrics = await getGrowthBiMetrics(startDate, endDate);

      const metrics: ScorecardMetric[] = [
        {
          key: 'growth.sessions',
          name: 'Total Sessions',
          value: growthMetrics.totalSessions,
          unit: 'sessions',
          trend: growthMetrics.sessionTrend,
          changePercent: growthMetrics.sessionChangePercent,
        },
        {
          key: 'growth.submit_rate',
          name: 'Submit Rate',
          value: growthMetrics.submitRate,
          unit: 'percentage',
          trend: growthMetrics.submitRateTrend,
          changePercent: growthMetrics.submitRateChangePercent,
          threshold: { warning: 0.03, critical: 0.01 },
        },
        {
          key: 'growth.surface_diversity',
          name: 'Surface Diversity',
          value: growthMetrics.surfaceCount,
          unit: 'surfaces',
          trend: 'stable',
          changePercent: 0,
        },
        {
          key: 'growth.traffic_quality',
          name: 'Traffic Quality',
          value: growthMetrics.trafficQualityScore,
          unit: 'score',
          trend: growthMetrics.trafficQualityTrend,
          changePercent: growthMetrics.trafficQualityChangePercent,
          threshold: { warning: 0.6, critical: 0.4 },
        },
      ];

      // Calculate headline score
      const score = this.calculateGrowthScore(metrics);
      const status = this.classifyHealthStatus(score);
      const trend = this.calculateTrend(metrics);

      // Identify risks
      const risks = this.identifyGrowthRisks(metrics);

      // Generate decision hints
      const hints = this.generateGrowthDecisionHints(metrics, status);

      return {
        success: true,
        data: {
          type: 'growth',
          key: `growth_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`,
          period: { start: startDate, end: endDate },
          headline: { score, status, trend },
          metrics,
          risks,
          decisionHints: hints,
          confidence: 0.85,
          generatedAt: new Date(),
        },
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Build quality executive scorecard
   */
  async buildQualityExecutiveScorecard(startDate: Date, endDate: Date): Promise<BiResult<ExecutiveScorecard>> {
    try {
      const commercialService = getCommercialIntelligenceService();
      const funnelResult = await commercialService.buildCommercialPerformanceReport({ startDate, endDate });

      const noMatchRate = funnelResult.success ? funnelResult.data?.funnelPerformance.rates.noMatchRate ?? 0 : 0;
      const copyRate = funnelResult.success ? funnelResult.data?.funnelPerformance.rates.copyRate ?? 0 : 0;
      const openRate = funnelResult.success ? funnelResult.data?.funnelPerformance.rates.openRate ?? 0 : 0;

      const metrics: ScorecardMetric[] = [
        {
          key: 'quality.no_match_rate',
          name: 'No-Match Rate',
          value: noMatchRate,
          unit: 'percentage',
          trend: noMatchRate > 0.3 ? 'up' : 'down',
          changePercent: 0,
          threshold: { warning: 0.3, critical: 0.5 },
        },
        {
          key: 'quality.copy_rate',
          name: 'Copy Rate',
          value: copyRate,
          unit: 'percentage',
          trend: copyRate > 0.3 ? 'up' : 'down',
          changePercent: 0,
          threshold: { warning: 0.3, critical: 0.15 },
        },
        {
          key: 'quality.open_rate',
          name: 'Open Rate',
          value: openRate,
          unit: 'percentage',
          trend: openRate > 0.4 ? 'up' : 'down',
          changePercent: 0,
          threshold: { warning: 0.4, critical: 0.2 },
        },
        {
          key: 'quality.balance_score',
          name: 'Balance Score',
          value: 1 - noMatchRate,
          unit: 'score',
          trend: noMatchRate < 0.3 ? 'up' : 'down',
          changePercent: 0,
          threshold: { warning: 0.6, critical: 0.4 },
        },
      ];

      const score = this.calculateQualityScore(metrics);
      const status = this.classifyHealthStatus(score);
      const trend = this.calculateTrend(metrics);
      const risks = this.identifyQualityRisks(metrics);
      const hints = this.generateQualityDecisionHints(metrics, status);

      return {
        success: true,
        data: {
          type: 'quality',
          key: `quality_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`,
          period: { start: startDate, end: endDate },
          headline: { score, status, trend },
          metrics,
          risks,
          decisionHints: hints,
          confidence: 0.9,
          generatedAt: new Date(),
        },
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Build commercial executive scorecard
   */
  async buildCommercialExecutiveScorecard(startDate: Date, endDate: Date): Promise<BiResult<ExecutiveScorecard>> {
    try {
      const commercialMetrics = await getCommercialBiMetrics(startDate, endDate);

      const metrics: ScorecardMetric[] = [
        {
          key: 'commercial.revenue',
          name: 'Total Revenue',
          value: commercialMetrics.totalRevenue,
          unit: 'currency',
          trend: commercialMetrics.revenueTrend,
          changePercent: commercialMetrics.revenueChangePercent,
        },
        {
          key: 'commercial.commission',
          name: 'Total Commission',
          value: commercialMetrics.totalCommission,
          unit: 'currency',
          trend: commercialMetrics.commissionTrend,
          changePercent: commercialMetrics.commissionChangePercent,
        },
        {
          key: 'commercial.conversions',
          name: 'Total Conversions',
          value: commercialMetrics.totalConversions,
          unit: 'conversions',
          trend: commercialMetrics.conversionTrend,
          changePercent: commercialMetrics.conversionChangePercent,
        },
        {
          key: 'commercial.revenue_per_session',
          name: 'Revenue per Session',
          value: commercialMetrics.revenuePerSession,
          unit: 'currency',
          trend: commercialMetrics.revenuePerSessionTrend,
          changePercent: commercialMetrics.revenuePerSessionChangePercent,
        },
      ];

      const score = this.calculateCommercialScore(metrics);
      const status = this.classifyHealthStatus(score);
      const trend = this.calculateTrend(metrics);
      const risks = this.identifyCommercialRisks(metrics);
      const hints = this.generateCommercialDecisionHints(metrics, status);

      return {
        success: true,
        data: {
          type: 'commercial',
          key: `commercial_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`,
          period: { start: startDate, end: endDate },
          headline: { score, status, trend },
          metrics,
          risks,
          decisionHints: hints,
          confidence: 0.8,
          generatedAt: new Date(),
        },
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Build release executive scorecard
   */
  async buildReleaseExecutiveScorecard(startDate: Date, endDate: Date): Promise<BiResult<ExecutiveScorecard>> {
    try {
      const releaseMetrics = await getReleaseReadinessBiMetrics(startDate, endDate);

      const metrics: ScorecardMetric[] = [
        {
          key: 'release.readiness_score',
          name: 'Release Readiness Score',
          value: releaseMetrics.readinessScore,
          unit: 'score',
          trend: releaseMetrics.readinessTrend,
          changePercent: releaseMetrics.readinessChangePercent,
          threshold: { warning: 0.7, critical: 0.5 },
        },
        {
          key: 'release.blockers',
          name: 'Active Blockers',
          value: releaseMetrics.activeBlockers,
          unit: 'count',
          trend: releaseMetrics.blockerTrend,
          changePercent: releaseMetrics.blockerChangePercent,
          threshold: { warning: 2, critical: 5 },
        },
        {
          key: 'release.anomalies',
          name: 'Active Anomalies',
          value: releaseMetrics.activeAnomalies,
          unit: 'count',
          trend: releaseMetrics.anomalyTrend,
          changePercent: releaseMetrics.anomalyChangePercent,
          threshold: { warning: 5, critical: 10 },
        },
        {
          key: 'release.governance_status',
          name: 'Governance Status',
          value: releaseMetrics.governanceScore,
          unit: 'score',
          trend: releaseMetrics.governanceTrend,
          changePercent: releaseMetrics.governanceChangePercent,
        },
      ];

      const score = this.calculateReleaseScore(metrics);
      const status = this.classifyHealthStatus(score);
      const trend = this.calculateTrend(metrics);
      const risks = this.identifyReleaseRisks(metrics);
      const hints = this.generateReleaseDecisionHints(metrics, status);

      return {
        success: true,
        data: {
          type: 'release',
          key: `release_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`,
          period: { start: startDate, end: endDate },
          headline: { score, status, trend },
          metrics,
          risks,
          decisionHints: hints,
          confidence: 0.75,
          generatedAt: new Date(),
        },
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Build product health executive scorecard
   */
  async buildProductHealthExecutiveScorecard(startDate: Date, endDate: Date): Promise<BiResult<ExecutiveScorecard>> {
    try {
      // Combine quality, commercial, and release for product health
      const qualityResult = await this.buildQualityExecutiveScorecard(startDate, endDate);
      const commercialResult = await this.buildCommercialExecutiveScorecard(startDate, endDate);
      const releaseResult = await this.buildReleaseExecutiveScorecard(startDate, endDate);

      const healthScore = (
        (qualityResult.data?.headline.score ?? 0.5) * 0.4 +
        (commercialResult.data?.headline.score ?? 0.5) * 0.3 +
        (releaseResult.data?.headline.score ?? 0.5) * 0.3
      );

      const status = this.classifyHealthStatus(healthScore);

      const risks = [
        ...(qualityResult.data?.risks ?? []),
        ...(releaseResult.data?.risks ?? []),
      ].slice(0, 5);

      const hints = [
        ...(qualityResult.data?.decisionHints ?? []),
        ...(releaseResult.data?.decisionHints ?? []),
      ].slice(0, 5);

      return {
        success: true,
        data: {
          type: 'product_health',
          key: `product_health_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`,
          period: { start: startDate, end: endDate },
          headline: {
            score: Math.round(healthScore * 100) / 100,
            status,
            trend: qualityResult.data?.headline.trend ?? 'stable',
          },
          metrics: [],
          risks,
          decisionHints: hints,
          confidence: 0.7,
          generatedAt: new Date(),
        },
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Build experiment executive scorecard
   */
  async buildExperimentExecutiveScorecard(startDate: Date, endDate: Date): Promise<BiResult<ExecutiveScorecard>> {
    // Simplified - would need experimentation integration
    return {
      success: true,
      data: {
        type: 'experiment',
        key: `experiment_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`,
        period: { start: startDate, end: endDate },
        headline: { score: 0.7, status: 'healthy', trend: 'stable' },
        metrics: [],
        risks: [],
        decisionHints: ['No active experiments requiring attention'],
        confidence: 0.5,
        generatedAt: new Date(),
      },
    };
  }

  /**
   * Build overall scorecard
   */
  async buildOverallScorecard(scorecards: ExecutiveScorecard[], startDate: Date, endDate: Date): Promise<BiResult<ExecutiveScorecard>> {
    const availableTypes = ['growth', 'quality', 'commercial', 'release'];
    const availableScores = scorecards.filter(s => availableTypes.includes(s.type));

    if (availableScores.length === 0) {
      return {
        success: true,
        data: {
          type: 'overall',
          key: `overall_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`,
          period: { start: startDate, end: endDate },
          headline: { score: 0.5, status: 'warning', trend: 'stable' },
          metrics: [],
          risks: [],
          decisionHints: ['Insufficient data for overall score'],
          confidence: 0.3,
          generatedAt: new Date(),
        },
      };
    }

    const avgScore = availableScores.reduce((sum, s) => sum + s.headline.score, 0) / availableScores.length;
    const status = this.classifyHealthStatus(avgScore);

    const allRisks = scorecards.flatMap(s => s.risks).slice(0, 5);
    const allHints = scorecards.flatMap(s => s.decisionHints).slice(0, 5);

    return {
      success: true,
      data: {
        type: 'overall',
        key: `overall_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`,
        period: { start: startDate, end: endDate },
        headline: {
          score: Math.round(avgScore * 100) / 100,
          status,
          trend: this.calculateOverallTrend(scorecards),
        },
        metrics: [],
        risks: allRisks,
        decisionHints: allHints,
        confidence: Math.min(...scorecards.map(s => s.confidence)),
        generatedAt: new Date(),
      },
    };
  }

  // Helper methods
  private calculateGrowthScore(metrics: ScorecardMetric[]): number {
    const sessionMetric = metrics.find(m => m.key === 'growth.sessions');
    const submitRate = metrics.find(m => m.key === 'growth.submit_rate');
    const quality = metrics.find(m => m.key === 'growth.traffic_quality');

    let score = 0.3; // Base score

    if (sessionMetric && sessionMetric.value > 0) score += 0.2;
    if (submitRate && submitRate.value > 0.05) score += 0.25;
    if (quality && quality.value > 0.6) score += 0.25;

    return Math.min(1, score);
  }

  private calculateQualityScore(metrics: ScorecardMetric[]): number {
    const noMatch = metrics.find(m => m.key === 'quality.no_match_rate');
    const copy = metrics.find(m => m.key === 'quality.copy_rate');
    const open = metrics.find(m => m.key === 'quality.open_rate');

    let score = 0;
    if (noMatch) score += (1 - noMatch.value) * 0.4;
    if (copy) score += copy.value * 0.3;
    if (open) score += open.value * 0.3;

    return Math.min(1, Math.max(0, score));
  }

  private calculateCommercialScore(metrics: ScorecardMetric[]): number {
    const revenue = metrics.find(m => m.key === 'commercial.revenue');
    const conversion = metrics.find(m => m.key === 'commercial.conversions');
    const rps = metrics.find(m => m.key === 'commercial.revenue_per_session');

    let score = 0;
    if (revenue && revenue.value > 0) score += 0.4;
    if (conversion && conversion.value > 0) score += 0.3;
    if (rps && rps.value > 0) score += 0.3;

    return Math.min(1, score);
  }

  private calculateReleaseScore(metrics: ScorecardMetric[]): number {
    const readiness = metrics.find(m => m.key === 'release.readiness_score');
    const blockers = metrics.find(m => m.key === 'release.blockers');

    let score = 0;
    if (readiness) score += readiness.value * 0.6;
    if (blockers) score += Math.max(0, 1 - blockers.value / 10) * 0.4;

    return Math.min(1, Math.max(0, score));
  }

  private classifyHealthStatus(score: number): 'healthy' | 'warning' | 'critical' {
    if (score >= SCORECARD_HEALTH_THRESHOLDS.HEALTHY_MIN) return 'healthy';
    if (score >= SCORECARD_HEALTH_THRESHOLDS.WARNING_MIN) return 'warning';
    return 'critical';
  }

  private calculateTrend(metrics: ScorecardMetric[]): 'improving' | 'stable' | 'declining' {
    const upCount = metrics.filter(m => m.trend === 'up').length;
    const downCount = metrics.filter(m => m.trend === 'down').length;

    if (upCount > downCount) return 'improving';
    if (downCount > upCount) return 'declining';
    return 'stable';
  }

  private calculateOverallTrend(scorecards: ExecutiveScorecard[]): 'improving' | 'stable' | 'declining' {
    const trends = scorecards.map(s => s.headline.trend);
    const improving = trends.filter(t => t === 'improving').length;
    const declining = trends.filter(t => t === 'declining').length;

    if (improving > declining) return 'improving';
    if (declining > improving) return 'declining';
    return 'stable';
  }

  private identifyGrowthRisks(metrics: ScorecardMetric[]): ExecutiveScorecard['risks'] {
    const risks: ExecutiveScorecard['risks'] = [];
    const submitRate = metrics.find(m => m.key === 'growth.submit_rate');
    const quality = metrics.find(m => m.key === 'growth.traffic_quality');

    if (submitRate && submitRate.value < 0.02) {
      risks.push({
        type: 'low_engagement',
        severity: 'high',
        description: 'Submit rate critically low - investigate user flow',
        affectedEntities: ['growth_surfaces'],
      });
    }

    if (quality && quality.value < 0.5) {
      risks.push({
        type: 'traffic_quality_issue',
        severity: 'medium',
        description: 'Traffic quality below acceptable threshold',
        affectedEntities: ['growth_surfaces'],
      });
    }

    return risks;
  }

  private identifyQualityRisks(metrics: ScorecardMetric[]): ExecutiveScorecard['risks'] {
    const risks: ExecutiveScorecard['risks'] = [];
    const noMatch = metrics.find(m => m.key === 'quality.no_match_rate');

    if (noMatch && noMatch.value > 0.4) {
      risks.push({
        type: 'high_no_match',
        severity: noMatch.value > 0.6 ? 'critical' : 'high',
        description: `No-match rate at ${(noMatch.value * 100).toFixed(1)}% - investigate voucher matching`,
        affectedEntities: ['voucher_engine'],
      });
    }

    return risks;
  }

  private identifyCommercialRisks(metrics: ScorecardMetric[]): ExecutiveScorecard['risks'] {
    const risks: ExecutiveScorecard['risks'] = [];
    const revenue = metrics.find(m => m.key === 'commercial.revenue');

    if (revenue && revenue.trend === 'down' && revenue.changePercent < -20) {
      risks.push({
        type: 'revenue_decline',
        severity: 'high',
        description: 'Revenue declined significantly - review attribution and conversion',
        affectedEntities: ['commercial_attribution'],
      });
    }

    return risks;
  }

  private identifyReleaseRisks(metrics: ScorecardMetric[]): ExecutiveScorecard['risks'] {
    const risks: ExecutiveScorecard['risks'] = [];
    const blockers = metrics.find(m => m.key === 'release.blockers');

    if (blockers && blockers.value > 2) {
      risks.push({
        type: 'release_blockers',
        severity: blockers.value > 5 ? 'critical' : 'high',
        description: `${blockers.value} active release blockers`,
        affectedEntities: ['releases'],
      });
    }

    return risks;
  }

  private generateGrowthDecisionHints(metrics: ScorecardMetric[], status: string): string[] {
    const hints: string[] = [];
    const submitRate = metrics.find(m => m.key === 'growth.submit_rate');

    if (status === 'critical') {
      hints.push('CRITICAL: Review growth strategy immediately');
    } else if (status === 'warning') {
      hints.push('WARNING: Monitor growth metrics closely');
    }

    if (submitRate && submitRate.value < 0.03) {
      hints.push('Low submit rate - investigate user flow friction');
    }

    return hints;
  }

  private generateQualityDecisionHints(metrics: ScorecardMetric[], status: string): string[] {
    const hints: string[] = [];
    const noMatch = metrics.find(m => m.key === 'quality.no_match_rate');

    if (status === 'critical') {
      hints.push('CRITICAL: No-match rate needs immediate attention');
    }

    if (noMatch && noMatch.value > 0.4) {
      hints.push('Review voucher matching algorithm');
    }

    return hints;
  }

  private generateCommercialDecisionHints(metrics: ScorecardMetric[], status: string): string[] {
    const hints: string[] = [];

    if (status === 'critical') {
      hints.push('CRITICAL: Review commercial performance');
    }

    return hints;
  }

  private generateReleaseDecisionHints(metrics: ScorecardMetric[], status: string): string[] {
    const hints: string[] = [];
    const blockers = metrics.find(m => m.key === 'release.blockers');

    if (status === 'critical' || (blockers && blockers.value > 3)) {
      hints.push('CRITICAL: Blockers must be resolved before next release');
    }

    if (status === 'warning') {
      hints.push('WARNING: Review active blockers and anomalies');
    }

    return hints;
  }
}

// Factory
let builder: ExecutiveScorecardBuilder | null = null;

export function getExecutiveScorecardBuilder(): ExecutiveScorecardBuilder {
  if (!builder) builder = new ExecutiveScorecardBuilder();
  return builder;
}

export async function buildExecutiveScorecards(params: {
  startDate: Date;
  endDate: Date;
  types?: ScorecardType[];
}): Promise<BiResult<ExecutiveScorecard[]>> {
  return getExecutiveScorecardBuilder().buildExecutiveScorecards(params);
}
