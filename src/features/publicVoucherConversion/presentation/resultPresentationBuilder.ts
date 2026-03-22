// =============================================================================
// Result Presentation Builder
// Production-grade builder for voucher result presentation models
// =============================================================================

import {
  PublicVoucherResolveResponse,
  PublicVoucherBestMatchDto,
  PublicVoucherCandidateDto,
} from '../../../publicApi/types';
import { VoucherResultPresentationModel, VoucherBestPresentation, VoucherCandidatePresentation, VoucherConfidencePresentation, VoucherExplanationPresentation } from '../types';
import { COPYWRITING, CONFIDENCE, DISPLAY_LIMITS } from '../constants';

// Re-export from noMatchPresentationBuilder for convenience
export { buildNoMatchPresentationModel } from './noMatchPresentationBuilder.js';

/**
 * Build complete presentation model from API response
 */
export function buildVoucherResultPresentationModel(
  response: PublicVoucherResolveResponse,
  options?: {
    maxCandidates?: number;
  }
): VoucherResultPresentationModel {
  // Determine view state
  const viewState = mapStatusToViewState(response.status);

  // Build best voucher presentation
  const bestVoucher = response.bestMatch
    ? buildBestVoucherPresentation(response.bestMatch)
    : null;

  // Build candidates presentation
  const candidates = buildVoucherCandidatesPresentation(
    response.candidates,
    options?.maxCandidates || DISPLAY_LIMITS.MAX_CANDIDATES
  );

  // Build confidence presentation
  const confidence = bestVoucher
    ? buildVoucherConfidencePresentation(response)
    : null;

  // Build explanation presentation
  const explanation = response.explanation
    ? buildVoucherExplanationPresentation(response.explanation)
    : null;

  return {
    requestId: response.requestId,
    viewState,
    bestVoucher,
    candidates,
    confidence,
    explanation,
    fallback: null, // Will be populated in no-match builder
    latencyMs: response.performance.totalLatencyMs,
    servedFromCache: response.performance.servedFromCache,
  };
}

/**
 * Build best voucher presentation
 */
export function buildBestVoucherPresentation(
  voucher: PublicVoucherBestMatchDto
): VoucherBestPresentation {
  return {
    voucherId: voucher.voucherId,
    code: voucher.code,
    discountText: formatDiscountText(voucher.discountType, voucher.discountValue),
    discountValue: voucher.discountValue,
    minSpend: voucher.minSpend,
    maxDiscount: voucher.maxDiscount,
    validUntil: voucher.validUntil,
    headline: voucher.headline,
    primaryAction: {
      type: 'copy',
      label: COPYWRITING.COPY_BUTTON,
      priority: 'primary',
    },
    secondaryAction: {
      type: 'open_shopee',
      label: COPYWRITING.OPEN_SHOPEE_BUTTON,
      priority: 'secondary',
    },
  };
}

/**
 * Build candidates presentation
 */
export function buildVoucherCandidatesPresentation(
  candidates: PublicVoucherCandidateDto[],
  maxDisplay: number = DISPLAY_LIMITS.MAX_CANDIDATES
): VoucherCandidatePresentation[] {
  return candidates
    .slice(0, maxDisplay)
    .map((candidate) => ({
      voucherId: candidate.voucherId,
      code: candidate.code,
      discountText: candidate.discountText,
      rank: candidate.rank,
      reason: candidate.reason,
      action: {
        type: 'select',
        label: 'Chọn',
      },
    }));
}

/**
 * Build confidence presentation
 */
export function buildVoucherConfidencePresentation(
  response: PublicVoucherResolveResponse
): VoucherConfidencePresentation | null {
  // Determine confidence based on various factors
  const hasBestMatch = !!response.bestMatch;
  const hasCandidates = response.candidates.length > 0;
  const wasCached = response.performance.servedFromCache;

  if (!hasBestMatch) {
    return null;
  }

  // Simple confidence logic based on presence of data
  let level: VoucherConfidencePresentation['level'];
  let badgeText: string;
  let badgeVariant: VoucherConfidencePresentation['badgeVariant'];

  if (hasBestMatch && hasCandidates && wasCached) {
    level = 'exact';
    badgeText = COPYWRITING.EXACT_BADGE;
    badgeVariant = 'success';
  } else if (hasBestMatch && hasCandidates) {
    level = 'high';
    badgeText = COPYWRITING.HIGH_BADGE;
    badgeVariant = 'success';
  } else if (hasBestMatch) {
    level = 'medium';
    badgeText = COPYWRITING.MEDIUM_BADGE;
    badgeVariant = 'info';
  } else {
    level = 'low';
    badgeText = COPYWRITING.LOW_BADGE;
    badgeVariant = 'warning';
  }

  return {
    level,
    badgeText,
    badgeVariant,
  };
}

/**
 * Build explanation presentation
 */
export function buildVoucherExplanationPresentation(
  explanation: PublicVoucherResolveResponse['explanation']
): VoucherExplanationPresentation | null {
  if (!explanation) {
    return null;
  }

  return {
    summary: truncateText(explanation.summary, DISPLAY_LIMITS.MAX_SUMMARY_LENGTH),
    tips: explanation.tips
      .slice(0, DISPLAY_LIMITS.MAX_TIPS)
      .map((tip) => truncateText(tip, DISPLAY_LIMITS.MAX_TIP_LENGTH)),
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function mapStatusToViewState(
  status: PublicVoucherResolveResponse['status']
): VoucherResultPresentationModel['viewState'] {
  switch (status) {
    case 'success':
      return 'success';
    case 'no_match':
      return 'no_match';
    case 'invalid_input':
      return 'invalid_input';
    case 'rate_limited':
      return 'rate_limited';
    case 'error':
    default:
      return 'failure';
  }
}

function formatDiscountText(type: string, value: string): string {
  switch (type) {
    case 'percentage':
      return `Giảm ${value}`;
    case 'fixed_amount':
      return `Giảm ${value}`;
    case 'free_shipping':
      return 'Miễn phí vận chuyển';
    case 'buy_x_get_y':
      return 'Mua X tặng Y';
    default:
      return value;
  }
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}
