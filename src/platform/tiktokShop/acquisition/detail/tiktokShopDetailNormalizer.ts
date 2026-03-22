/**
 * TikTok Shop Detail Normalizer
 * Normalizes raw detail records to standard format
 */

import type { TikTokShopExtractedDetailFields } from '../types.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Normalize raw detail record
 */
export function normalizeTikTokShopRawDetailRecord(
  rawPayload: Record<string, unknown>
): TikTokShopExtractedDetailFields {
  logger.info({ msg: 'Normalizing TikTok Shop raw detail record' });

  const fields: TikTokShopExtractedDetailFields = {};

  // Product fields
  fields.productId = normalizeString(rawPayload.productId);
  fields.productTitle = normalizeString(rawPayload.productTitle);
  fields.productDescription = normalizeString(rawPayload.productDescription);
  fields.productUrl = normalizeUrl(rawPayload.productUrl);

  // Seller fields
  fields.sellerId = normalizeString(rawPayload.sellerId);
  fields.sellerName = normalizeString(rawPayload.sellerName);
  fields.sellerRating = normalizeNumber(rawPayload.sellerRating, 0, 5);
  fields.sellerFollowerCount = normalizeNumber(rawPayload.sellerFollowerCount, 0);
  fields.sellerVerified = normalizeBoolean(rawPayload.sellerVerified);

  // Price fields
  fields.price = normalizeNumber(rawPayload.price, 0);
  fields.currency = normalizeString(rawPayload.currency) || 'USD';
  fields.originalPrice = normalizeNumber(rawPayload.originalPrice, 0);
  fields.discountPercentage = normalizeNumber(rawPayload.discountPercentage, 0, 100);

  // Category fields
  fields.categoryId = normalizeString(rawPayload.categoryId);
  fields.categoryName = normalizeString(rawPayload.categoryName);
  fields.categoryPath = normalizeArray(rawPayload.categoryPath);

  // Promotion fields
  fields.promotionSignals = normalizeArray(rawPayload.promotionSignals);

  // Media fields
  fields.images = normalizeStringArray(rawPayload.images);
  fields.videos = normalizeStringArray(rawPayload.videos);
  fields.thumbnails = normalizeStringArray(rawPayload.thumbnails);

  return fields;
}

/**
 * Normalize detail fields
 */
export function normalizeTikTokShopDetailFields(
  raw: Record<string, unknown>
): TikTokShopExtractedDetailFields {
  return normalizeTikTokShopRawDetailRecord(raw);
}

/**
 * Build normalized detail summary
 */
export function buildNormalizedTikTokShopDetailSummary(
  fields: TikTokShopExtractedDetailFields
): {
  fieldCount: number;
  missingFields: string[];
  coveragePercentage: number;
} {
  const allFields = [
    'productId', 'productTitle', 'productDescription', 'productUrl',
    'sellerId', 'sellerName', 'sellerRating', 'sellerFollowerCount', 'sellerVerified',
    'price', 'currency', 'originalPrice', 'discountPercentage',
    'categoryId', 'categoryName', 'categoryPath',
    'promotionSignals', 'images', 'videos', 'thumbnails',
  ];

  const presentFields = allFields.filter((f) => fields[f as keyof TikTokShopExtractedDetailFields]);
  const missingFields = allFields.filter((f) => !fields[f as keyof TikTokShopExtractedDetailFields]);

  return {
    fieldCount: presentFields.length,
    missingFields,
    coveragePercentage: (presentFields.length / allFields.length) * 100,
  };
}

function normalizeString(value: unknown): string | undefined {
  if (!value) return undefined;
  return String(value).trim() || undefined;
}

function normalizeNumber(value: unknown, min: number, max?: number): number | undefined {
  if (value === undefined || value === null) return undefined;
  const num = Number(value);
  if (isNaN(num)) return undefined;
  if (num < min) return min;
  if (max !== undefined && num > max) return max;
  return num;
}

function normalizeBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return undefined;
}

function normalizeUrl(value: unknown): string | undefined {
  if (!value) return undefined;
  const url = String(value);
  if (!url.startsWith('http')) return undefined;
  return url;
}

function normalizeArray(value: unknown): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === 'string') {
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return undefined;
}

function normalizeStringArray(value: unknown): string[] | undefined {
  return normalizeArray(value);
}
