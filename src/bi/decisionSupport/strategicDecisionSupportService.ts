/**
 * Strategic Decision Support Service
 *
 * Production-grade strategic decision support.
 */

import type { StrategicDecisionRecommendation, StrategicDecisionArea, BiResult } from '../types.js';
import { getGrowthBiMetrics } from '../integration/growthBiIntegration.js';
import { getCommercialBiMetrics } from '../integration/commercialBiIntegration.js';
import { getReleaseReadinessBiMetrics } from '../integration/productGovernanceBiIntegration.js';
import { GROWTH_SURFACE_DECISIONS, EXPERIMENT_DECISIONS, RELEASE_DECISIONS } from '../constants.js';
import { logger } from '../../utils/logger.js';

/**
 * Strategic Decision Support Service
 */
export class StrategicDecisionSupportService {
  async buildStrategicDecisionSupport(params: {
    startDate: Date;
    endDate: Date;
    areas?: StrategicDecisionArea[];
  }): Promise<BiResult<StrategicDecisionRecommendation[]>> {
    try {
      const areas = params.areas ?? [
        'growth_surface_scale', 'growth_surface_pause', 'growth_surface_deindex',
        'experiment_promote', 'experiment_rollback', 'experiment_hold',
        'release_block', 'release_conditional', 'release_approve',
        'remediation_prioritize', 'tuning_review'
      ];

      const recommendations: StrategicDecisionRecommendation[] = [];

      for (const area of areas) {
        const recs = await this.buildRecommendationsByArea(area, params.startDate, params.endDate);
        recommendations.push(...recs);
      }

      return { success: true, data: recommendations };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  private async buildRecommendationsByArea(area: StrategicDecisionArea, startDate: Date, endDate: Date): Promise<StrategicDecisionRecommendation[]> {
    switch (area) {
      case 'growth_surface_scale':
      case 'growth_surface_pause':
      case 'growth_surface_deindex':
        return this.buildGrowthDecisionRecommendations(area, startDate, endDate);
      case 'release_block':
      case 'release_conditional':
      case 'release_approve':
        return this.buildReleaseDecisionRecommendations(area, startDate, endDate);
      default:
        return [];
    }
  }

  private async buildGrowthDecisionRecommendations(area: StrategicDecisionArea, startDate: Date, endDate: Date): Promise<StrategicDecisionRecommendation[]> {
    const metrics = await getGrowthBiMetrics(startDate, endDate);
    const recommendations: StrategicDecisionRecommendation[] = [];

    // Scale recommendation
    if (metrics.totalSessions > GROWTH_SURFACE_DECISIONS.SCALE.min_sessions &&
        metrics.submitRate > GROWTH_SURFACE_DECISIONS.SCALE.min_submit_rate) {
      recommendations.push({
        id: '',
        area: 'growth_surface_scale',
        targetEntityType: 'surface',
        targetEntityId: 'global',
        status: 'active',
        recommendation: 'scale',
        confidence: 0.8,
        priority: 'high',
        evidence: [
          { metric: 'sessions', value: metrics.totalSessions, threshold: GROWTH_SURFACE_DECISIONS.SCALE.min_sessions, direction: 'above' },
          { metric: 'submit_rate', value: metrics.submitRate, threshold: GROWTH_SURFACE_DECISIONS.SCALE.min_submit_rate, direction: 'above' },
        ],
        tradeoffs: [
          { factor: 'infrastructure', positive: false, description: 'Higher traffic requires more resources' },
        ],
        context: 'Growth metrics exceed scale thresholds',
        actionableSteps: ['Review capacity planning', 'Scale infrastructure'],
        createdAt: new Date(),
      });
    }

    // Pause recommendation
    if (metrics.submitRate < GROWTH_SURFACE_DECISIONS.PAUSE.max_submit_rate) {
      recommendations.push({
        id: '',
        area: 'growth_surface_pause',
        targetEntityType: 'surface',
        targetEntityId: 'global',
        status: 'active',
        recommendation: 'pause',
        confidence: 0.7,
        priority: 'medium',
        evidence: [
          { metric: 'submit_rate', value: metrics.submitRate, threshold: GROWTH_SURFACE_DECISIONS.PAUSE.max_submit_rate, direction: 'below' },
        ],
        tradeoffs: [],
        context: 'Submit rate below pause threshold',
        actionableSteps: ['Investigate low engagement', 'Review user flow'],
        createdAt: new Date(),
      });
    }

    return recommendations;
  }

  private async buildReleaseDecisionRecommendations(area: StrategicDecisionArea, startDate: Date, endDate: Date): Promise<StrategicDecisionRecommendation[]> {
    const metrics = await getReleaseReadinessBiMetrics(startDate, endDate);
    const recommendations: StrategicDecisionRecommendation[] = [];

    // Block
    if (metrics.readinessScore < RELEASE_DECISIONS.BLOCK.max_readiness_score ||
        metrics.activeBlockers > RELEASE_DECISIONS.BLOCK.max_blockers) {
      recommendations.push({
        id: '',
        area: 'release_block',
        targetEntityType: 'release',
        targetEntityId: 'current',
        status: 'active',
        recommendation: 'block',
        confidence: 0.9,
        priority: 'critical',
        evidence: [
          { metric: 'readiness_score', value: metrics.readinessScore, threshold: RELEASE_DECISIONS.BLOCK.max_readiness_score, direction: 'below' },
          { metric: 'blockers', value: metrics.activeBlockers, threshold: RELEASE_DECISIONS.BLOCK.max_blockers, direction: 'above' },
        ],
        tradeoffs: [],
        context: 'Release readiness below acceptable threshold',
        actionableSteps: ['Resolve blockers', 'Re-evaluate readiness'],
        createdAt: new Date(),
      });
    }

    // Approve
    else if (metrics.readinessScore >= RELEASE_DECISIONS.APPROVE.min_readiness_score && metrics.activeBlockers === 0) {
      recommendations.push({
        id: '',
        area: 'release_approve',
        targetEntityType: 'release',
        targetEntityId: 'current',
        status: 'active',
        recommendation: 'approve',
        confidence: 0.85,
        priority: 'high',
        evidence: [
          { metric: 'readiness_score', value: metrics.readinessScore, threshold: RELEASE_DECISIONS.APPROVE.min_readiness_score, direction: 'above' },
          { metric: 'blockers', value: metrics.activeBlockers, threshold: 0, direction: 'below' },
        ],
        tradeoffs: [],
        context: 'Release ready for deployment',
        actionableSteps: ['Proceed with deployment', 'Monitor post-release metrics'],
        createdAt: new Date(),
      });
    }

    // Conditional
    else {
      recommendations.push({
        id: '',
        area: 'release_conditional',
        targetEntityType: 'release',
        targetEntityId: 'current',
        status: 'active',
        recommendation: 'conditional_approve',
        confidence: 0.7,
        priority: 'medium',
        evidence: [
          { metric: 'readiness_score', value: metrics.readinessScore, threshold: 0.6, direction: 'above' },
        ],
        tradeoffs: [],
        context: 'Release has minor issues - conditional approval',
        actionableSteps: ['Address warnings', 'Proceed with monitoring'],
        createdAt: new Date(),
      });
    }

    return recommendations;
  }
}

let service: StrategicDecisionSupportService | null = null;

export function getStrategicDecisionSupportService(): StrategicDecisionSupportService {
  if (!service) service = new StrategicDecisionSupportService();
  return service;
}

export async function buildStrategicDecisionSupport(params: {
  startDate: Date;
  endDate: Date;
  areas?: StrategicDecisionArea[];
}): Promise<BiResult<StrategicDecisionRecommendation[]>> {
  return getStrategicDecisionSupportService().buildStrategicDecisionSupport(params);
}
