/**
 * Voucher Explanation Builder
 *
 * Builds explanations for voucher recommendations.
 */

import {
  ProductContext,
  VoucherCandidate,
  VoucherResolutionResult,
  VoucherExplainabilityResult,
  CandidateExplanation,
  FallbackExplanation,
} from '../types';
import {
  MAX_EXPLANATION_TIPS,
  DEFAULT_INCLUDE_DETAILED_REASONS,
} from '../constants';

/**
 * Explanation builder options
 */
export interface ExplanationBuilderOptions {
  verbosity?: 'minimal' | 'standard' | 'detailed';
  includeDetailedReasons?: boolean;
  includeTips?: boolean;
  includeTradeoffs?: boolean;
}

/**
 * Build explanation for resolution result
 */
export function buildBestVoucherExplanation(
  result: VoucherResolutionResult,
  context: ProductContext,
  options?: ExplanationBuilderOptions
): VoucherExplainabilityResult {
  const opts = {
    verbosity: options?.verbosity ?? 'standard',
    includeDetailedReasons: options?.includeDetailedReasons ?? DEFAULT_INCLUDE_DETAILED_REASONS,
    includeTips: options?.includeTips ?? true,
    includeTradeoffs: options?.includeTradeoffs ?? true,
  };

  // If no match
  if (!result.hasMatch || !result.bestVoucher) {
    return buildNoMatchExplanation(context, options);
  }

  // Build best match reason
  const bestMatchReason = buildBestMatchReason(result.bestVoucher, result.matchType, context);

  // Build candidate summaries
  const candidateSummaries = result.candidates.map((candidate) =>
    buildCandidateExplanation(candidate, context, opts)
  );

  // Build fallback if no exact match
  let fallbackRecommendation: FallbackExplanation | null = null;
  if (result.matchType !== 'exact' && result.matchType !== 'shop') {
    fallbackRecommendation = buildFallbackRecommendation(context, result.candidates, options);
  }

  // Generate tips
  const tips = opts.includeTips ? generateTips(result, context) : [];

  return {
    hasMatch: result.hasMatch,
    bestMatchReason,
    candidateSummaries,
    fallbackRecommendation,
    noMatchReason: null,
    tips,
  };
}

/**
 * Build explanation for individual candidate
 */
export function buildCandidateExplanation(
  candidate: VoucherCandidate,
  context: ProductContext,
  options?: ExplanationBuilderOptions
): CandidateExplanation {
  const { voucher, matchType, eligibilityResult } = candidate;

  // Build match reason
  const matchReason = buildMatchReason(voucher, matchType, context);

  // Build applicability details
  const applicabilityDetails = buildApplicabilityDetails(candidate, context);

  // Build value details
  const valueDetails = buildValueDetails(candidate, context);

  // Get warnings
  const warnings = eligibilityResult.warnings;

  return {
    voucherId: voucher.id,
    title: voucher.voucherTitle,
    matchReason,
    applicabilityDetails,
    valueDetails,
    warnings,
  };
}

/**
 * Build explanation when no match found
 */
export function buildNoMatchExplanation(
  context: ProductContext,
  options?: ExplanationBuilderOptions
): VoucherExplainabilityResult {
  const reasons: string[] = [];

  // Determine why no match
  if (!context.productId && !context.shopId && context.categoryPath.length === 0) {
    reasons.push('Không đủ thông tin sản phẩm để tìm voucher phù hợp');
  }

  if (!context.categoryPath || context.categoryPath.length === 0) {
    reasons.push('Không xác định được danh mục sản phẩm');
  }

  if (!context.shopId) {
    reasons.push('Không xác định được shop bán sản phẩm');
  }

  // Generate tips
  const tips = generateNoMatchTips(context);

  return {
    hasMatch: false,
    bestMatchReason: null,
    candidateSummaries: [],
    fallbackRecommendation: {
      recommendation: 'Sử dụng voucher platform-wide',
      reason: 'Các voucher toàn sàn thường có giá trị cao và áp dụng rộng',
      alternativeStrategies: [
        'Tìm kiếm voucher của shop trực tiếp trên Shopee',
        'Kiểm tra mục "Mã giảm giá" trong trang sản phẩm',
        'Theo dõi các đợt flash sale',
      ],
    },
    noMatchReason: reasons.join('. '),
    tips,
  };
}

// =============================================================================
// Private Helper Functions
// =============================================================================

/**
 * Build best match reason
 */
function buildBestMatchReason(
  bestVoucher: VoucherCandidate['voucher'],
  matchType: VoucherCandidate['matchType'],
  context: ProductContext
): string {
  switch (matchType) {
    case 'exact':
      return `Voucher "${bestVoucher.voucherTitle}" phù hợp nhất với sản phẩm này`;

    case 'shop':
      return `Voucher "${bestVoucher.voucherTitle}" áp dụng cho shop "${context.shopName || bestVoucher.shopName || bestVoucher.shopId}"`;

    case 'category':
      const categoryPath = context.categoryPath?.join(' > ') || bestVoucher.categoryPath?.join(' > ');
      return `Voucher "${bestVoucher.voucherTitle}" áp dụng cho danh mục "${categoryPath}"`;

    case 'platform':
      return `Voucher "${bestVoucher.voucherTitle}" áp dụng toàn sàn ${context.platform}`;

    case 'fallback':
      return `Voucher "${bestVoucher.voucherTitle}" là lựa chọn tốt nhất hiện có`;

    default:
      return `Voucher "${bestVoucher.voucherTitle}" được recommend`;
  }
}

/**
 * Build match reason string
 */
function buildMatchReason(
  voucher: VoucherCandidate['voucher'],
  matchType: VoucherCandidate['matchType'],
  context: ProductContext
): string {
  const parts: string[] = [];

  switch (matchType) {
    case 'exact':
      parts.push('Áp dụng cho sản phẩm cụ thể này');
      break;
    case 'shop':
      if (context.shopName) {
        parts.push(`Dành riêng cho shop "${context.shopName}"`);
      } else if (voucher.shopName) {
        parts.push(`Dành riêng cho shop "${voucher.shopName}"`);
      } else {
        parts.push('Voucher shop-specific');
      }
      break;
    case 'category':
      const category = voucher.categoryPath?.join(' > ') || context.categoryPath?.join(' > ');
      if (category) {
        parts.push(`Áp dụng cho danh mục "${category}"`);
      }
      break;
    case 'platform':
      parts.push('Voucher toàn sàn - áp dụng cho mọi sản phẩm');
      break;
    case 'fallback':
      parts.push('Voucher fallback - áp dụng chung');
      break;
  }

  // Add discount info
  if (voucher.discountType === 'percentage') {
    parts.push(`Giảm ${voucher.discountValue}%`);
  } else if (voucher.discountType === 'fixed_amount') {
    parts.push(`Giảm ${voucher.discountValue?.toLocaleString('vi-VN')}đ`);
  } else if (voucher.discountType === 'free_shipping') {
    parts.push('Miễn phí vận chuyển');
  }

  // Add minimum spend if relevant
  if (voucher.minimumSpend && voucher.minimumSpend > 0) {
    parts.push(`Đơn tối thiểu ${voucher.minimumSpend.toLocaleString('vi-VN')}đ`);
  }

  return parts.join('. ');
}

/**
 * Build applicability details
 */
function buildApplicabilityDetails(
  candidate: VoucherCandidate,
  context: ProductContext
): string[] {
  const details: string[] = [];

  // Confidence
  const confidence = candidate.applicabilityScore * 100;
  details.push(`Độ chắc chắn: ${confidence.toFixed(0)}%`);

  // Match precision
  const precision = candidate.scopePrecision * 100;
  details.push(`Độ chính xác scope: ${precision.toFixed(0)}%`);

  // Eligibility rules
  const { matchedRules } = candidate.eligibilityResult;
  if (matchedRules.length > 0) {
    details.push(`Đạt ${matchedRules.length} điều kiện`);
  }

  // Warnings
  if (candidate.eligibilityResult.warnings.length > 0) {
    details.push(...candidate.eligibilityResult.warnings.map((w) => `Cảnh báo: ${w}`));
  }

  return details;
}

/**
 * Build value details
 */
function buildValueDetails(
  candidate: VoucherCandidate,
  context: ProductContext
): string[] {
  const details: string[] = [];

  // Expected value
  if (candidate.expectedDiscountValue > 0) {
    details.push(`Giá trị mong đợi: ~${candidate.expectedDiscountValue.toLocaleString('vi-VN')}đ`);
  }

  // Freshness
  if (candidate.freshnessScore > 0.8) {
    details.push('Còn hạn sử dụng dài');
  } else if (candidate.freshnessScore > 0.5) {
    details.push('Còn hạn sử dụng');
  } else {
    details.push('Sắp hết hạn - sử dụng sớm');
  }

  // Priority
  if (candidate.voucher.verificationStatus === 'verified') {
    details.push('Đã xác minh');
  } else if (candidate.voucher.verificationStatus === 'unverified') {
    details.push('Chưa xác minh');
  }

  return details;
}

/**
 * Build fallback recommendation
 */
function buildFallbackRecommendation(
  context: ProductContext,
  candidates: VoucherCandidate[],
  options?: ExplanationBuilderOptions
): FallbackExplanation {
  // Find best platform-wide voucher as fallback
  const platformVoucher = candidates.find((c) => c.matchType === 'platform');

  if (platformVoucher) {
    return {
      recommendation: `Sử dụng voucher "${platformVoucher.voucher.voucherTitle}"`,
      reason: 'Đây là voucher toàn sàn, áp dụng cho mọi sản phẩm trên Shopee',
      alternativeStrategies: [
        'Truy cập trang sản phẩm trên Shopee để xem voucher của shop',
        'Tìm kiếm voucher trong mục "Khuyến mãi" của Shopee',
        'Theo dõi shop để nhận voucher mới',
      ],
    };
  }

  return {
    recommendation: 'Không tìm thấy voucher phù hợp',
    reason: 'Hệ thống chưa có voucher nào khả dụng cho sản phẩm này',
    alternativeStrategies: [
      'Kiểm tra lại sau vì voucher được cập nhật thường xuyên',
      'Tìm voucher trực tiếp trên Shopee',
      'Đăng ký nhận thông báo voucher từ shop',
    ],
  };
}

/**
 * Generate tips for user
 */
function generateTips(result: VoucherResolutionResult, context: ProductContext): string[] {
  const tips: string[] = [];

  // Best voucher tip
  if (result.bestVoucher?.voucherCode) {
    tips.push(`Sử dụng mã "${result.bestVoucher.voucherCode}" khi thanh toán`);
  }

  // If multiple candidates
  if (result.candidates.length > 1) {
    tips.push(`Có ${result.candidates.length} voucher khả dụng, chọn voucher có giá trị cao nhất`);
  }

  // Minimum spend tip
  const bestVoucher = result.candidates[0];
  if (bestVoucher?.voucher.minimumSpend && context.price) {
    if (context.price < bestVoucher.voucher.minimumSpend) {
      const remaining = bestVoucher.voucher.minimumSpend - context.price;
      tips.push(`Mua thêm ${remaining.toLocaleString('vi-VN')}đ để đạt mức tối thiểu`);
    }
  }

  // Expiry tip
  if (bestVoucher?.voucher.endsAt) {
    const daysLeft = Math.ceil(
      (bestVoucher.voucher.endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft <= 3) {
      tips.push(`Voucher sắp hết hạn (còn ${daysLeft} ngày), sử dụng sớm nhé!`);
    }
  }

  // Platform tip
  tips.push('Lưu ý: Một số voucher chỉ áp dụng cho phương thức thanh toán cụ thể');

  return tips.slice(0, MAX_EXPLANATION_TIPS);
}

/**
 * Generate tips when no match
 */
function generateNoMatchTips(context: ProductContext): string[] {
  const tips: string[] = [];

  tips.push('Thử dán link sản phẩm cụ thể thay vì link danh mục');

  if (!context.shopId) {
    tips.push('Đảm bảo link sản phẩm đầy đủ (có cả shop và sản phẩm)');
  }

  tips.push('Kiểm tra voucher trực tiếp trên Shopee');
  tips.push('Quay lại sau vì voucher được cập nhật thường xuyên');

  return tips.slice(0, MAX_EXPLANATION_TIPS);
}
