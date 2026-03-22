/**
 * TikTok Shop Detail Evidence Builder
 * Builds extraction evidence for detail records
 */

import type { TikTokShopExtractionEvidence, TikTokShopExtractedDetailFields } from '../types.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Build detail evidence
 */
export function buildTikTokShopDetailEvidence(
  referenceKey: string,
  extractedFields: TikTokShopExtractedDetailFields
): TikTokShopExtractionEvidence {
  const confidenceScores = calculateFieldConfidence(extractedFields);

  return {
    url: referenceKey,
    timestamp: new Date(),
    selectors: {}, // Would be populated from actual extraction
    fallbackSelectors: {},
    extractionMethod: 'browser_extraction',
    confidenceScores,
  };
}

/**
 * Build field evidence
 */
export function buildTikTokShopFieldEvidence(
  field: string,
  value: unknown,
  extractionMethod: string
): {
  field: string;
  value: unknown;
  extractionMethod: string;
  extractedAt: Date;
  confidence: number;
} {
  return {
    field,
    value,
    extractionMethod,
    extractedAt: new Date(),
    confidence: value !== undefined && value !== null ? 0.8 : 0,
  };
}

/**
 * Build extraction trace
 */
export function buildTikTokShopExtractionTrace(
  referenceKey: string,
  fields: TikTokShopExtractedDetailFields
): {
  referenceKey: string;
  timestamp: Date;
  fields: Array<{
    name: string;
    present: boolean;
    confidence: number;
  }>;
} {
  const fieldNames = [
    'productId', 'productTitle', 'productDescription', 'productUrl',
    'sellerId', 'sellerName', 'sellerRating', 'sellerFollowerCount', 'sellerVerified',
    'price', 'currency', 'originalPrice', 'discountPercentage',
    'categoryId', 'categoryName', 'categoryPath',
    'promotionSignals', 'images', 'videos', 'thumbnails',
  ];

  return {
    referenceKey,
    timestamp: new Date(),
    fields: fieldNames.map((name) => ({
      name,
      present: !!fields[name as keyof TikTokShopExtractedDetailFields],
      confidence: fields[name as keyof TikTokShopExtractedDetailFields] ? 0.8 : 0,
    })),
  };
}

function calculateFieldConfidence(fields: TikTokShopExtractedDetailFields): Record<string, number> {
  const scores: Record<string, number> = {};

  // Product fields
  scores.productId = fields.productId ? 0.9 : 0;
  scores.productTitle = fields.productTitle ? 0.9 : 0;
  scores.productDescription = fields.productDescription ? 0.7 : 0;
  scores.productUrl = fields.productUrl ? 0.9 : 0;

  // Seller fields
  scores.sellerId = fields.sellerId ? 0.8 : 0;
  scores.sellerName = fields.sellerName ? 0.8 : 0;
  scores.sellerRating = fields.sellerRating ? 0.7 : 0;
  scores.sellerFollowerCount = fields.sellerFollowerCount ? 0.6 : 0;
  scores.sellerVerified = fields.sellerVerified !== undefined ? 0.7 : 0;

  // Price fields
  scores.price = fields.price ? 0.9 : 0;
  scores.currency = fields.currency ? 0.9 : 0;
  scores.originalPrice = fields.originalPrice ? 0.7 : 0;
  scores.discountPercentage = fields.discountPercentage ? 0.7 : 0;

  // Category fields
  scores.categoryId = fields.categoryId ? 0.6 : 0;
  scores.categoryName = fields.categoryName ? 0.6 : 0;
  scores.categoryPath = fields.categoryPath ? 0.5 : 0;

  // Promotion fields
  scores.promotionSignals = fields.promotionSignals ? 0.5 : 0;

  // Media fields
  scores.images = fields.images ? 0.8 : 0;
  scores.videos = fields.videos ? 0.6 : 0;
  scores.thumbnails = fields.thumbnails ? 0.6 : 0;

  return scores;
}
