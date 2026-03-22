/**
 * Voucher Engine API Types
 *
 * API-facing contracts for voucher resolution.
 */

import type {
  SupportedVoucherPlatform,
  VoucherType,
  VoucherDiscountType,
  VoucherScope,
  VoucherMatchType,
} from '../types';

/**
 * Resolve voucher request DTO
 */
export interface ResolveVoucherRequestDto {
  /** Product URL to resolve */
  url: string;
  /** Platform (optional, auto-detected) */
  platform?: SupportedVoucherPlatform;
  /** Force refresh (skip cache) */
  force_refresh?: boolean;
  /** Include fallback vouchers */
  include_fallback?: boolean;
  /** Maximum candidates to return */
  max_candidates?: number;
}

/**
 * Resolve voucher response DTO
 */
export interface ResolveVoucherResponseDto {
  /** Success status */
  success: boolean;
  /** Result data */
  data: VoucherResolutionResultDto | null;
  /** Error details */
  error: VoucherErrorDto | null;
  /** Request ID */
  request_id: string;
  /** Resolution timestamp */
  resolved_at: string;
}

/**
 * Voucher resolution result DTO
 */
export interface VoucherResolutionResultDto {
  /** Whether a match was found */
  has_match: boolean;
  /** Type of match */
  match_type: VoucherMatchType;
  /** Best voucher */
  best_voucher: ResolvedVoucherDto | null;
  /** All candidate vouchers */
  candidates: ResolvedVoucherDto[];
  /** Number of eligible vouchers */
  eligible_count: number;
  /** Explanation */
  explanation: VoucherExplanationDto;
  /** Product context */
  product_context: ProductContextDto;
  /** Whether result was from cache */
  cached: boolean;
  /** Warnings */
  warnings: VoucherWarningDto[];
}

/**
 * Resolved voucher DTO
 */
export interface ResolvedVoucherDto {
  /** Voucher ID */
  id: string;
  /** Voucher code */
  code: string | null;
  /** Voucher title */
  title: string;
  /** Voucher type */
  type: VoucherType;
  /** Discount type */
  discount_type: VoucherDiscountType | null;
  /** Discount value */
  discount_value: number | null;
  /** Maximum discount value */
  max_discount_value: number | null;
  /** Minimum spend */
  minimum_spend: number | null;
  /** Scope */
  scope: VoucherScope;
  /** Expiry date */
  expires_at: string | null;
  /** Shop name */
  shop_name: string | null;
  /** Match type */
  match_type: VoucherMatchType;
  /** Expected discount value */
  expected_value: number;
  /** Applicability score */
  applicability_score: number;
  /** Apply URL */
  url: string | null;
}

/**
 * Product context DTO
 */
export interface ProductContextDto {
  /** Platform */
  platform: string;
  /** Product ID */
  product_id: string | null;
  /** Shop ID */
  shop_id: string | null;
  /** Shop name */
  shop_name: string | null;
  /** Category path */
  category_path: string[];
  /** Product title */
  title: string | null;
  /** Product price */
  price: number | null;
  /** Normalized URL */
  normalized_url: string;
  /** Confidence score */
  confidence: number;
  /** Context source */
  source: string;
}

/**
 * Explanation DTO
 */
export interface VoucherExplanationDto {
  /** Whether there is a match */
  has_match: boolean;
  /** Best match reason */
  best_match_reason: string | null;
  /** Candidate summaries */
  candidate_summaries: CandidateExplanationDto[];
  /** Fallback recommendation */
  fallback_recommendation: FallbackExplanationDto | null;
  /** No match reason */
  no_match_reason: string | null;
  /** Tips for user */
  tips: string[];
}

/**
 * Candidate explanation DTO
 */
export interface CandidateExplanationDto {
  /** Voucher ID */
  voucher_id: string;
  /** Voucher title */
  title: string;
  /** Match reason */
  match_reason: string;
  /** Applicability details */
  applicability_details: string[];
  /** Value details */
  value_details: string[];
  /** Warnings */
  warnings: string[];
}

/**
 * Fallback explanation DTO
 */
export interface FallbackExplanationDto {
  /** Recommendation */
  recommendation: string;
  /** Reason */
  reason: string;
  /** Alternative strategies */
  alternative_strategies: string[];
}

/**
 * Error DTO
 */
export interface VoucherErrorDto {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Error details */
  details?: Record<string, unknown>;
  /** Whether error is recoverable */
  recoverable: boolean;
}

/**
 * Warning DTO
 */
export interface VoucherWarningDto {
  /** Warning code */
  code: string;
  /** Warning message */
  message: string;
  /** Warning severity */
  severity: 'low' | 'medium' | 'high';
  /** Additional context */
  context?: Record<string, unknown>;
}
