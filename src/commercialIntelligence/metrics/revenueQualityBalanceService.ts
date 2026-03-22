/**
 * Revenue Quality Balance Service
 *
 * Production-grade revenue-quality balance evaluation.
 * Ensures commercial optimization doesn't compromise user usefulness.
 */

import { getSupabaseClient, type SupabaseClient } from '../../db/supabaseClient.js';
import type {
  RevenueQualityBalanceResult,
  RevenueQualityDimension,
  CommercialOptimizationRisk,
  FunnelMetrics,
  CommercialResult,
  GrowthSurfaceType,
} from '../types.js';
import {
  REVENUE_QUALITY_THRESHOLDS,
  RISK_THRESHOLDS,
  LOW_VALUE_THRESHOLDS,
} from '../constants.js';
import { logger } from '../../utils/logger.js';

/**
 * Revenue Quality Balance Service
 *
 * Evaluates the balance between revenue generation and user usefulness.
 */
export class RevenueQualityBalanceService {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? getSupabaseClient();
  }

  /**
   * Evaluate revenue-quality balance
   */
  async evaluateRevenueQualityBalance(params: {
    entityType: 'voucher' | 'surface' | 'experiment' | 'global';
    entityId: string;
    revenueMetrics: {
      totalRevenue: number;
      totalCommission: number;
      conversions: number;
    };
    usefulnessMetrics: {
      noMatchCount: number;
      noMatchRate: number;
      copyCount: number;
      openCount: number;
      sessionCount: number;
    };
    qualityMetrics?: {
      relevanceScore?: number;
      userSatisfactionScore?: number;
    };
  }): Promise<CommercialResult<RevenueQualityBalanceResult>> {
    try {
      const { entityType, entityId, revenueMetrics, usefulnessMetrics, qualityMetrics } = params;

      // Calculate dimension scores
      const dimensions = this.calculateRevenueQualityDimensions(
        revenueMetrics,
        usefulnessMetrics,
        qualityMetrics
      );

      // Determine risk level
      const riskLevel = this.determineRiskLevel(dimensions);

      // Generate warnings
      const warnings = this.generateWarnings(dimensions, revenueMetrics, usefulnessMetrics);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        entityType,
        dimensions,
        riskLevel,
        warnings
      );

      return {
        success: true,
        data: {
          entityType,
          entityId,
          dimensions,
          riskLevel,
          warnings,
          recommendations,
          scoringPayload: {
            revenueMetrics,
            usefulnessMetrics,
            qualityMetrics,
            calculatedAt: new Date().toISOString(),
          },
        },
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ msg: 'Error evaluating revenue-quality balance', error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Build revenue-quality balance result
   */
  buildRevenueQualityBalanceResult(params: {
    entityType: 'voucher' | 'surface' | 'experiment' | 'global';
    entityId: string;
    funnelMetrics: FunnelMetrics;
    revenue: number;
    commission: number;
    sessions: number;
  }): RevenueQualityBalanceResult {
    const { entityType, entityId, funnelMetrics, revenue, commission, sessions } = params;

    const revenueMetrics = {
      totalRevenue: revenue,
      totalCommission: commission,
      conversions: funnelMetrics.openShopeeClicks,
    };

    const usefulnessMetrics = {
      noMatchCount: funnelMetrics.resolutionNoMatch,
      noMatchRate: funnelMetrics.pasteSubmits > 0
        ? funnelMetrics.resolutionNoMatch / funnelMetrics.pasteSubmits
        : 0,
      copyCount: funnelMetrics.voucherCopySuccess,
      openCount: funnelMetrics.openShopeeClicks,
      sessionCount: sessions,
    };

    const dimensions = this.calculateRevenueQualityDimensions(
      revenueMetrics,
      usefulnessMetrics,
      undefined
    );

    const riskLevel = this.determineRiskLevel(dimensions);
    const warnings = this.generateWarnings(dimensions, revenueMetrics, usefulnessMetrics);
    const recommendations = this.generateRecommendations(entityType, dimensions, riskLevel, warnings);

    return {
      entityType,
      entityId,
      dimensions,
      riskLevel,
      warnings,
      recommendations,
      scoringPayload: { funnelMetrics, calculatedAt: new Date().toISOString() },
    };
  }

  /**
   * Detect commercial optimization risk
   */
  detectCommercialOptimizationRisk(params: {
    currentMetrics: {
      revenue: number;
      noMatchRate: number;
      copyRate: number;
      openRate: number;
    };
    previousMetrics: {
      revenue: number;
      noMatchRate: number;
      copyRate: number;
      openRate: number;
    };
  }): CommercialOptimizationRisk[] {
    const risks: CommercialOptimizationRisk[] = [];
    const { currentMetrics, previousMetrics } = params;

    // Check for revenue up but no-match worse
    const revenueUp = currentMetrics.revenue > previousMetrics.revenue;
    const noMatchWorse = currentMetrics.noMatchRate > previousMetrics.noMatchRate + RISK_THRESHOLDS.NO_MATCH_SPIKE_THRESHOLD;

    if (revenueUp && noMatchWorse) {
      risks.push({
        riskType: 'revenue_usefulness_divergence',
        severity: 'high',
        description: 'Revenue increased but no-match rate also increased significantly',
        affectedEntities: [],
        detectedIndicators: [
          `Revenue: ${previousMetrics.revenue} -> ${currentMetrics.revenue} (+${((currentMetrics.revenue - previousMetrics.revenue) / previousMetrics.revenue * 100).toFixed(1)}%)`,
          `No-match rate: ${(previousMetrics.noMatchRate * 100).toFixed(1)}% -> ${(currentMetrics.noMatchRate * 100).toFixed(1)}%`,
        ],
        recommendedActions: [
          'Review voucher ranking algorithm for quality signals',
          'Check if optimization is favoring high-commission but low-relevance vouchers',
          'Verify user intent matching is not degraded',
        ],
      });
    }

    // Check for revenue up but copy/open rate down
    const copyRateDown = currentMetrics.copyRate < previousMetrics.copyRate - RISK_THRESHOLDS.QUALITY_DEGRADATION_THRESHOLD;
    const openRateDown = currentMetrics.openRate < previousMetrics.openRate - RISK_THRESHOLDS.QUALITY_DEGRADATION_THRESHOLD;

    if (revenueUp && (copyRateDown || openRateDown)) {
      risks.push({
        riskType: 'quality_degradation',
        severity: 'medium',
        description: 'Revenue increased but user engagement metrics degraded',
        affectedEntities: [],
        detectedIndicators: [
          `Copy rate: ${(previousMetrics.copyRate * 100).toFixed(1)}% -> ${(currentMetrics.copyRate * 100).toFixed(1)}%`,
          `Open rate: ${(previousMetrics.openRate * 100).toFixed(1)}% -> ${(currentMetrics.openRate * 100).toFixed(1)}%`,
        ],
        recommendedActions: [
          'Review voucher presentation for clarity',
          'Check if copy action is being hindered',
          'Verify voucher relevance to user query',
        ],
      });
    }

    // Check for suspicious click inflation
    const copyRateIncrease = currentMetrics.copyRate > previousMetrics.copyRate * RISK_THRESHOLDS.CLICK_INFLATION_THRESHOLD;

    if (revenueUp && copyRateIncrease) {
      risks.push({
        riskType: 'click_inflation_suspect',
        severity: 'low',
        description: 'Copy rate increased significantly - verify this is organic',
        affectedEntities: [],
        detectedIndicators: [
          `Copy rate: ${(previousMetrics.copyRate * 100).toFixed(1)}% -> ${(currentMetrics.copyRate * 100).toFixed(1)}%`,
        ],
        recommendedActions: [
          'Monitor for bot-like behavior',
          'Verify user feedback on voucher quality',
        ],
      });
    }

    return risks;
  }

  /**
   * Calculate revenue quality dimensions
   */
  private calculateRevenueQualityDimensions(
    revenueMetrics: {
      totalRevenue: number;
      totalCommission: number;
      conversions: number;
    },
    usefulnessMetrics: {
      noMatchCount: number;
      noMatchRate: number;
      copyCount: number;
      openCount: number;
      sessionCount: number;
    },
    qualityMetrics?: {
      relevanceScore?: number;
      userSatisfactionScore?: number;
    }
  ): RevenueQualityDimension {
    // Revenue score: based on revenue per session
    const revenuePerSession = usefulnessMetrics.sessionCount > 0
      ? revenueMetrics.totalRevenue / usefulnessMetrics.sessionCount
      : 0;
    const revenueScore = this.scoreRevenue(revenuePerSession);

    // Usefulness score: inverse of no-match rate + engagement rate
    const noMatchPenalty = usefulnessMetrics.noMatchRate;
    const engagementRate = usefulnessMetrics.sessionCount > 0
      ? (usefulnessMetrics.copyCount + usefulnessMetrics.openCount) / (2 * usefulnessMetrics.sessionCount)
      : 0;
    const usefulnessScore = Math.max(0, Math.min(1, 1 - noMatchPenalty + engagementRate * 0.3));

    // Quality score: based on explicit quality metrics or inferred
    let qualityScore: number;
    if (qualityMetrics?.relevanceScore !== undefined && qualityMetrics?.userSatisfactionScore !== undefined) {
      qualityScore = (qualityMetrics.relevanceScore + qualityMetrics.userSatisfactionScore) / 2;
    } else {
      // Inferred from funnel
      const copyToOpenRate = usefulnessMetrics.copyCount > 0
        ? usefulnessMetrics.openCount / usefulnessMetrics.copyCount
        : 0;
      qualityScore = copyToOpenRate;
    }

    // Balance score: weighted combination
    const balanceScore = revenueScore * 0.3 + usefulnessScore * 0.4 + qualityScore * 0.3;

    return {
      revenueScore: Math.round(revenueScore * 10000) / 10000,
      usefulnessScore: Math.round(usefulnessScore * 10000) / 10000,
      qualityScore: Math.round(qualityScore * 10000) / 10000,
      balanceScore: Math.round(balanceScore * 10000) / 10000,
    };
  }

  /**
   * Score revenue per session
   */
  private scoreRevenue(revenuePerSession: number): number {
    if (revenuePerSession >= 1) return 1.0;
    if (revenuePerSession >= 0.5) return 0.8;
    if (revenuePerSession >= 0.2) return 0.6;
    if (revenuePerSession >= 0.1) return 0.4;
    if (revenuePerSession >= 0.01) return 0.2;
    return 0;
  }

  /**
   * Determine risk level
   */
  private determineRiskLevel(dimensions: RevenueQualityDimension): 'low' | 'medium' | 'high' | 'critical' {
    const { revenueScore, usefulnessScore, balanceScore } = dimensions;

    // Critical: balance below threshold
    if (balanceScore < REVENUE_QUALITY_THRESHOLDS.MIN_BALANCE_SCORE) {
      return 'critical';
    }

    // High: low usefulness or critical divergence
    if (usefulnessScore < REVENUE_QUALITY_THRESHOLDS.MIN_USEFULNESS_SCORE) {
      return 'high';
    }

    // Check for divergence
    const divergence = Math.abs(revenueScore - usefulnessScore);
    if (divergence > REVENUE_QUALITY_THRESHOLDS.CRITICAL_DIVERGENCE) {
      return 'high';
    }

    // Medium: moderate issues
    if (balanceScore < REVENUE_QUALITY_THRESHOLDS.WARNING_BALANCE_SCORE) {
      return 'medium';
    }

    if (divergence > REVENUE_QUALITY_THRESHOLDS.DIVERGENCE_THRESHOLD) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Generate warnings
   */
  private generateWarnings(
    dimensions: RevenueQualityDimension,
    revenueMetrics: { totalRevenue: number; totalCommission: number; conversions: number },
    usefulnessMetrics: { noMatchCount: number; noMatchRate: number; copyCount: number; openCount: number; sessionCount: number }
  ): string[] {
    const warnings: string[] = [];

    // Check usefulness
    if (dimensions.usefulnessScore < REVENUE_QUALITY_THRESHOLDS.MIN_USEFULNESS_SCORE) {
      warnings.push(`Usefulness score (${(dimensions.usefulnessScore * 100).toFixed(1)}%) is below minimum threshold (${(REVENUE_QUALITY_THRESHOLDS.MIN_USEFULNESS_SCORE * 100).toFixed(1)}%)`);
    }

    // Check no-match rate
    if (usefulnessMetrics.noMatchRate > RISK_THRESHOLDS.NO_MATCH_SPIKE_THRESHOLD) {
      warnings.push(`No-match rate (${(usefulnessMetrics.noMatchRate * 100).toFixed(1)}%) is above threshold (${(RISK_THRESHOLDS.NO_MATCH_SPIKE_THRESHOLD * 100).toFixed(1)}%)`);
    }

    // Check for revenue-usefulness divergence
    const divergence = Math.abs(dimensions.revenueScore - dimensions.usefulnessScore);
    if (divergence > REVENUE_QUALITY_THRESHOLDS.DIVERGENCE_THRESHOLD) {
      warnings.push(`Revenue-usefulness divergence detected: ${(divergence * 100).toFixed(1)}% difference`);
    }

    // Check for low engagement
    if (usefulnessMetrics.sessionCount > 0) {
      const copyRate = usefulnessMetrics.copyCount / usefulnessMetrics.sessionCount;
      if (copyRate < LOW_VALUE_THRESHOLDS.SUBMIT_WITH_NO_RESOLUTION) {
        warnings.push(`Low copy rate (${(copyRate * 100).toFixed(1)}%) indicates potential engagement issues`);
      }
    }

    return warnings;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    entityType: 'voucher' | 'surface' | 'experiment' | 'global',
    dimensions: RevenueQualityDimension,
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    warnings: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'critical' || riskLevel === 'high') {
      recommendations.push(`Review ${entityType} for quality issues immediately`);
      recommendations.push('Consider temporarily reducing visibility or removing from ranking');
    }

    if (dimensions.usefulnessScore < REVENUE_QUALITY_THRESHOLDS.WARNING_USEFULNESS_SCORE) {
      recommendations.push('Improve resolution matching to reduce no-match rate');
      recommendations.push('Review voucher ranking for relevance signals');
    }

    if (dimensions.revenueScore < REVENUE_QUALITY_THRESHOLDS.MIN_REVENUE_SCORE) {
      recommendations.push('Explore higher-value voucher sources');
      recommendations.push('Consider testing different commission structures');
    }

    if (warnings.some(w => w.includes('divergence'))) {
      recommendations.push('Audit recent changes that may have caused divergence');
      recommendations.push('Implement A/B testing to validate changes');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring - current balance is healthy');
    }

    return recommendations;
  }
}

// ============================================================
// Factory
// ============================================================

let revenueQualityBalanceService: RevenueQualityBalanceService | null = null;

export function getRevenueQualityBalanceService(): RevenueQualityBalanceService {
  if (!revenueQualityBalanceService) {
    revenueQualityBalanceService = new RevenueQualityBalanceService();
  }
  return revenueQualityBalanceService;
}

// ============================================================
// Direct Exports
// ============================================================

export async function evaluateRevenueQualityBalance(
  params: Parameters<RevenueQualityBalanceService['evaluateRevenueQualityBalance']>[0]
): Promise<CommercialResult<RevenueQualityBalanceResult>> {
  return getRevenueQualityBalanceService().evaluateRevenueQualityBalance(params);
}

export function buildRevenueQualityBalanceResult(
  params: Parameters<RevenueQualityBalanceService['buildRevenueQualityBalanceResult']>[0]
): RevenueQualityBalanceResult {
  return getRevenueQualityBalanceService().buildRevenueQualityBalanceResult(params);
}

export function detectCommercialOptimizationRisk(
  params: Parameters<RevenueQualityBalanceService['detectCommercialOptimizationRisk']>[0]
): CommercialOptimizationRisk[] {
  return getRevenueQualityBalanceService().detectCommercialOptimizationRisk(params);
}
