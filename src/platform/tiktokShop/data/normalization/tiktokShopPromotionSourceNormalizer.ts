/**
 * TikTok Shop Promotion Source Normalizer
 * Normalizes promotion source data for compatibility mapping
 */

import type {
  TikTokShopPromotionSourceRecord,
  TikTokShopNormalizedPromotionData,
  TikTokShopPromotionConstraints,
  TikTokShopDataError,
} from '../types.js';
import { TikTokShopNormalizationStatus } from '../types.js';
import { TIKTOK_SHOP_PROMOTION_SOURCE_CONFIG } from '../constants.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Normalize a single promotion source record
 */
export function normalizeTikTokShopPromotionSourceRecord(
  rawRecord: TikTokShopPromotionSourceRecord
): {
  normalized: TikTokShopNormalizedPromotionData | null;
  status: TikTokShopNormalizationStatus;
  errors: string[];
} {
  const raw = rawRecord.rawPayload;
  const errors: string[] = [];

  // Validate required fields
  const hasRequiredFields = validatePromotionRequiredFields(raw);

  if (!hasRequiredFields) {
    errors.push('Missing required promotion fields');
    return {
      normalized: null,
      status: TikTokShopNormalizationStatus.FAILED,
      errors,
    };
  }

  // Normalize promotion data
  const normalized = normalizePromotionData(raw);

  return {
    normalized,
    status: TikTokShopNormalizationStatus.NORMALIZED,
    errors: [],
  };
}

/**
 * Normalize multiple promotion source records
 */
export function normalizeTikTokPromotionSourceRecords(
  rawRecords: TikTokShopPromotionSourceRecord[]
): {
  success: boolean;
  originalCount: number;
  normalizedCount: number;
  failedCount: number;
  records: TikTokShopNormalizedPromotionData[];
  errors: TikTokShopDataError[];
} {
  logger.info({ msg: 'Normalizing promotion source records', count: rawRecords.length });

  const records: TikTokShopNormalizedPromotionData[] = [];
  const errors: TikTokShopDataError[] = [];

  for (const rawRecord of rawRecords) {
    const result = normalizeTikTokShopPromotionSourceRecord(rawRecord);

    if (result.normalized) {
      records.push(result.normalized);
    } else {
      errors.push({
        errorId: `promo-norm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        errorType: 'normalization_failed',
        message: result.errors.join('; '),
        field: 'promotion',
        timestamp: new Date(),
      });
    }
  }

  return {
    success: errors.length === 0,
    originalCount: rawRecords.length,
    normalizedCount: records.length,
    failedCount: rawRecords.length - records.length,
    records,
    errors,
  };
}

/**
 * Validate promotion required fields
 */
function validatePromotionRequiredFields(raw: Record<string, unknown>): boolean {
  for (const field of TIKTOK_SHOP_PROMOTION_SOURCE_CONFIG.REQUIRED_PROMOTION_FIELDS) {
    if (!raw[field]) {
      return false;
    }
  }
  return true;
}

/**
 * Normalize promotion data
 */
function normalizePromotionData(raw: Record<string, unknown>): TikTokShopNormalizedPromotionData {
  return {
    promotionId: String(raw.promotionId),
    promotionType: normalizePromotionType(raw.promotionType),
    discountValue: normalizeDiscountValue(raw.discountValue),
    discountType: normalizeDiscountType(raw.discountType),
    minPurchaseAmount: normalizeMinPurchaseAmount(raw.minPurchaseAmount),
    maxDiscountAmount: normalizeMaxDiscountAmount(raw.maxDiscountAmount),
    applicableCategories: normalizeApplicableCategories(raw.applicableCategories),
    applicableProducts: normalizeApplicableProducts(raw.applicableProducts),
    stackable: normalizeStackable(raw.stackable),
    validFrom: normalizeValidFrom(raw.validFrom),
    validUntil: normalizeValidUntil(raw.validUntil),
    rawData: raw,
  };
}

/**
 * Normalize promotion type
 */
function normalizePromotionType(value: unknown): string {
  if (!value) return 'unknown';

  const type = String(value).toLowerCase().replace(/\s+/g, '_');

  // Map to supported types
  const supportedTypes = TIKTOK_SHOP_PROMOTION_SOURCE_CONFIG.SUPPORTED_PROMOTION_TYPES;

  if (supportedTypes.includes(type)) {
    return type;
  }

  // Try to map similar types
  const typeMappings: Record<string, string> = {
    discount: 'discount',
    sale: 'flash_sale',
    flash: 'flash_sale',
    bundle: 'bundle_deal',
    bogo: 'buy_one_get_one',
    free_shipping: 'free_shipping',
    voucher: 'voucher',
    coupon: 'voucher',
    promo: 'discount',
    seasonal: 'seasonal',
    new_user: 'new_user',
    member: 'member',
  };

  return typeMappings[type] || 'unknown';
}

/**
 * Normalize discount value
 */
function normalizeDiscountValue(value: unknown): number {
  if (value === undefined || value === null) return 0;
  const discount = Number(value);
  return isNaN(discount) ? 0 : Math.abs(discount);
}

/**
 * Normalize discount type
 */
function normalizeDiscountType(value: unknown): 'percentage' | 'fixed' {
  if (!value) return 'percentage';

  const type = String(value).toLowerCase();
  if (type === 'percent' || type === '%' || type === 'percentage') {
    return 'percentage';
  }

  return 'fixed';
}

/**
 * Normalize minimum purchase amount
 */
function normalizeMinPurchaseAmount(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const amount = Number(value);
  if (isNaN(amount) || amount < 0) return undefined;
  return Math.round(amount * 100) / 100;
}

/**
 * Normalize maximum discount amount
 */
function normalizeMaxDiscountAmount(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const amount = Number(value);
  if (isNaN(amount) || amount < 0) return undefined;
  return Math.round(amount * 100) / 100;
}

/**
 * Normalize applicable categories
 */
function normalizeApplicableCategories(value: unknown): string[] | undefined {
  if (!value) return undefined;

  if (Array.isArray(value)) {
    return value.map((v) => String(v)).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(',').map((c) => c.trim()).filter(Boolean);
  }

  return undefined;
}

/**
 * Normalize applicable products
 */
function normalizeApplicableProducts(value: unknown): string[] | undefined {
  if (!value) return undefined;

  if (Array.isArray(value)) {
    return value.map((v) => String(v)).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(',').map((p) => p.trim()).filter(Boolean);
  }

  return undefined;
}

/**
 * Normalize stackable flag
 */
function normalizeStackable(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    return lower === 'true' || lower === 'yes' || lower === '1';
  }
  return false;
}

/**
 * Normalize valid from date
 */
function normalizeValidFrom(value: unknown): Date | undefined {
  if (!value) return undefined;

  if (value instanceof Date) return value;

  const date = new Date(String(value));
  return isNaN(date.getTime()) ? undefined : date;
}

/**
 * Normalize valid until date
 */
function normalizeValidUntil(value: unknown): Date | undefined {
  if (!value) return undefined;

  if (value instanceof Date) return value;

  const date = new Date(String(value));
  return isNaN(date.getTime()) ? undefined : date;
}

/**
 * Normalize promotion source constraints
 */
export function normalizeTikTokPromotionSourceConstraints(
  raw: Record<string, unknown>
): TikTokShopPromotionConstraints {
  return {
    minPurchaseAmount: normalizeMinPurchaseAmount(raw.minPurchaseAmount),
    maxDiscountAmount: normalizeMaxDiscountAmount(raw.maxDiscountAmount),
    applicableCategories: normalizeApplicableCategories(raw.applicableCategories),
    applicableProducts: normalizeApplicableProducts(raw.applicableProducts),
    stackable: normalizeStackable(raw.stackable),
  };
}

/**
 * Check if promotion is compatible with platform-neutral contract
 */
export function checkPromotionCompatibility(
  normalized: TikTokShopNormalizedPromotionData
): {
  compatible: boolean;
  compatibilityScore: number;
  missingFields: string[];
} {
  const requiredFields = ['promotionId', 'promotionType', 'discountValue'];
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (!normalized[field as keyof TikTokShopNormalizedPromotionData]) {
      missingFields.push(field);
    }
  }

  const compatible = missingFields.length === 0;
  const compatibilityScore = compatible ? 1.0 : (requiredFields.length - missingFields.length) / requiredFields.length;

  return {
    compatible,
    compatibilityScore,
    missingFields,
  };
}

/**
 * Determine promotion quality score
 */
export function getPromotionQualityScore(
  normalized: TikTokShopNormalizedPromotionData
): number {
  let score = 0;
  let maxScore = 0;

  // Base fields
  const baseFields = ['promotionId', 'promotionType', 'discountValue', 'discountType'];
  for (const field of baseFields) {
    maxScore += 1;
    if (normalized[field as keyof TikTokShopNormalizedPromotionData]) {
      score += 1;
    }
  }

  // Constraint fields
  const constraintFields = ['minPurchaseAmount', 'maxDiscountAmount', 'stackable'];
  for (const field of constraintFields) {
    maxScore += 0.5;
    if (normalized[field as keyof TikTokShopNormalizedPromotionData]) {
      score += 0.5;
    }
  }

  // Validity fields
  const validityFields = ['validFrom', 'validUntil'];
  for (const field of validityFields) {
    maxScore += 0.5;
    if (normalized[field as keyof TikTokShopNormalizedPromotionData]) {
      score += 0.5;
    }
  }

  // Applicability fields
  const applicabilityFields = ['applicableCategories', 'applicableProducts'];
  for (const field of applicabilityFields) {
    maxScore += 0.5;
    if ((normalized[field as keyof TikTokShopNormalizedPromotionData] as string[])?.length) {
      score += 0.5;
    }
  }

  return maxScore > 0 ? score / maxScore : 0;
}
