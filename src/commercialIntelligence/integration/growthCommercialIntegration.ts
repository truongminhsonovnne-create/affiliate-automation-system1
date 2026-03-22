/**
 * Growth Commercial Integration
 *
 * Integrates growth surface data with commercial intelligence.
 */

import type { GrowthSurfaceCommercialImpact, GrowthSurfaceType, CommercialResult } from '../types.js';
import { GROWTH_SURFACE_CONFIG } from '../constants.js';

/**
 * Analyze growth surface commercial impact
 */
export async function analyzeGrowthSurfaceCommercialImpact(params: {
  surfaceType: GrowthSurfaceType;
  surfaceId: string;
  metrics: {
    sessions: number;
    pageViews: number;
    revenue: number;
    commission: number;
    conversions: number;
    noMatchRate: number;
    copyRate: number;
  };
}): Promise<CommercialResult<GrowthSurfaceCommercialImpact>> {
  try {
    const { surfaceType, surfaceId, metrics } = params;
    const config = GROWTH_SURFACE_CONFIG[surfaceType];

    // Calculate contribution percentages
    const trafficContribution = metrics.sessions > 0 ? 1 : 0; // Simplified
    const revenueContribution = metrics.revenue; // Simplified
    const commissionContribution = metrics.commission;
    const conversionContribution = metrics.conversions;

    // Calculate quality contribution (inverse of no-match rate)
    const qualityContribution = 1 - metrics.noMatchRate;

    // Determine if profitable
    const isProfitable = metrics.revenue > 0;

    // Determine recommendation
    let recommendation: GrowthSurfaceCommercialImpact['recommendation'];

    if (!isProfitable && metrics.noMatchRate > 0.7) {
      recommendation = 'reduce';
    } else if (metrics.noMatchRate > 0.5) {
      recommendation = 'investigate';
    } else if (metrics.revenue > 0 && metrics.noMatchRate < 0.3) {
      recommendation = 'scale';
    } else {
      recommendation = 'maintain';
    }

    return {
      success: true,
      data: {
        surfaceType,
        surfaceId,
        trafficContribution,
        revenueContribution,
        commissionContribution,
        conversionContribution,
        qualityContribution,
        isProfitable,
        recommendation,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Collect commercial signals for growth governance
 */
export async function collectCommercialSignalsForGrowthGovernance(params: {
  surfaceType: GrowthSurfaceType;
  surfaceId: string;
}): Promise<{
  trafficSignal: 'healthy' | 'weak' | 'suspicious';
  qualitySignal: 'healthy' | 'degraded' | 'poor';
  commercialSignal: 'profitable' | 'breakeven' | 'loss';
  overallSignal: 'scale' | 'maintain' | 'reduce' | 'investigate';
  recommendations: string[];
}> {
  // This would integrate with funnel aggregation and anomaly detection
  // Simplified implementation
  return {
    trafficSignal: 'healthy',
    qualitySignal: 'healthy',
    commercialSignal: 'profitable',
    overallSignal: 'maintain',
    recommendations: [
      'Continue monitoring surface performance',
      'Track quality metrics for any degradation',
    ],
  };
}

/**
 * Build growth surface revenue quality profile
 */
export function buildGrowthSurfaceRevenueQualityProfile(params: {
  surfaceType: GrowthSurfaceType;
  surfaceId: string;
  metrics: {
    sessions: number;
    revenue: number;
    noMatchRate: number;
    copyRate: number;
    openRate: number;
  };
}): {
  profile: {
    revenueScore: number;
    qualityScore: number;
    engagementScore: number;
    overallScore: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
} {
  const { surfaceType, metrics } = params;
  const config = GROWTH_SURFACE_CONFIG[surfaceType];

  // Calculate scores
  const revenueScore = metrics.sessions > 0 ? Math.min(metrics.revenue / metrics.sessions / 0.1, 1) : 0;
  const qualityScore = 1 - metrics.noMatchRate;
  const engagementScore = (metrics.copyRate + metrics.openRate) / 2;
  const overallScore = revenueScore * 0.4 + qualityScore * 0.4 + engagementScore * 0.2;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (revenueScore > 0.6) strengths.push('Strong revenue performance');
  else if (revenueScore < 0.3) weaknesses.push('Low revenue per session');

  if (qualityScore > 0.7) strengths.push('High quality (low no-match)');
  else if (qualityScore < 0.4) weaknesses.push('High no-match rate');

  if (engagementScore > 0.5) strengths.push('Good user engagement');
  else if (engagementScore < 0.2) weaknesses.push('Low user engagement');

  // Recommendations
  if (overallScore < 0.4) {
    recommendations.push('Consider reducing investment in this surface');
    recommendations.push('Investigate quality issues');
  } else if (overallScore > 0.7) {
    recommendations.push('Consider scaling this surface');
    recommendations.push('Analyze success factors for replication');
  }

  return {
    profile: {
      revenueScore: Math.round(revenueScore * 100) / 100,
      qualityScore: Math.round(qualityScore * 100) / 100,
      engagementScore: Math.round(engagementScore * 100) / 100,
      overallScore: Math.round(overallScore * 100) / 100,
    },
    strengths,
    weaknesses,
    recommendations,
  };
}
