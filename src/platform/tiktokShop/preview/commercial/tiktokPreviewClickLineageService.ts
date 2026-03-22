/**
 * TikTok Shop Preview Click Lineage Service
 *
 * Manages click lineage for preview-level commercial attribution.
 */

import { tiktokPreviewClickLineageRepository } from '../repositories/tiktokPreviewClickLineageRepository.js';
import type {
  TikTokShopPreviewClickLineage,
  CreateTikTokShopPreviewClickLineageInput,
  TikTokShopPreviewSupportState,
  TikTokShopPreviewStage,
} from '../types.js';
import logger from '../../../../utils/logger.js';

/**
 * Create click lineage record
 */
export async function createTikTokPreviewClickLineage(
  input: CreateTikTokShopPreviewClickLineageInput
): Promise<TikTokShopPreviewClickLineage> {
  logger.info({
    msg: 'Creating TikTok preview click lineage',
    supportState: input.supportState,
    platformStage: input.platformStage,
  });

  const lineage = await tiktokPreviewClickLineageRepository.createLineage(input);

  logger.info({
    msg: 'TikTok preview click lineage created',
    lineageKey: lineage.lineageKey,
    id: lineage.id,
  });

  return lineage;
}

/**
 * Build click lineage from preview session
 */
export async function buildTikTokPreviewClickLineage(
  previewSessionId: string,
  supportState: TikTokShopPreviewSupportState,
  platformStage: TikTokShopPreviewStage,
  resolutionContext?: Record<string, unknown>
): Promise<TikTokShopPreviewClickLineage> {
  const input: CreateTikShopPreviewClickLineageInput = {
    previewSessionId,
    supportState,
    platformStage,
    resolutionContext,
    clickPayload: {
      source: 'tiktok_shop_preview',
      createdAt: new Date().toISOString(),
      context: resolutionContext,
    },
  };

  return createTikTokPreviewClickLineage(input);
}

/**
 * Link preview resolution to outbound click
 */
export async function linkPreviewResolutionToOutboundClick(
  lineageKey: string,
  outboundClickData: Record<string, unknown>
): Promise<TikTokShopPreviewClickLineage | null> {
  logger.info({
    msg: 'Linking preview resolution to outbound click',
    lineageKey,
  });

  const lineage = await tiktokPreviewClickLineageRepository.getLineageByKey(lineageKey);

  if (!lineage) {
    logger.warn({ msg: 'Lineage not found', lineageKey });
    return null;
  }

  // In production, would update the lineage with click data
  // For now, return existing lineage
  return lineage;
}

/**
 * Get click lineage for preview session
 */
export async function getPreviewSessionLineage(
  previewSessionId: string
): Promise<TikTokShopPreviewClickLineage[]> {
  return tiktokPreviewClickLineageRepository.getLineagesBySession(previewSessionId);
}

/**
 * Get lineage by key
 */
export async function getLineageByKey(lineageKey: string): Promise<TikTokShopPreviewClickLineage | null> {
  return tiktokPreviewClickLineageRepository.getLineageByKey(lineageKey);
}

/**
 * Get lineage stats
 */
export async function getLineageStats(from?: Date, to?: Date): Promise<{
  total: number;
  bySupportState: Record<string, number>;
  byPlatformStage: Record<string, number>;
}> {
  return tiktokPreviewClickLineageRepository.getLineageStats(from, to);
}

/**
 * Evaluate lineage completeness
 */
export function evaluateLineageCompleteness(
  lineage: TikTokShopPreviewClickLineage
): { complete: boolean; score: number; missingFields: string[] } {
  const requiredFields = [
    'previewSessionId',
    'supportState',
    'platformStage',
    'clickPayload',
  ];

  const missingFields: string[] = [];
  let score = 50; // Base score

  // Check required fields
  for (const field of requiredFields) {
    if (!lineage[field as keyof TikTokShopPreviewClickLineage]) {
      missingFields.push(field);
    }
  }

  // Score based on completeness
  if (missingFields.length === 0) {
    score = 100;
  } else {
    score = Math.max(0, 100 - missingFields.length * 20);
  }

  // Check click payload
  if (lineage.clickPayload) {
    const payloadFields = ['source', 'createdAt'];
    const missingPayloadFields = payloadFields.filter(
      (f) => !(lineage.clickPayload as Record<string, unknown>)[f]
    );

    if (missingPayloadFields.length > 0) {
      score -= 10;
      missingFields.push(...missingPayloadFields.map((f) => `clickPayload.${f}`));
    }
  }

  return {
    complete: missingFields.length === 0,
    score: Math.max(0, score),
    missingFields,
  };
}

/**
 * Calculate overall lineage confidence
 */
export function calculateLineageConfidence(
  lineages: TikTokShopPreviewClickLineage[]
): { confidence: number; level: string; factors: Record<string, number> } {
  if (lineages.length === 0) {
    return {
      confidence: 0,
      level: 'no_data',
      factors: {},
    };
  }

  const factors: Record<string, number> = {};

  // Calculate completeness scores
  const completenessScores = lineages.map((l) => evaluateLineageCompleteness(l).score);
  factors.completeness = completenessScores.reduce((a, b) => a + b, 0) / lineages.length;

  // Check support state distribution
  const supportStates = lineages.map((l) => l.supportState);
  const supportedCount = supportStates.filter(
    (s) => s === 'supported' || s === 'production_enabled'
  ).length;
  factors.supportStateQuality = (supportedCount / lineages.length) * 100;

  // Check platform stage distribution
  const stages = lineages.map((l) => l.platformStage);
  const productionStages = stages.filter(
    (s) => s === 'production_candidate' || s === 'limited_public_preview'
  ).length;
  factors.platformMaturity = (productionStages / lineages.length) * 100;

  // Calculate overall confidence
  const weights = {
    completeness: 0.5,
    supportStateQuality: 0.3,
    platformMaturity: 0.2,
  };

  const confidence =
    factors.completeness * weights.completeness +
    factors.supportStateQuality * weights.supportStateQuality +
    factors.platformMaturity * weights.platformMaturity;

  // Determine level
  let level: string;
  if (confidence >= 80) {
    level = 'high';
  } else if (confidence >= 50) {
    level = 'medium';
  } else {
    level = 'low';
  }

  return {
    confidence,
    level,
    factors,
  };
}

/**
 * Build lineage summary for BI
 */
export function buildLineageSummary(
  lineages: TikTokShopPreviewClickLineage[]
): Record<string, unknown> {
  const stats = calculateLineageConfidence(lineages);

  const bySupportState: Record<string, number> = {};
  const byPlatformStage: Record<string, number> = {};

  for (const lineage of lineages) {
    bySupportState[lineage.supportState] = (bySupportState[lineage.supportState] || 0) + 1;
    byPlatformStage[lineage.platformStage] = (byPlatformStage[lineage.platformStage] || 0) + 1;
  }

  return {
    totalLineages: lineages.length,
    confidence: stats.confidence,
    confidenceLevel: stats.level,
    factors: stats.factors,
    bySupportState,
    byPlatformStage,
    generatedAt: new Date().toISOString(),
  };
}
