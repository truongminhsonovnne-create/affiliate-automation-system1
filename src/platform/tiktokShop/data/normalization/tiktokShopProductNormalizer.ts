/**
 * TikTok Shop Product Normalizer
 * Normalizes raw product data from various sources to standard format
 */

import type {
  TikTokShopRawProductRecord,
  TikTokShopNormalizedProductRecord,
  TikTokShopNormalizedProductData,
  TikTokShopNormalizationResult,
  TikTokShopDataError,
} from '../types.js';
import { TikTokShopNormalizationStatus } from '../types.js';
import { TIKTOK_SHOP_NORMALIZATION_CONFIG } from '../constants.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Normalize a single product record
 */
export function normalizeTikTokShopProductRecord(
  rawRecord: TikTokShopRawProductRecord
): TikTokShopNormalizedProductRecord {
  const errors: string[] = [];
  const raw = rawRecord.rawData;

  // Determine canonical reference key
  const canonicalKey = determineCanonicalKey(raw);

  if (!canonicalKey) {
    errors.push('Unable to determine canonical reference key');
  }

  // Normalize product fields
  const normalizedData = normalizeProductFields(raw, errors);

  // Determine normalization status
  const hasCriticalErrors = errors.some((e) =>
    e.includes('Missing product identity') || e.includes('Unable to determine')
  );

  return {
    canonicalReferenceKey: canonicalKey || `unknown-${rawRecord.rawId}`,
    normalizedData,
    normalizationStatus: hasCriticalErrors
      ? TikTokShopNormalizationStatus.FAILED
      : TikTokShopNormalizationStatus.NORMALIZED,
    normalizationErrors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Normalize multiple product records
 */
export function normalizeTikTokShopProductRecords(
  rawRecords: TikTokShopRawProductRecord[]
): TikTokShopNormalizationResult {
  logger.info({ msg: 'Normalizing product records', count: rawRecords.length });

  const records: TikTokShopNormalizedProductRecord[] = [];
  const errors: TikTokShopDataError[] = [];

  for (const rawRecord of rawRecords) {
    try {
      const normalized = normalizeTikTokShopProductRecord(rawRecord);
      records.push(normalized);

      if (normalized.normalizationErrors) {
        errors.push(...normalized.normalizationErrors.map((e) => ({
          errorId: `norm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          errorType: 'validation_failed',
          message: e,
          field: 'product',
          timestamp: new Date(),
        })));
      }
    } catch (error) {
      errors.push({
        errorId: `norm-error-${Date.now()}`,
        errorType: 'normalization_failed',
        message: error instanceof Error ? error.message : 'Unknown normalization error',
        timestamp: new Date(),
      });
    }
  }

  const normalizedCount = records.filter(
    (r) => r.normalizationStatus === TikTokShopNormalizationStatus.NORMALIZED
  ).length;
  const failedCount = records.filter(
    (r) => r.normalizationStatus === TikTokShopNormalizationStatus.FAILED
  ).length;

  logger.info({
    msg: 'Normalization complete',
    originalCount: rawRecords.length,
    normalizedCount,
    failedCount,
  });

  return {
    success: failedCount === 0,
    originalCount: rawRecords.length,
    normalizedCount,
    failedCount,
    records,
    errors,
  };
}

/**
 * Determine canonical reference key from raw data
 */
function determineCanonicalKey(raw: Record<string, unknown>): string | null {
  // Try product ID first
  if (raw.productId && typeof raw.productId === 'string') {
    return raw.productId;
  }

  // Try URL
  if (raw.productUrl && typeof raw.productUrl === 'string') {
    // Extract ID from URL if possible
    const urlMatch = raw.productUrl.match(/\/product\/([A-Za-z0-9-]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    return raw.productUrl;
  }

  // Try title as fallback
  if (raw.productTitle && typeof raw.productTitle === 'string') {
    return raw.productTitle.toLowerCase().replace(/\s+/g, '-');
  }

  return null;
}

/**
 * Normalize product fields
 */
function normalizeProductFields(
  raw: Record<string, unknown>,
  errors: string[]
): TikTokShopNormalizedProductData {
  const normalized: TikTokShopNormalizedProductData = {
    rawFields: {},
  };

  // Product identity
  if (raw.productId) {
    normalized.productId = String(raw.productId);
  } else {
    errors.push('Missing recommended field: productId');
  }

  if (raw.productTitle) {
    let title = String(raw.productTitle);
    if (TIKTOK_SHOP_NORMALIZATION_CONFIG.TRIM_STRINGS) {
      title = title.trim();
    }
    if (title.length > TIKTOK_SHOP_NORMALIZATION_CONFIG.MAX_TITLE_LENGTH) {
      title = title.substring(0, TIKTOK_SHOP_NORMALIZATION_CONFIG.MAX_TITLE_LENGTH);
      errors.push('Title truncated to max length');
    }
    normalized.productTitle = title;
  } else {
    errors.push('Missing recommended field: productTitle');
  }

  if (raw.productDescription) {
    let desc = String(raw.productDescription);
    if (TIKTOK_SHOP_NORMALIZATION_CONFIG.TRIM_STRINGS) {
      desc = desc.trim();
    }
    if (desc.length > TIKTOK_SHOP_NORMALIZATION_CONFIG.MAX_DESCRIPTION_LENGTH) {
      desc = desc.substring(0, TIKTOK_SHOP_NORMALIZATION_CONFIG.MAX_DESCRIPTION_LENGTH);
    }
    normalized.productDescription = desc;
  }

  if (raw.productUrl) {
    normalized.productUrl = String(raw.productUrl);
  }

  // Seller fields
  normalized.sellerId = normalizeSellerId(raw.sellerId);
  normalized.sellerName = normalizeSellerName(raw.sellerName);
  normalized.sellerRating = normalizeSellerRating(raw.sellerRating);
  normalized.sellerFollowerCount = normalizeSellerFollowerCount(raw.sellerFollowerCount);
  normalized.sellerVerified = normalizeSellerVerified(raw.sellerVerified);

  // Category fields
  normalized.categoryId = normalizeCategoryId(raw.categoryId);
  normalized.categoryName = normalizeCategoryName(raw.categoryName);
  normalized.categoryPath = normalizeCategoryPath(raw.categoryPath);

  // Price fields
  normalized.price = normalizePrice(raw.price);
  normalized.currency = normalizeCurrency(raw.currency);
  normalized.originalPrice = normalizePrice(raw.originalPrice);
  normalized.discountPercentage = normalizeDiscountPercentage(raw.discountPercentage, raw.price, raw.originalPrice);

  // Inventory
  normalized.stockStatus = normalizeStockStatus(raw.stockStatus);
  normalized.stockQuantity = normalizeStockQuantity(raw.stockQuantity);

  // Rating and reviews
  normalized.rating = normalizeRating(raw.rating);
  normalized.reviewCount = normalizeReviewCount(raw.reviewCount);
  normalized.salesCount = normalizeSalesCount(raw.salesCount);

  // Media
  normalized.images = normalizeImages(raw.images);
  normalized.videos = normalizeVideos(raw.videos);

  // Tags
  normalized.tags = normalizeTags(raw.tags);

  // Store raw fields for reference
  normalized.rawFields = raw;

  return normalized;
}

/**
 * Normalize seller ID
 */
function normalizeSellerId(value: unknown): string | undefined {
  if (!value) return undefined;
  return String(value);
}

/**
 * Normalize seller name
 */
function normalizeSellerName(value: unknown): string | undefined {
  if (!value) return undefined;
  let name = String(value);
  if (TIKTOK_SHOP_NORMALIZATION_CONFIG.TRIM_STRINGS) {
    name = name.trim();
  }
  return name;
}

/**
 * Normalize seller rating
 */
function normalizeSellerRating(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const rating = Number(value);
  if (isNaN(rating) || rating < 0 || rating > 5) return undefined;
  return Math.round(rating * 10) / 10;
}

/**
 * Normalize seller follower count
 */
function normalizeSellerFollowerCount(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const count = Number(value);
  if (isNaN(count) || count < 0) return undefined;
  return Math.floor(count);
}

/**
 * Normalize seller verified
 */
function normalizeSellerVerified(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return undefined;
}

/**
 * Normalize category ID
 */
function normalizeCategoryId(value: unknown): string | undefined {
  if (!value) return undefined;
  return String(value);
}

/**
 * Normalize category name
 */
function normalizeCategoryName(value: unknown): string | undefined {
  if (!value) return undefined;
  let name = String(value);
  if (TIKTOK_SHOP_NORMALIZATION_CONFIG.TRIM_STRINGS) {
    name = name.trim();
  }
  return name;
}

/**
 * Normalize category path
 */
function normalizeCategoryPath(value: unknown): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split('>').map((s) => s.trim()).filter(Boolean);
  }
  return undefined;
}

/**
 * Normalize price
 */
function normalizePrice(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const price = Number(value);
  if (isNaN(price)) return undefined;
  if (price < TIKTOK_SHOP_NORMALIZATION_CONFIG.MIN_PRICE_VALUE) return undefined;
  if (price > TIKTOK_SHOP_NORMALIZATION_CONFIG.MAX_PRICE_VALUE) return undefined;
  return Math.round(price * 100) / 100;
}

/**
 * Normalize currency
 */
function normalizeCurrency(value: unknown): string | undefined {
  if (!value) return undefined;
  return String(value).toUpperCase();
}

/**
 * Normalize discount percentage
 */
function normalizeDiscountPercentage(
  value: unknown,
  price?: number,
  originalPrice?: number
): number | undefined {
  if (value !== undefined && value !== null) {
    const discount = Number(value);
    if (!isNaN(discount) && discount >= 0 && discount <= 100) {
      return Math.round(discount * 10) / 10;
    }
  }

  // Calculate from price and original price if available
  if (price && originalPrice && originalPrice > 0) {
    const discount = ((originalPrice - price) / originalPrice) * 100;
    if (discount >= 0 && discount <= 100) {
      return Math.round(discount * 10) / 10;
    }
  }

  return undefined;
}

/**
 * Normalize stock status
 */
function normalizeStockStatus(value: unknown): string | undefined {
  if (!value) return undefined;
  const status = String(value).toLowerCase();
  const validStatuses = ['in_stock', 'out_of_stock', 'low_stock', 'pre_order', 'discontinued'];
  if (validStatuses.includes(status)) {
    return status;
  }
  return 'unknown';
}

/**
 * Normalize stock quantity
 */
function normalizeStockQuantity(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const quantity = Number(value);
  if (isNaN(quantity) || quantity < 0) return undefined;
  return Math.floor(quantity);
}

/**
 * Normalize rating
 */
function normalizeRating(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const rating = Number(value);
  if (isNaN(rating) || rating < 0 || rating > 5) return undefined;
  return Math.round(rating * 10) / 10;
}

/**
 * Normalize review count
 */
function normalizeReviewCount(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const count = Number(value);
  if (isNaN(count) || count < 0) return undefined;
  return Math.floor(count);
}

/**
 * Normalize sales count
 */
function normalizeSalesCount(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const count = Number(value);
  if (isNaN(count) || count < 0) return undefined;
  return Math.floor(count);
}

/**
 * Normalize images
 */
function normalizeImages(value: unknown): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).filter((url) => url.startsWith('http'));
  }
  if (typeof value === 'string') {
    return value.split(',').map((u) => u.trim()).filter((url) => url.startsWith('http'));
  }
  return undefined;
}

/**
 * Normalize videos
 */
function normalizeVideos(value: unknown): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).filter((url) => url.startsWith('http'));
  }
  return undefined;
}

/**
 * Normalize tags
 */
function normalizeTags(value: unknown): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value.map((v) => String(v).toLowerCase().trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((t) => t.toLowerCase().trim()).filter(Boolean);
  }
  return undefined;
}

/**
 * Normalize seller fields specifically
 */
export function normalizeTikTokShopSellerFields(raw: Record<string, unknown>): {
  sellerId?: string;
  sellerName?: string;
  sellerRating?: number;
  sellerFollowerCount?: number;
  sellerVerified?: boolean;
} {
  return {
    sellerId: normalizeSellerId(raw.sellerId),
    sellerName: normalizeSellerName(raw.sellerName),
    sellerRating: normalizeSellerRating(raw.sellerRating),
    sellerFollowerCount: normalizeSellerFollowerCount(raw.sellerFollowerCount),
    sellerVerified: normalizeSellerVerified(raw.sellerVerified),
  };
}

/**
 * Normalize category fields specifically
 */
export function normalizeTikTokShopCategoryFields(raw: Record<string, unknown>): {
  categoryId?: string;
  categoryName?: string;
  categoryPath?: string[];
} {
  return {
    categoryId: normalizeCategoryId(raw.categoryId),
    categoryName: normalizeCategoryName(raw.categoryName),
    categoryPath: normalizeCategoryPath(raw.categoryPath),
  };
}

/**
 * Normalize price fields specifically
 */
export function normalizeTikTokShopPriceFields(raw: Record<string, unknown>): {
  price?: number;
  currency?: string;
  originalPrice?: number;
  discountPercentage?: number;
} {
  return {
    price: normalizePrice(raw.price),
    currency: normalizeCurrency(raw.currency),
    originalPrice: normalizePrice(raw.originalPrice),
    discountPercentage: normalizeDiscountPercentage(
      raw.discountPercentage,
      raw.price as number | undefined,
      raw.originalPrice as number | undefined
    ),
  };
}
