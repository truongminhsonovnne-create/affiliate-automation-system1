// =============================================================================
// Public API Types
// Production-grade type definitions for public voucher resolution API
// =============================================================================

// =============================================================================
// Request Types
// =============================================================================

export interface PublicVoucherResolveRequest {
  /** Shopee product URL or product ID */
  input: string;
  /** Optional: preferred number of candidates to return */
  limit?: number;
  /** Optional: request ID for idempotency */
  requestId?: string;
  /** Optional: client information for analytics */
  clientInfo?: PublicClientInfo;
}

export interface PublicClientInfo {
  /** Client IP (may be set by proxy) */
  ip?: string;
  /** Client user agent */
  userAgent?: string;
  /** Client platform: web, mobile, api */
  platform?: 'web' | 'mobile' | 'api';
  /** Referrer URL */
  referrer?: string;
}

// =============================================================================
// Response Types
// =============================================================================

export interface PublicVoucherResolveResponse {
  /** Unique request identifier */
  requestId: string;
  /** Resolution status */
  status: PublicVoucherResolveStatus;
  /** Best voucher match (if any) */
  bestMatch: PublicVoucherBestMatchDto | null;
  /** Alternative voucher candidates */
  candidates: PublicVoucherCandidateDto[];
  /** Performance metadata */
  performance: PublicResolutionPerformanceMeta;
  /** Cache metadata (if served from cache) */
  cache?: PublicResolutionCacheMeta;
  /** Explanations for the resolution */
  explanation: PublicVoucherExplanationDto | null;
  /** Warnings (non-blocking issues) */
  warnings: PublicApiWarning[];
}

export type PublicVoucherResolveStatus =
  | 'success'      // Found and returned vouchers
  | 'no_match'     // Valid input but no vouchers found
  | 'invalid_input' // Input validation failed
  | 'rate_limited' // Too many requests
  | 'error';       // Internal error

// =============================================================================
// DTO Types
// =============================================================================

export interface PublicVoucherBestMatchDto {
  /** Voucher ID */
  voucherId: string;
  /** Voucher code for user to use */
  code: string;
  /** Discount type */
  discountType: PublicDiscountType;
  /** Discount value (percentage or amount) */
  discountValue: string;
  /** Minimum spend requirement */
  minSpend: string | null;
  /** Maximum discount cap (if any) */
  maxDiscount: string | null;
  /** Validity end date */
  validUntil: string;
  /** Short headline for the voucher */
  headline: string;
  /** Product categories this voucher applies to */
  applicableCategories: string[];
}

export interface PublicVoucherCandidateDto {
  /** Voucher ID */
  voucherId: string;
  /** Voucher code */
  code: string;
  /** Discount display text */
  discountText: string;
  /** Relevance rank (1 = best) */
  rank: number;
  /** Why this voucher was recommended */
  reason?: string;
  /** Cost tier for this request */
  tier?: string;
  /** Whether using degraded mode (store failed) */
  degraded?: boolean;
}

export interface PublicVoucherExplanationDto {
  /** Short explanation of why these vouchers were recommended */
  summary: string;
  /** Tips for the user */
  tips: string[];
  /** Additional context */
  context?: string;
}

export type PublicDiscountType =
  | 'percentage'      // e.g., "15% off"
  | 'fixed_amount'    // e.g., "₫50,000 off"
  | 'free_shipping'   // e.g., "Free shipping"
  | 'buy_x_get_y';    // e.g., "Buy 2 Get 1"

// =============================================================================
// Metadata Types
// =============================================================================

export interface PublicResolutionPerformanceMeta {
  /** Total resolution time in milliseconds */
  totalLatencyMs: number;
  /** Whether this was served from cache */
  servedFromCache: boolean;
  /** Cache TTL remaining in seconds (if cached) */
  cacheTtlSeconds?: number;
  /** Timestamp when resolution occurred */
  resolvedAt: string;
}

export interface PublicResolutionCacheMeta {
  /** Cache hit or miss */
  hit: boolean;
  /** Cache key used */
  cacheKey: string;
  /** Time to live remaining */
  ttlSeconds: number;
  /** When the cache entry was created */
  cachedAt: string;
}

// =============================================================================
// Error & Warning Types
// =============================================================================

export interface PublicApiWarning {
  /** Warning code */
  code: string;
  /** Warning message */
  message: string;
  /** Severity level */
  severity: 'info' | 'warning';
}

export interface PublicApiError {
  /** Error code */
  code: string;
  /** User-friendly error message */
  message: string;
  /** Technical details (only in development) */
  details?: string;
}

// =============================================================================
// Rate Limiting Types
// =============================================================================

export interface PublicRateLimitDecision {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Rate limit status */
  status: 'allowed' | 'soft_blocked' | 'hard_blocked';
  /** Number of requests remaining in window */
  remaining: number;
  /** Reset timestamp */
  resetAt: string;
  /** Retry after seconds (if blocked) */
  retryAfterSeconds?: number;
  /** Reason for the decision */
  reason?: string;
  /** Cost tier applied */
  tier?: string;
  /** Whether the store degraded (returned allowed=true as fallback) */
  degraded?: boolean;
}

export interface PublicRateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window size in seconds */
  windowSeconds: number;
  /** Whether to use soft blocking */
  softBlockEnabled: boolean;
  /** Soft block threshold (percentage of max) */
  softBlockThreshold: number;
}

// =============================================================================
// Analytics Types
// =============================================================================

export interface PublicAnalyticsEventInput {
  /** Event name */
  eventName: string;
  /** User/client identifier */
  userId?: string;
  /** Session identifier */
  sessionId: string;
  /** Event properties */
  properties: Record<string, unknown>;
  /** Timestamp */
  timestamp: string;
}

// =============================================================================
// Input Validation Types
// =============================================================================

export interface PublicInputValidationResult {
  /** Whether input is valid */
  valid: boolean;
  /** Normalized/cleaned input */
  normalizedInput: string;
  /** Validation errors (if invalid) */
  errors: PublicInputValidationError[];
  /** Sanitized input for processing */
  sanitizedInput: string;
}

export interface PublicInputValidationError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Field that caused the error */
  field?: string;
}

// =============================================================================
// URL Parsing Types
// =============================================================================

export interface PublicShopeeUrlParseResult {
  /** Whether parsing was successful */
  success: boolean;
  /** Parsed product ID */
  productId?: string;
  /** Parsed shop ID */
  shopId?: string;
  /** Normalized URL */
  normalizedUrl?: string;
  /** Parse errors (if failed) */
  errors?: string[];
}
