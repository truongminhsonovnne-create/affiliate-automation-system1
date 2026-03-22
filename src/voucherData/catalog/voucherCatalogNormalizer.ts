// =============================================================================
// Voucher Catalog Normalizer
// Production-grade normalizer for voucher data from various sources
// =============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  VoucherNormalizedRecord,
  VoucherRawInput,
  VoucherPlatform,
  VoucherDiscountType,
  VoucherScope,
  VoucherConstraint,
  VoucherFreshnessStatus,
} from '../types.js';
import { DISCOUNT_TYPES, SCOPE_TYPES, FRESHNESS } from '../constants.js';

export interface NormalizeOptions {
  sourceId: string;
  platform?: VoucherPlatform;
  defaultValidityDays?: number;
  preserveRawData?: boolean;
  strictMode?: boolean;
}

interface NormalizationWarning {
  code: string;
  message: string;
  field?: string;
}

// =============================================================================
// Main Normalization Functions
// =============================================================================

/**
 * Normalize a single voucher record from raw input
 */
export function normalizeVoucherRecord(
  raw: VoucherRawInput,
  options: NormalizeOptions
): { record: VoucherNormalizedRecord; warnings: NormalizationWarning[] } {
  const warnings: NormalizationWarning[] = [];

  // Extract and normalize core fields
  const externalId = extractExternalId(raw, warnings);
  const code = normalizeVoucherCode(raw, warnings);
  const title = normalizeVoucherTitle(raw, warnings);
  const description = normalizeVoucherDescription(raw);
  const platform = normalizePlatform(raw, options.platform);

  // Extract discount information
  const { discountType, discountValue, maxDiscount } = normalizeDiscountInfo(raw, warnings);
  const minSpend = normalizeMinSpend(raw);

  // Extract validity dates
  const { startDate, endDate } = normalizeValidityDates(raw, options.defaultValidityDays, warnings);

  // Extract scope
  const { scope, applicableShopIds, applicableCategoryIds, applicableProductIds } = normalizeScope(
    raw,
    warnings
  );

  // Extract constraints
  const constraints = normalizeVoucherConstraints(raw, warnings);

  // Extract campaign metadata
  const { campaignName, campaignMetadata } = normalizeVoucherCampaignMetadata(raw);

  // Determine freshness status
  const freshnessStatus = determineFreshnessStatus(startDate, endDate);

  const now = new Date();

  const record: VoucherNormalizedRecord = {
    id: undefined, // Will be assigned by repository
    externalId,
    sourceId: options.sourceId,
    code,
    title,
    description,
    platform,
    discountType,
    discountValue,
    minSpend,
    maxDiscount,
    startDate,
    endDate,
    isActive: isVoucherActive(startDate, endDate),
    scope,
    applicableShopIds,
    applicableCategoryIds,
    applicableProductIds,
    constraints,
    campaignName,
    campaignMetadata,
    sourceRawData: options.preserveRawData ? (raw as Record<string, unknown>) : {},
    freshnessStatus,
    lastValidatedAt: null,
    qualityScore: null,
    createdAt: now,
    updatedAt: now,
  };

  return { record, warnings };
}

/**
 * Normalize multiple voucher records
 */
export function normalizeVoucherRecords(
  rawItems: VoucherRawInput[],
  options: NormalizeOptions
): {
  records: VoucherNormalizedRecord[];
  warnings: NormalizationWarning[];
  errors: { index: number; error: string }[];
} {
  const records: VoucherNormalizedRecord[] = [];
  const warnings: NormalizationWarning[] = [];
  const errors: { index: number; error: string }[] = [];

  for (let i = 0; i < rawItems.length; i++) {
    try {
      const raw = rawItems[i];
      if (!raw || typeof raw !== 'object') {
        errors.push({ index: i, error: 'Invalid raw input: not an object' });
        continue;
      }

      const { record, warnings: itemWarnings } = normalizeVoucherRecord(raw, options);
      records.push(record);

      // Add index to warnings
      itemWarnings.forEach((w) => {
        warnings.push({ ...w, field: w.field ? `[${i}].${w.field}` : `[${i}]` });
      });
    } catch (error) {
      errors.push({
        index: i,
        error: error instanceof Error ? error.message : 'Unknown normalization error',
      });
    }
  }

  return { records, warnings, errors };
}

// =============================================================================
// Field-Specific Normalizers
// =============================================================================

function extractExternalId(raw: VoucherRawInput, warnings: NormalizationWarning[]): string {
  // Try various common ID field names
  const idFields = ['id', 'voucher_id', 'voucherId', 'coupon_id', 'promo_id', 'promoId', 'code'];

  for (const field of idFields) {
    const value = raw[field];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  // Generate a deterministic UUID from code if no ID found
  const code = normalizeVoucherCode(raw, warnings);
  return `voucher_${code}_${Date.now()}`;
}

function normalizeVoucherCode(raw: VoucherRawInput, warnings: NormalizationWarning[]): string {
  const codeFields = ['code', 'voucher_code', 'voucherCode', 'promo_code', 'promoCode', 'coupon'];

  for (const field of codeFields) {
    const value = raw[field];
    if (typeof value === 'string' && value.length > 0) {
      return value.toUpperCase().trim();
    }
  }

  warnings.push({
    code: 'MISSING_CODE',
    message: 'No voucher code found, using generated code',
    field: 'code',
  });

  return `VOUCHER_${uuidv4().substring(0, 8).toUpperCase()}`;
}

function normalizeVoucherTitle(raw: VoucherRawInput, warnings: NormalizationWarning[]): string {
  const titleFields = ['title', 'name', 'voucher_name', 'voucherName', 'promo_title', 'promoName'];

  for (const field of titleFields) {
    const value = raw[field];
    if (typeof value === 'string' && value.length > 0) {
      return value.trim();
    }
  }

  // Fallback to description
  const desc = normalizeVoucherDescription(raw);
  if (desc) {
    return desc.substring(0, 100);
  }

  warnings.push({
    code: 'MISSING_TITLE',
    message: 'No voucher title found',
    field: 'title',
  });

  return 'Untitled Voucher';
}

function normalizeVoucherDescription(raw: VoucherRawInput): string | null {
  const descFields = ['description', 'desc', 'terms', 'terms_and_conditions', 'description_html'];

  for (const field of descFields) {
    const value = raw[field];
    if (typeof value === 'string' && value.length > 0) {
      return value.trim();
    }
  }

  return null;
}

function normalizePlatform(raw: VoucherRawInput, defaultPlatform?: VoucherPlatform): VoucherPlatform {
  const platformFields = ['platform', 'marketplace', 'source'];

  for (const field of platformFields) {
    const value = raw[field];
    if (typeof value === 'string') {
      const normalized = value.toLowerCase().trim();
      if (SUPPORTED_PLATFORMS.includes(normalized as VoucherPlatform)) {
        return normalized as VoucherPlatform;
      }
    }
  }

  return defaultPlatform || 'shopee';
}

function normalizeDiscountInfo(
  raw: VoucherRawInput,
  warnings: NormalizationWarning[]
): {
  discountType: VoucherDiscountType;
  discountValue: number;
  maxDiscount: number | null;
} {
  // Extract discount type
  const typeFields = ['discount_type', 'discountType', 'type', 'voucher_type', 'voucherType'];
  let discountType: VoucherDiscountType = 'percentage';

  for (const field of typeFields) {
    const value = raw[field];
    if (typeof value === 'string') {
      const normalized = value.toLowerCase().trim();
      if (DISCOUNT_TYPES.includes(normalized as VoucherDiscountType)) {
        discountType = normalized as VoucherDiscountType;
        break;
      }
    }
  }

  // Extract discount value
  const valueFields = ['discount_value', 'discountValue', 'value', 'discount', 'amount', 'percent'];
  let discountValue = 0;

  for (const field of valueFields) {
    const value = raw[field];
    if (typeof value === 'number' && value >= 0) {
      discountValue = value;
      break;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed) && parsed >= 0) {
        discountValue = parsed;
        break;
      }
    }
  }

  // Extract max discount
  let maxDiscount: number | null = null;
  const maxDiscountFields = ['max_discount', 'maxDiscount', 'max_discount_amount', 'cap', 'limit'];

  for (const field of maxDiscountFields) {
    const value = raw[field];
    if (typeof value === 'number' && value >= 0) {
      maxDiscount = value;
      break;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed) && parsed >= 0) {
        maxDiscount = parsed;
        break;
      }
    }
  }

  // Validate discount type
  if (discountType === 'percentage' && discountValue > 100) {
    warnings.push({
      code: 'INVALID_PERCENTAGE',
      message: `Percentage discount ${discountValue} exceeds 100%`,
      field: 'discountValue',
    });
    discountValue = Math.min(discountValue, 100);
  }

  return { discountType, discountValue, maxDiscount };
}

function normalizeMinSpend(raw: VoucherRawInput): number | null {
  const minSpendFields = ['min_spend', 'minSpend', 'min_purchase', 'min_order', 'minimum', 'threshold'];

  for (const field of minSpendFields) {
    const value = raw[field];
    if (typeof value === 'number' && value >= 0) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^\d.]/g, ''));
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  }

  return null;
}

function normalizeValidityDates(
  raw: VoucherRawInput,
  defaultValidityDays: number = 30,
  warnings: NormalizationWarning[]
): { startDate: Date; endDate: Date } {
  const now = new Date();

  // Extract start date
  const startDateFields = ['start_date', 'startDate', 'valid_from', 'validFrom', 'start_time'];
  let startDate = now;

  for (const field of startDateFields) {
    const value = raw[field];
    const parsed = parseDate(value);
    if (parsed) {
      startDate = parsed;
      break;
    }
  }

  // Extract end date
  const endDateFields = ['end_date', 'endDate', 'valid_until', 'validUntil', 'expire_date', 'expireDate', 'end_time'];
  let endDate = new Date(now.getTime() + defaultValidityDays * 24 * 60 * 60 * 1000);

  for (const field of endDateFields) {
    const value = raw[field];
    const parsed = parseDate(value);
    if (parsed) {
      endDate = parsed;
      break;
    }
  }

  // Validate dates
  if (endDate < startDate) {
    warnings.push({
      code: 'INVALID_DATE_RANGE',
      message: 'End date is before start date, swapping dates',
      field: 'endDate',
    });
    const temp = startDate;
    startDate = endDate;
    endDate = temp;
  }

  return { startDate, endDate };
}

function normalizeScope(
  raw: VoucherRawInput,
  warnings: NormalizationWarning[]
): {
  scope: VoucherScope;
  applicableShopIds: string[];
  applicableCategoryIds: string[];
  applicableProductIds: string[];
} {
  // Extract scope
  const scopeFields = ['scope', 'scope_type', 'scopeType', 'applicability'];
  let scope: VoucherScope = 'global';

  for (const field of scopeFields) {
    const value = raw[field];
    if (typeof value === 'string') {
      const normalized = value.toLowerCase().trim();
      if (SCOPE_TYPES.includes(normalized as VoucherScope)) {
        scope = normalized as VoucherScope;
        break;
      }
    }
  }

  // Extract applicable shop IDs
  const shopIdsFields = ['shop_ids', 'shopIds', 'shops', 'seller_ids', 'sellerIds'];
  const applicableShopIds = extractArrayField(raw, shopIdsFields);

  // Extract applicable category IDs
  const categoryIdsFields = ['category_ids', 'categoryIds', 'categories', 'cat_ids'];
  const applicableCategoryIds = extractArrayField(raw, categoryIdsFields);

  // Extract applicable product IDs
  const productIdsFields = ['product_ids', 'productIds', 'products', 'item_ids', 'itemIds'];
  const applicableProductIds = extractArrayField(raw, productIdsFields);

  // Auto-detect scope based on applicable IDs
  if (applicableProductIds.length > 0 && scope === 'global') {
    scope = 'product';
  } else if (applicableCategoryIds.length > 0 && scope === 'global') {
    scope = 'category';
  } else if (applicableShopIds.length > 0 && scope === 'global') {
    scope = 'shop';
  }

  return { scope, applicableShopIds, applicableCategoryIds, applicableProductIds };
}

// =============================================================================
// Constraint Normalization
// =============================================================================

/**
 * Normalize voucher constraints from raw input
 */
export function normalizeVoucherConstraints(
  raw: VoucherRawInput,
  warnings: NormalizationWarning[]
): VoucherConstraint[] {
  const constraints: VoucherConstraint[] = [];

  // Check for explicit constraints array
  const constraintsFields = ['constraints', 'rules', 'limitations', 'terms'];
  for (const field of constraintsFields) {
    const value = raw[field];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === 'object') {
          const constraint = normalizeSingleConstraint(item, warnings);
          if (constraint) {
            constraints.push(constraint);
          }
        }
      }
      return constraints;
    }
  }

  // Extract implicit constraints from fields
  const minSpend = normalizeMinSpend(raw);
  if (minSpend !== null) {
    constraints.push({
      type: 'min_spend',
      operator: 'gte',
      value: minSpend,
    });
  }

  // Extract user limit
  const userLimitFields = ['user_limit', 'userLimit', 'per_user', 'limit_per_user'];
  for (const field of userLimitFields) {
    const value = raw[field];
    if (typeof value === 'number' && value > 0) {
      constraints.push({
        type: 'user_limit',
        operator: 'lte',
        value,
      });
      break;
    }
  }

  // Extract product limit
  const productLimitFields = ['product_limit', 'productLimit', 'per_product', 'limit_per_product'];
  for (const field of productLimitFields) {
    const value = raw[field];
    if (typeof value === 'number' && value > 0) {
      constraints.push({
        type: 'product_limit',
        operator: 'lte',
        value,
      });
      break;
    }
  }

  // Extract payment method constraints
  const paymentMethodFields = ['payment_methods', 'paymentMethods', 'payment_method'];
  for (const field of paymentMethodFields) {
    const value = raw[field];
    if (typeof value === 'string') {
      constraints.push({
        type: 'payment_method',
        operator: 'eq',
        value: value.toLowerCase(),
      });
    } else if (Array.isArray(value)) {
      constraints.push({
        type: 'payment_method',
        operator: 'in',
        value: value.map((v) => String(v).toLowerCase()),
      });
    }
    break;
  }

  return constraints;
}

function normalizeSingleConstraint(
  raw: Record<string, unknown>,
  warnings: NormalizationWarning[]
): VoucherConstraint | null {
  const typeFields = ['type', 'constraint_type', 'constraintType'];
  let type = '';

  for (const field of typeFields) {
    const value = raw[field];
    if (typeof value === 'string') {
      type = value.toLowerCase();
      break;
    }
  }

  if (!type) {
    warnings.push({
      code: 'MISSING_CONSTRAINT_TYPE',
      message: 'Constraint missing type field',
    });
    return null;
  }

  const operatorFields = ['operator', 'op'];
  let operator = 'eq';

  for (const field of operatorFields) {
    const value = raw[field];
    if (typeof value === 'string') {
      operator = value.toLowerCase();
      break;
    }
  }

  const valueFields = ['value', 'val'];
  let value: unknown = null;

  for (const field of valueFields) {
    if (field in raw) {
      value = raw[field];
      break;
    }
  }

  return {
    type: type as VoucherConstraint['type'],
    operator: operator as VoucherConstraint['operator'],
    value,
    metadata: raw.metadata as Record<string, unknown> | undefined,
  };
}

// =============================================================================
// Campaign Metadata Normalization
// =============================================================================

/**
 * Normalize campaign metadata from raw input
 */
export function normalizeVoucherCampaignMetadata(
  raw: VoucherRawInput
): { campaignName: string | null; campaignMetadata: Record<string, unknown> | null } {
  const campaignFields = ['campaign', 'campaign_name', 'campaignName', 'promotion', 'promotion_name'];

  for (const field of campaignFields) {
    const value = raw[field];
    if (typeof value === 'string' && value.length > 0) {
      // Extract other campaign-related fields
      const campaignMetadata: Record<string, unknown> = {};

      const metadataFields = [
        'campaign_id',
        'campaignId',
        'promotion_id',
        'promotionId',
        'promo_type',
        'promoType',
        'banner',
        'terms_url',
      ];

      for (const metaField of metadataFields) {
        if (metaField in raw) {
          campaignMetadata[metaField] = raw[metaField];
        }
      }

      return { campaignName: value, campaignMetadata };
    }
  }

  return { campaignName: null, campaignMetadata: null };
}

// =============================================================================
// Helper Functions
// =============================================================================

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  if (typeof value === 'number') {
    // Unix timestamp (seconds or milliseconds)
    const timestamp = value > 1e12 ? value : value * 1000;
    const parsed = new Date(timestamp);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function extractArrayField(raw: VoucherRawInput, fieldNames: string[]): string[] {
  for (const field of fieldNames) {
    const value = raw[field];
    if (Array.isArray(value)) {
      return value.map((v) => String(v)).filter((v) => v.length > 0);
    }
    if (typeof value === 'string') {
      return value.split(',').map((v) => v.trim()).filter((v) => v.length > 0);
    }
  }
  return [];
}

function determineFreshnessStatus(startDate: Date, endDate: Date): VoucherFreshnessStatus {
  const now = new Date();

  if (now < startDate) {
    return 'unknown'; // Not yet active
  }

  if (now > endDate) {
    return 'expired';
  }

  const timeUntilExpiry = endDate.getTime() - now.getTime();

  if (timeUntilExpiry < FRESHNESS.STALE_THRESHOLD_MS) {
    return 'stale';
  }

  return 'fresh';
}

function isVoucherActive(startDate: Date, endDate: Date): boolean {
  const now = new Date();
  return now >= startDate && now <= endDate;
}
