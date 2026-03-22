/**
 * TikTok Shop Data Foundation Integration
 */

import type { TikTokShopDetailExtractionResult } from '../types.js';
import { logger } from '../../../../utils/logger.js';

export async function persistTikTokShopAcquisitionOutputs(
  result: TikTokShopDetailExtractionResult
): Promise<void> {
  logger.info({ msg: 'Persisting TikTok Shop acquisition outputs', referenceKey: result.referenceKey });
}

export async function buildTikTokShopSnapshotFromDetailExtraction(
  result: TikTokShopDetailExtractionResult
): Promise<Record<string, unknown>> {
  return {
    canonicalReferenceKey: result.referenceKey,
    productPayload: result.extractedFields,
    normalizationStatus: 'normalized',
    enrichmentStatus: 'pending',
    freshnessStatus: 'fresh',
    qualityScore: result.qualityScore,
    extractedAt: new Date().toISOString(),
  };
}

export async function triggerTikTokShopContextEnrichmentFromDetail(
  referenceKey: string
): Promise<void> {
  logger.info({ msg: 'Triggering context enrichment', referenceKey });
}
