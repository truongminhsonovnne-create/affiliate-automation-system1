/**
 * Founder Cockpit Integration
 *
 * Integrates TikTok preview readiness into founder/strategy layers.
 */

import type { TikTokShopPreviewDecisionSupport } from '../types.js';
import logger from '../../../../utils/logger.js';

/**
 * Build preview founder summary
 */
export async function buildTikTokPreviewFounderSummary(params: {
  readinessScore: number;
  stabilityScore: number;
  usefulnessScore: number;
  monetizationStage: string;
  blockerCount: number;
}): Promise<Record<string, unknown>> {
  const { readinessScore, stabilityScore, usefulnessScore, monetizationStage, blockerCount } = params;

  logger.info({ msg: 'Building TikTok preview founder summary' });

  // Determine key metrics
  let healthStatus: string;
  if (blockerCount > 0) {
    healthStatus = 'blocked';
  } else if (readinessScore >= 70) {
    healthStatus = 'healthy';
  } else if (readinessScore >= 50) {
    healthStatus = 'degraded';
  } else {
    healthStatus = 'unhealthy';
  }

  return {
    platform: 'tiktok_shop',
    summary: {
      healthStatus,
      monetizationStage,
      readinessScore,
      stabilityScore,
      usefulnessScore,
      blockerCount,
    },
    keyInsights: generateKeyInsights(params),
    recommendations: generateRecommendations(params),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate key insights
 */
function generateKeyInsights(params: {
  readinessScore: number;
  stabilityScore: number;
  usefulnessScore: number;
  monetizationStage: string;
  blockerCount: number;
}): string[] {
  const insights: string[] = [];

  if (params.blockerCount > 0) {
    insights.push(`${params.blockerCount} critical blockers must be resolved`);
  }

  if (params.readinessScore >= 70) {
    insights.push('Preview is well-positioned for monetization');
  } else if (params.readinessScore < 50) {
    insights.push('Significant improvements needed before monetization');
  }

  if (params.stabilityScore < 60) {
    insights.push('Stability concerns may impact user experience');
  }

  if (params.usefulnessScore < 50) {
    insights.push('Usefulness metrics suggest user value is limited');
  }

  switch (params.monetizationStage) {
    case 'disabled':
      insights.push('Monetization is currently disabled');
      break;
    case 'preview_signal_collection':
      insights.push('Collecting signals for monetization decision');
      break;
    case 'limited_monetization_preview':
      insights.push('Limited monetization is active');
      break;
    case 'production_candidate':
      insights.push('Ready for production monetization review');
      break;
    case 'production_enabled':
      insights.push('Production monetization enabled');
      break;
  }

  return insights;
}

/**
 * Generate recommendations
 */
function generateRecommendations(params: {
  readinessScore: number;
  stabilityScore: number;
  usefulnessScore: number;
  monetizationStage: string;
  blockerCount: number;
}): string[] {
  const recommendations: string[] = [];

  if (params.blockerCount > 0) {
    recommendations.push('Resolve critical blockers before proceeding');
  }

  if (params.stabilityScore < 60) {
    recommendations.push('Focus on improving stability metrics');
  }

  if (params.usefulnessScore < 50) {
    recommendations.push('Improve preview usefulness to increase user value');
  }

  if (params.readinessScore >= 70 && params.monetizationStage === 'disabled') {
    recommendations.push('Consider enabling limited monetization');
  }

  if (params.readinessScore >= 85 && params.monetizationStage === 'limited_monetization_preview') {
    recommendations.push('Review for production candidate status');
  }

  return recommendations;
}

/**
 * Build expansion signals
 */
export async function buildTikTokPreviewExpansionSignals(params: {
  readinessScore: number;
  commercialReadiness: string;
}): Promise<Record<string, unknown>> {
  const { readinessScore, commercialReadiness } = params;

  logger.info({ msg: 'Building TikTok preview expansion signals' });

  // Determine expansion readiness
  let expansionReadiness: string;
  if (readinessScore >= 80 && commercialReadiness === 'ready_for_production') {
    expansionReadiness = 'ready';
  } else if (readinessScore >= 60) {
    expansionReadiness = 'near_term';
  } else {
    expansionReadiness = 'not_ready';
  }

  return {
    platform: 'tiktok_shop',
    expansionSignals: {
      readiness: expansionReadiness,
      readinessScore,
      commercialReadiness,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Build decision inputs
 */
export async function buildTikTokPreviewDecisionInputs(decisionSupport: TikTokShopPreviewDecisionSupport): Promise<Record<string, unknown>> {
  logger.info({ msg: 'Building TikTok preview decision inputs' });

  return {
    platform: 'tiktok_shop',
    decisionInputs: {
      recommendation: decisionSupport.recommendation,
      summary: decisionSupport.summary,
      nextSteps: decisionSupport.nextSteps,
      blockerCount: decisionSupport.blockers.length,
      warningCount: decisionSupport.warnings.length,
      evidence: decisionSupport.evidence,
    },
    generatedAt: new Date().toISOString(),
  };
}
