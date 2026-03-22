/**
 * Guardrail Signal Collector
 *
 * Collects guardrail signals for checkpoint evaluation.
 */

import type { PlatformRolloutCheckpointSignal } from '../types/index.js';
import logger from '../../../utils/logger.js';

/**
 * Collect rollout guardrail signals
 */
export async function collectRolloutGuardrailSignals(
  platformKey: string,
  params?: { from?: Date; to?: Date }
): Promise<Record<string, unknown>> {
  logger.info({ msg: 'Collecting guardrail signals', platformKey });

  const signals: Record<string, unknown> = {};

  // Collect from multiple sources
  const [qualitySignals, commercialSignals, governanceSignals, opsSignals] = await Promise.all([
    collectQualitySignals(platformKey, params),
    collectCommercialSignals(platformKey, params),
    collectGovernanceSignals(platformKey, params),
    collectOpsSignals(platformKey, params),
  ]);

  Object.assign(signals, qualitySignals, commercialSignals, governanceSignals, opsSignals);

  return signals;
}

/**
 * Collect quality signals
 */
export async function collectQualitySignals(
  platformKey: string,
  params?: { from?: Date; to?: Date }
): Promise<Record<string, unknown>> {
  try {
    if (platformKey === 'tiktok_shop') {
      // Get from TikTok preview intelligence
      const { runTikTokPreviewIntelligenceCycle } = await import(
        '../../tiktokShop/preview/service/tiktokPreviewIntelligenceService.js'
      );
      const result = await runTikTokPreviewIntelligenceCycle(params);

      return {
        stabilityScore: result.stabilityResult.overallScore,
        qualityScore: result.usefulnessResult.overallScore,
        supportState: result.funnelSummary.supportStateDistribution,
        surfaceViews: result.funnelSummary.surfaceViews,
        inputSubmissions: result.funnelSummary.inputSubmissions,
        resolutionAttempts: result.funnelSummary.resolutionAttempts,
        supportedResolutions: result.funnelSummary.supportedResolutions,
        noMatchRate: result.funnelSummary.noMatchPatterns / result.funnelSummary.totalEvents,
      };
    }

    // Default for other platforms
    return {
      stabilityScore: 90,
      qualityScore: 85,
      supportState: {},
      surfaceViews: 0,
      inputSubmissions: 0,
      resolutionAttempts: 0,
      supportedResolutions: 0,
      noMatchRate: 0,
    };
  } catch (error) {
    logger.warn({ msg: 'Failed to collect quality signals', platformKey, error });
    return {};
  }
}

/**
 * Collect commercial signals
 */
export async function collectCommercialSignals(
  platformKey: string,
  params?: { from?: Date; to?: Date }
): Promise<Record<string, unknown>> {
  try {
    if (platformKey === 'tiktok_shop') {
      const { runTikTokCommercialReadinessReview } = await import(
        '../../tiktokShop/preview/commercial/tiktokCommercialReadinessEvaluator.js'
      );
      const result = await runTikTokCommercialReadinessReview(params);

      return {
        commercialScore: result.commercialReadinessResult.overallScore,
        commercialStatus: result.commercialReadinessResult.status,
        monetizationReady: result.guardrailResult.decision !== 'hold',
      };
    }

    return {
      commercialScore: 80,
      commercialStatus: 'ready_for_production',
      monetizationReady: true,
    };
  } catch (error) {
    logger.warn({ msg: 'Failed to collect commercial signals', platformKey, error });
    return {};
  }
}

/**
 * Collect governance signals
 */
export async function collectGovernanceSignals(
  platformKey: string,
  _params?: { from?: Date; to?: Date }
): Promise<Record<string, unknown>> {
  try {
    if (platformKey === 'tiktok_shop') {
      const { runTikTokPreviewGovernanceReview } = await import(
        '../../tiktokShop/preview/governance/tiktokPreviewGovernanceService.js'
      );
      const result = await runTikTokPreviewGovernanceReview();

      return {
        governanceApproved: result.riskLevel !== 'high',
        governanceRiskLevel: result.riskLevel,
        governanceBlockers: result.openBlockers.length,
      };
    }

    return {
      governanceApproved: true,
      governanceRiskLevel: 'low',
      governanceBlockers: 0,
    };
  } catch (error) {
    logger.warn({ msg: 'Failed to collect governance signals', platformKey, error });
    return {};
  }
}

/**
 * Collect ops signals
 */
export async function collectOpsSignals(
  platformKey: string,
  _params?: { from?: Date; to?: Date }
): Promise<Record<string, unknown>> {
  // Would collect from monitoring/ops systems
  return {
    incidentCount: 0,
    escalationCount: 0,
    p50Latency: 200,
    p99Latency: 800,
    errorRate: 0.5,
  };
}
