/**
 * Voucher Engine API Serializers
 *
 * Serializes domain results to API DTOs.
 */

import type {
  VoucherResolutionResult,
  VoucherResolutionRequest,
  VoucherCandidate,
} from '../types';

import type {
  ResolveVoucherResponseDto,
  VoucherResolutionResultDto,
  ResolvedVoucherDto,
  VoucherExplanationDto,
  ProductContextDto,
  CandidateExplanationDto,
  FallbackExplanationDto,
} from './types';

/**
 * Serialize resolution result to API response
 */
export function serializeVoucherResolutionResult(
  result: VoucherResolutionResult
): ResolveVoucherResponseDto {
  return {
    success: result.hasMatch || result.candidates.length > 0,
    data: serializeResolutionData(result),
    error: null,
    request_id: result.requestId,
    resolved_at: result.resolvedAt.toISOString(),
  };
}

/**
 * Serialize resolution data
 */
function serializeResolutionData(
  result: VoucherResolutionResult
): VoucherResolutionResultDto {
  return {
    has_match: result.hasMatch,
    match_type: result.matchType,
    best_voucher: result.bestVoucher
      ? serializeVoucherCandidate(result.bestVoucher)
      : null,
    candidates: result.candidates.slice(0, 5).map(serializeVoucherCandidate),
    eligible_count: result.eligibleCount,
    explanation: serializeExplanation(result.explanation),
    product_context: serializeProductContext(result.productContext),
    cached: result.cached,
    warnings: result.warnings.map(serializeWarning),
  };
}

/**
 * Serialize voucher candidate
 */
export function serializeVoucherCandidate(candidate: any): ResolvedVoucherDto {
  return {
    id: candidate.id,
    code: candidate.code,
    title: candidate.title,
    type: candidate.type,
    discount_type: candidate.discountType,
    discount_value: candidate.discountValue,
    max_discount_value: candidate.maxDiscountValue,
    minimum_spend: candidate.minimumSpend,
    scope: candidate.scope,
    expires_at: candidate.expiresAt?.toISOString() ?? null,
    shop_name: candidate.shopName,
    match_type: candidate.matchType,
    expected_value: candidate.expectedValue,
    applicability_score: candidate.applicabilityScore,
    url: candidate.url,
  };
}

/**
 * Serialize explanation
 */
export function serializeExplanation(
  explanation: any
): VoucherExplanationDto {
  return {
    has_match: explanation.hasMatch,
    best_match_reason: explanation.bestMatchReason,
    candidate_summaries: (explanation.candidateSummaries || []).map(
      (s: any): CandidateExplanationDto => ({
        voucher_id: s.voucherId,
        title: s.title,
        match_reason: s.matchReason,
        applicability_details: s.applicabilityDetails,
        value_details: s.valueDetails,
        warnings: s.warnings,
      })
    ),
    fallback_recommendation: explanation.fallbackRecommendation
      ? serializeFallback(explanation.fallbackRecommendation)
      : null,
    no_match_reason: explanation.noMatchReason,
    tips: explanation.tips || [],
  };
}

/**
 * Serialize fallback
 */
function serializeFallback(fallback: any): FallbackExplanationDto {
  return {
    recommendation: fallback.recommendation,
    reason: fallback.reason,
    alternative_strategies: fallback.alternativeStrategies || [],
  };
}

/**
 * Serialize product context
 */
export function serializeProductContext(context: any): ProductContextDto {
  return {
    platform: context.platform || 'unknown',
    product_id: context.productId || null,
    shop_id: context.shopId || null,
    shop_name: context.shopName || null,
    category_path: context.categoryPath || [],
    title: context.title || null,
    price: context.price || null,
    normalized_url: context.normalizedUrl || '',
    confidence: context.confidence || 0,
    source: context.contextSource || 'unknown',
  };
}

/**
 * Serialize warning
 */
function serializeWarning(warning: any) {
  return {
    code: warning.code || 'WARNING',
    message: warning.message,
    severity: warning.severity || 'medium',
    context: warning.context,
  };
}

/**
 * Serialize error response
 */
export function serializeError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  recoverable = true,
  requestId?: string
): ResolveVoucherResponseDto {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
      details,
      recoverable,
    },
    request_id: requestId ?? `req_${Date.now()}`,
    resolved_at: new Date().toISOString(),
  };
}

/**
 * Serialize a pending/processing resolution status (202 Accepted).
 *
 * Returns a lightweight status response without the full result payload,
 * allowing clients to poll until the result is available.
 */
export function serializeResolutionStatus(
  requestId: string,
  request: VoucherResolutionRequest
): {
  success: true;
  status: string;
  data: null;
  request_id: string;
  resolved_at: string;
  created_at: string;
  duration_ms: number | null;
  error: null;
} {
  return {
    success: true,
    status: request.status,
    data: null,
    request_id: requestId,
    resolved_at: request.resolvedAt?.toISOString() ?? new Date().toISOString(),
    created_at: request.requestedAt.toISOString(),
    duration_ms: request.durationMs,
    error: null,
  };
}
