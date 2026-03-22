// =============================================================================
// Public Response Serializer
// Production-grade serializer for public-facing API responses
// =============================================================================

import {
  PublicVoucherResolveResponse,
  PublicVoucherBestMatchDto,
  PublicVoucherCandidateDto,
  PublicVoucherExplanationDto,
  PublicDiscountType,
} from '../types.js';
import { EXPLANATION, RESPONSE_FORMAT } from '../constants.js';

// Internal types from voucher engine (mock imports - will be connected later)
interface InternalVoucher {
  id: string;
  code: string;
  title: string;
  discountType: string;
  discountValue: number;
  minSpend: number | null;
  maxDiscount: number | null;
  endDate: Date;
  scope: string;
  applicableCategoryIds: string[];
  applicableShopIds: string[];
}

interface InternalResolutionResult {
  success: boolean;
  bestMatch?: InternalVoucher;
  candidates: InternalVoucher[];
  explanation?: string;
  processingTimeMs: number;
}

/**
 * Serialize internal resolution result to public response
 */
export function serializePublicVoucherResolveResponse(
  internalResult: InternalResolutionResult,
  requestId: string,
  cacheHit: boolean = false,
  cacheTtlSeconds?: number
): PublicVoucherResolveResponse {
  // Determine status
  let status: PublicVoucherResolveResponse['status'];
  if (!internalResult.success) {
    status = 'error';
  } else if (!internalResult.bestMatch && internalResult.candidates.length === 0) {
    status = 'no_match';
  } else {
    status = 'success';
  }

  // Build response
  const response: PublicVoucherResolveResponse = {
    requestId,
    status,
    bestMatch: internalResult.bestMatch
      ? serializeBestVoucherForPublic(internalResult.bestMatch)
      : null,
    candidates: internalResult.candidates.map((c, i) =>
      serializeCandidateVoucherForPublic(c, i + 1)
    ),
    performance: {
      totalLatencyMs: internalResult.processingTimeMs,
      servedFromCache: cacheHit,
      cacheTtlSeconds,
      resolvedAt: new Date().toISOString(),
    },
    explanation: internalResult.explanation
      ? serializePublicExplanation(internalResult.explanation)
      : null,
    warnings: [],
  };

  return response;
}

/**
 * Serialize best voucher for public display
 */
export function serializeBestVoucherForPublic(voucher: InternalVoucher): PublicVoucherBestMatchDto {
  return {
    voucherId: voucher.id,
    code: voucher.code,
    discountType: mapDiscountType(voucher.discountType),
    discountValue: formatDiscountValue(voucher.discountType, voucher.discountValue),
    minSpend: voucher.minSpend ? formatCurrency(voucher.minSpend) : null,
    maxDiscount: voucher.maxDiscount ? formatCurrency(voucher.maxDiscount) : null,
    validUntil: voucher.endDate.toISOString(),
    headline: buildVoucherHeadline(voucher),
    applicableCategories: voucher.applicableCategoryIds || [],
  };
}

/**
 * Serialize candidate voucher for public display
 */
export function serializeCandidateVoucherForPublic(
  voucher: InternalVoucher,
  rank: number
): PublicVoucherCandidateDto {
  return {
    voucherId: voucher.id,
    code: voucher.code,
    discountText: formatDiscountText(voucher.discountType, voucher.discountValue),
    rank,
    reason: buildCandidateReason(voucher),
  };
}

/**
 * Serialize explanation for public display
 */
export function serializePublicExplanation(explanation: string): PublicVoucherExplanationDto {
  // Truncate and format explanation
  const truncated =
    explanation.length > EXPLANATION.MAX_SUMMARY_LENGTH
      ? explanation.substring(0, EXPLANATION.MAX_SUMMARY_LENGTH) + '...'
      : explanation;

  return {
    summary: truncated,
    tips: [
      EXPLANATION.BEST_MATCH_EXPLANATION,
      'Sử dụng mã này khi thanh toán để được giảm giá.',
    ],
  };
}

/**
 * Map internal discount type to public type
 */
function mapDiscountType(internalType: string): PublicDiscountType {
  switch (internalType) {
    case 'percentage':
      return 'percentage';
    case 'fixed_amount':
      return 'fixed_amount';
    case 'free_shipping':
      return 'free_shipping';
    case 'buy_x_get_y':
      return 'buy_x_get_y';
    default:
      return 'percentage';
  }
}

/**
 * Format discount value for display
 */
function formatDiscountValue(type: string, value: number): string {
  switch (type) {
    case 'percentage':
      return `${value}${RESPONSE_FORMAT.PERCENTAGE_SUFFIX}`;
    case 'fixed_amount':
      return formatCurrency(value);
    case 'free_shipping':
      return RESPONSE_FORMAT.FREE_SHIPPING_TEXT;
    default:
      return `${value}`;
  }
}

/**
 * Format discount text
 */
function formatDiscountText(type: string, value: number): string {
  switch (type) {
    case 'percentage':
      return `Giảm ${value}%`;
    case 'fixed_amount':
      return `Giảm ${formatCurrency(value)}`;
    case 'free_shipping':
      return RESPONSE_FORMAT.FREE_SHIPPING_TEXT;
    case 'buy_x_get_y':
      return 'Mua X tặng Y';
    default:
      return `Giảm ${value}`;
  }
}

/**
 * Format currency in VND
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(RESPONSE_FORMAT.CURRENCY_LOCALE, {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Build voucher headline
 */
function buildVoucherHeadline(voucher: InternalVoucher): string {
  const parts: string[] = [];

  // Discount
  parts.push(formatDiscountText(voucher.discountType, voucher.discountValue));

  // Min spend if applicable
  if (voucher.minSpend && voucher.minSpend > 0) {
    parts.push(`từ ${formatCurrency(voucher.minSpend)}`);
  }

  return parts.join(' ');
}

/**
 * Build candidate reason
 */
function buildCandidateReason(voucher: InternalVoucher): string {
  const parts: string[] = [];

  // Discount
  parts.push(formatDiscountText(voucher.discountType, voucher.discountValue));

  // Scope
  if (voucher.scope === 'global') {
    parts.push('Áp dụng toàn sàn');
  } else if (voucher.scope === 'category') {
    parts.push('Áp dụng danh mục');
  }

  return parts.join(' - ');
}

/**
 * Build no-match explanation
 */
export function buildNoMatchExplanation(): PublicVoucherExplanationDto {
  return {
    summary: 'Không tìm thấy voucher phù hợp cho sản phẩm này.',
    tips: [
      'Thử sản phẩm khác.',
      'Kiểm tra lại link sản phẩm.',
      'Sản phẩm có thể chưa có voucher hiện tại.',
    ],
  };
}
