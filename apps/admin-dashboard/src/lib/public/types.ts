/**
 * Public API Types
 *
 * These mirror the types from src/publicApi/types.ts but are duplicated here
 * so the Next.js app does not need to import from the internal src/ directory.
 * Keep this file in sync with the canonical types in src/publicApi/types.ts.
 */

// =============================================================================
// Request
// =============================================================================

export interface PublicVoucherResolveRequest {
  input: string;
  limit?: number;
  requestId?: string;
  clientInfo?: PublicClientInfo;
}

export interface PublicClientInfo {
  ip?: string;
  userAgent?: string;
  platform?: 'web' | 'mobile' | 'api';
  referrer?: string;
}

// =============================================================================
// Response
// =============================================================================

export interface PublicVoucherResolveResponse {
  requestId: string;
  status: PublicVoucherResolveStatus;
  bestMatch: PublicVoucherBestMatchDto | null;
  candidates: PublicVoucherCandidateDto[];
  performance: PublicResolutionPerformanceMeta;
  cache?: PublicResolutionCacheMeta;
  explanation: PublicVoucherExplanationDto | null;
  warnings: PublicApiWarning[];
  /** Confidence score 0-1 indicating quality of match */
  confidenceScore?: number;
  /** Source that provided the best match (e.g. "AccessTrade", "MasOffer", "MasOffer_broad") */
  matchedSource?: string;
  /** Data freshness descriptor */
  dataFreshness?: DataFreshnessLevel;
}

export type DataFreshnessLevel = 'live' | 'recent' | 'stale' | 'unknown';

export type PublicVoucherResolveStatus =
  | 'success'
  | 'no_match'
  | 'invalid_input'
  | 'rate_limited'
  | 'error';

export interface PublicVoucherBestMatchDto {
  voucherId: string;
  code: string;
  discountType: PublicDiscountType;
  discountValue: string;
  minSpend: string | null;
  maxDiscount: string | null;
  validUntil: string;
  headline: string;
  applicableCategories: string[];
}

export interface PublicVoucherCandidateDto {
  voucherId: string;
  code: string;
  discountText: string;
  rank: number;
  reason?: string;
  tier?: string;
  degraded?: boolean;
}

export interface PublicVoucherExplanationDto {
  summary: string;
  tips: string[];
  context?: string;
}

export type PublicDiscountType =
  | 'percentage'
  | 'fixed_amount'
  | 'free_shipping'
  | 'buy_x_get_y';

export interface PublicResolutionPerformanceMeta {
  totalLatencyMs: number;
  servedFromCache: boolean;
  cacheTtlSeconds?: number;
  resolvedAt: string;
}

export interface PublicResolutionCacheMeta {
  hit: boolean;
  cacheKey: string;
  ttlSeconds: number;
  cachedAt: string;
}

export interface PublicApiWarning {
  code: string;
  message: string;
  severity: 'info' | 'warning';
}

export interface PublicApiError {
  code: string;
  message: string;
  details?: string;
}

// =============================================================================
// Async Resolution Types
// =============================================================================

/**
 * Resolution phases — represent the full lifecycle of an async resolution.
 * These are UI-facing phases, distinct from the raw API status codes.
 */
export type PublicResolutionPhase =
  | 'idle'
  | 'queued'
  | 'processing'
  | 'retrying'
  | 'success'
  | 'no_match'
  | 'invalid_link'
  | 'rate_limited'
  | 'expired'
  | 'not_found'
  | 'failed';

/**
 * Raw queued response returned by GET /:requestId when still processing.
 * Mirrors serializeResolutionStatus from voucher engine.
 */
export interface QueuedResolutionResponse {
  /** Always present for queued/processing states */
  requestId: string;
  /** HTTP status this maps to: 202 = pending/processing, 200 = complete */
  httpStatus: number;
  /** Resolution status from the engine */
  resolutionStatus: EngineResolutionStatus | null;
  /** Timestamp when the request was created */
  createdAt: string | null;
  /** Timestamp when resolution completed (null if still pending) */
  resolvedAt: string | null;
  /** Observed duration in ms (null if still pending) */
  durationMs: number | null;
  /** Error code when status is terminal-with-error (not_found, failed) */
  errorCode?: string | null;
  /** Human-readable message for terminal-with-error states */
  message?: string | null;
}

/**
 * Engine resolution statuses — mirror VoucherResolutionStatus from types.ts.
 * These come from the raw HTTP response, not mapped to UI phases.
 */
export type EngineResolutionStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'no_match'
  | 'failed'
  | 'expired'
  | 'completed'
  | 'cached'
  | 'not_found'
  | null;

/**
 * Result of mapping a queued API response to our UI phase.
 */
export interface PhaseMappingResult {
  phase: PublicResolutionPhase;
  isDone: boolean;
  isRetryable: boolean;
  retryCount: number;
  elapsedMs: number;
  serverDurationMs: number | null;
}
