// =============================================================================
// No Match Presentation Builder
// Production-grade builder for no-match UX
// =============================================================================

import { PublicVoucherResolveResponse } from '../../../publicApi/types';
import { VoucherNoMatchPresentationModel, VoucherFallbackPresentation } from '../types';
import { COPYWRITING } from '../constants';

/**
 * Build no-match presentation model
 */
export function buildNoMatchPresentationModel(
  response: PublicVoucherResolveResponse
): VoucherNoMatchPresentationModel {
  return {
    viewState: 'no_match',
    message: buildNoMatchMessage(response),
    suggestion: buildNoMatchSuggestion(response),
    fallback: buildFallbackVoucherPresentation(response),
    canRetry: true,
  };
}

/**
 * Build fallback presentation
 */
export function buildFallbackVoucherPresentation(
  response: PublicVoucherResolveResponse
): VoucherFallbackPresentation {
  // If there are any candidates, use them as fallback
  if (response.candidates && response.candidates.length > 0) {
    const bestCandidate = response.candidates[0];
    return {
      hasFallback: true,
      message: buildFallbackMessage(bestCandidate.discountText),
      suggestion: COPYWRITING.TIP_USE_CODE,
    };
  }

  return {
    hasFallback: false,
    message: '',
    suggestion: '',
  };
}

/**
 * Build no-match message
 */
function buildNoMatchMessage(response: PublicVoucherResolveResponse): string {
  // Use explanation if available
  if (response.explanation?.summary) {
    return response.explanation.summary;
  }

  return COPYWRITING.NO_MATCH_MESSAGE;
}

/**
 * Build no-match suggestion
 */
function buildNoMatchSuggestion(response: PublicVoucherResolveResponse): string {
  // Provide actionable suggestions
  if (response.candidates && response.candidates.length > 0) {
    return 'Có một số voucher có thể thử.';
  }

  return COPYWRITING.NO_MATCH_SUGGESTION;
}

/**
 * Build fallback message
 */
function buildFallbackMessage(discountText?: string): string {
  if (discountText) {
    return `Thử voucher ${discountText} này.`;
  }

  return COPYWRITING.FALLBACK_SUMMARY;
}

/**
 * Build no-match support copy
 */
export function buildNoMatchSupportCopy(): {
  title: string;
  message: string;
  suggestion: string;
  retryLabel: string;
} {
  return {
    title: COPYWRITING.NO_MATCH_TITLE,
    message: COPYWRITING.NO_MATCH_MESSAGE,
    suggestion: COPYWRITING.NO_MATCH_SUGGESTION,
    retryLabel: COPYWRITING.TRY_AGAIN,
  };
}
