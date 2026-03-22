/**
 * Multi-Platform Foundation Service
 *
 * Main orchestrator service for multi-platform expansion.
 */

import type { PlatformReadinessScore, PlatformReadinessStatus } from '../types.js';
import { initializeShopeePlatform, getPlatformSummary } from '../registry/platformRegistryService.js';
import { evaluatePlatformReadiness, evaluateTikTokShopReadiness } from '../readiness/platformReadinessEvaluator.js';
import { buildPlatformExpansionBacklog, getPlatformBacklogSummary } from '../backlog/platformExpansionBacklogService.js';
import { buildPlatformExpansionDecisionSupport } from '../strategy/platformExpansionDecisionSupport.js';
import { getPlatformReadinessReviewRepository } from '../repositories/platformReadinessReviewRepository.js';
import { logger } from '../../utils/logger.js';

/**
 * Build multi-platform foundation report
 */
export async function buildMultiPlatformFoundationReport(): Promise<{
  platforms: {
    total: number;
    active: number;
    preparing: number;
    planned: number;
    bySupportLevel: Record<string, number>;
  };
  tiktokShopReadiness: {
    status: PlatformReadinessStatus;
    score: PlatformReadinessScore;
    blockers: number;
    warnings: number;
  };
  backlog: {
    total: number;
    pending: number;
    overdue: number;
  };
}> {
  // Get platform summary
  const platformSummary = await getPlatformSummary();

  // Get TikTok Shop readiness
  const tiktokReadiness = await evaluateTikTokShopReadiness();

  // Get backlog summary
  const backlogSummary = await getPlatformBacklogSummary('tiktok_shop');

  return {
    platforms: platformSummary,
    tiktokShopReadiness: {
      status: tiktokReadiness.status,
      score: tiktokReadiness.score,
      blockers: tiktokReadiness.blockers.length,
      warnings: tiktokReadiness.warnings.length,
    },
    backlog: {
      total: backlogSummary.total,
      pending: backlogSummary.pending,
      overdue: backlogSummary.overdue,
    },
  };
}

/**
 * Run platform readiness review
 */
export async function runPlatformReadinessReview(
  platformKey: string,
  reviewType: 'initial' | 'incremental' | 'pre_launch' | 'post_launch' | 'quarterly'
): Promise<{
  reviewId: string;
  status: PlatformReadinessStatus;
  score: PlatformReadinessScore;
  blockers: number;
  warnings: number;
}> {
  // Initialize Shopee if needed
  await initializeShopeePlatform();

  // Evaluate readiness
  const result = await evaluatePlatformReadiness(platformKey, {});

  // Create backlog from blockers
  if (result.blockers.length > 0) {
    const gaps = result.blockers.map(b => ({
      area: b.category,
      missingDependencies: b.blockingCapabilities,
    }));
    await buildPlatformExpansionBacklog(platformKey, gaps);
  }

  // Persist review
  const repo = getPlatformReadinessReviewRepository();
  const review = await repo.create({
    platformKey,
    reviewType,
    readinessStatus: result.status,
    readinessScore: result.score,
    blockerCount: result.blockers.length,
    warningCount: result.warnings.length,
    reviewPayload: {
      blockers: result.blockers,
      warnings: result.warnings,
    },
    createdBy: 'system',
  });

  // Finalize review
  await repo.finalize(review.id, result.status, result.score);

  logger.info({
    msg: 'Platform readiness review completed',
    platformKey,
    reviewType,
    status: result.status,
    score: result.score.overall,
  });

  return {
    reviewId: review.id,
    status: result.status,
    score: result.score,
    blockers: result.blockers.length,
    warnings: result.warnings.length,
  };
}

/**
 * Run TikTok Shop readiness review
 */
export async function runTikTokShopReadinessReview(): Promise<{
  reviewId: string;
  status: PlatformReadinessStatus;
  score: PlatformReadinessScore;
  blockers: number;
  warnings: number;
  summary: string;
}> {
  return runPlatformReadinessReview('tiktok_shop', 'initial');
}

/**
 * Build platform expansion backlog report
 */
export async function buildPlatformExpansionBacklogReport(platformKey: string): Promise<{
  platformKey: string;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  byPriority: Record<string, number>;
  items: Array<{
    id: string;
    title: string;
    priority: string;
    status: string;
    dueAt: string | null;
  }>;
}> {
  const summary = await getPlatformBacklogSummary(platformKey);
  const { getPlatformExpansionBacklog } = await import('../backlog/platformExpansionBacklogService.js');
  const items = await getPlatformExpansionBacklog(platformKey);

  return {
    platformKey,
    total: summary.total,
    pending: summary.pending,
    inProgress: summary.inProgress,
    completed: summary.completed,
    overdue: summary.overdue,
    byPriority: summary.byPriority,
    items: items.map(item => ({
      id: item.id,
      title: item.backlogPayload.title,
      priority: item.priority,
      status: item.backlogStatus,
      dueAt: item.dueAt?.toISOString() || null,
    })),
  };
}

/**
 * Build platform decision support report
 */
export async function buildPlatformDecisionSupportReport(platformKey: string): Promise<{
  platformKey: string;
  recommendation: 'proceed' | 'hold' | 'not_ready';
  confidence: number;
  score: PlatformReadinessScore;
  blockers: number;
  warnings: number;
  prerequisites: string[];
  risks: string[];
  nextSteps: string[];
}> {
  const decision = await buildPlatformExpansionDecisionSupport(platformKey);

  return {
    platformKey,
    recommendation: decision.recommendation,
    confidence: decision.confidence,
    score: decision.readinessScore,
    blockers: decision.blockers.length,
    warnings: decision.warnings.length,
    prerequisites: decision.prerequisites,
    risks: decision.risks,
    nextSteps: decision.nextSteps,
  };
}
