/**
 * TikTok Shop Domain Service - Main Orchestrator
 */

import { resolveTikTokShopProductReference } from '../reference/tiktokShopReferenceResolver.js';
import { buildTikTokShopSupportSummary, evaluateTikTokShopSupportLevel } from '../platformSupport/tiktokShopSupportLevelService.js';
import { detectTikTokShopCapabilityGaps, buildTikTokShopBacklogItems } from '../platformSupport/tiktokShopCapabilityGapService.js';
import { buildTikTokShopContextCompatibilitySummary } from '../context/tiktokShopContextCompatibility.js';
import { buildTikTokShopPromotionCompatibilitySummary } from '../promotions/tiktokShopPromotionCompatibilityMapper.js';
import { logger } from '../../../utils/logger.js';

/**
 * Build TikTok Shop reference intelligence report
 */
export async function buildTikTokShopReferenceIntelligenceReport(input: string) {
  const result = resolveTikTokShopProductReference(input);

  return {
    success: result.success,
    reference: result.data,
    metadata: result.metadata,
    error: result.error,
  };
}

/**
 * Build TikTok Shop domain readiness report
 */
export async function buildTikTokShopDomainReadinessReport() {
  const capabilities = {
    referenceParsing: 0.6,
    contextModeling: 0.4,
    promotionCompatibility: 0.3,
    integration: 0.2,
  };

  const { supportLevel, scores, notSupportedReasons } = evaluateTikTokShopSupportLevel(capabilities);
  const summary = buildTikTokShopSupportSummary(supportLevel, scores);
  const gaps = detectTikTokShopCapabilityGaps(capabilities);
  const backlog = buildTikTokShopBacklogItems(gaps);

  logger.info({
    msg: 'TikTok Shop domain readiness evaluated',
    supportLevel,
    scores,
  });

  return {
    status: supportLevel === 'supported' ? 'ready' : supportLevel === 'partial' ? 'proceed_cautiously' : 'not_ready',
    score: scores,
    supportLevel: summary,
    blockers: gaps.filter(g => g.priority === 'critical').length,
    warnings: gaps.filter(g => g.priority !== 'critical').length,
    gaps,
    backlog,
    notSupportedReasons,
  };
}

/**
 * Build TikTok Shop promotion compatibility report
 */
export async function buildTikTokShopPromotionCompatibilityReport(promotions: any[]) {
  const summary = buildTikTokShopPromotionCompatibilitySummary(promotions);

  return {
    total: summary.total,
    fullyCompatible: summary.fullyCompatible,
    partiallyCompatible: summary.partiallyCompatible,
    notCompatible: summary.notCompatible,
    averageScore: summary.averageScore,
    commonGaps: summary.commonGaps,
    recommendations: summary.recommendations,
  };
}

/**
 * Build TikTok Shop decision support
 */
export async function buildTikTokShopDecisionSupport() {
  const readiness = await buildTikTokShopDomainReadinessReport();

  const recommendation = readiness.status === 'ready'
    ? 'proceed'
    : readiness.status === 'proceed_cautiously'
      ? 'hold'
      : 'not_ready';

  return {
    recommendation,
    readinessStatus: readiness.status,
    blockers: readiness.blockers,
    warnings: readiness.warnings,
    nextSteps: readiness.backlog?.slice(0, 5).map(b => b.title) || [],
    summary: `TikTok Shop domain layer ${readiness.status}. ${readiness.blockers} blockers, ${readiness.warnings} warnings.`,
  };
}
