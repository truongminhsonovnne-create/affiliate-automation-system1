/**
 * Voucher Engine Types
 *
 * Shared types/interfaces for the voucher engine.
 */

// =============================================================================
// Platform & Enums
// =============================================================================

/** Supported voucher platforms */
export type SupportedVoucherPlatform = 'shopee' | 'lazada' | 'tiki' | 'tiktok' | 'general';

/** Voucher scope - what the voucher applies to */
export type VoucherScope = 'all' | 'shop' | 'category' | 'product' | 'product_list' | 'shipping';

/** Voucher type */
export type VoucherType =
  | 'platform'      // Platform-wide voucher
  | 'shop'          // Shop-specific voucher
  | 'category'      // Category-specific voucher
  | 'shipping'      // Free shipping voucher
  | 'flash_sale'    // Flash sale voucher
  | 'new_user'      // New user voucher
  | 'special_event' // Special event voucher
  | 'general';      // General fallback voucher

/** Discount type */
export type VoucherDiscountType =
  | 'percentage'       // e.g., 10% off
  | 'fixed_amount'    // e.g., 50,000 VND off
  | 'free_shipping'   // Free shipping
  | 'buy_x_get_y'     // Buy X get Y
  | 'tiered';         // Tiered discount

/** Resolution status */
export type VoucherResolutionStatus =
  | 'pending'      // Request received, not yet processed
  | 'processing'   // Worker picked up, actively resolving
  | 'succeeded'    // Resolution completed with at least one candidate
  | 'failed'       // Unrecoverable error during resolution
  | 'no_match'     // Resolution completed but no eligible voucher found
  | 'expired'      // Request TTL exceeded before completion
  | 'cached';     // Served from cache (short-circuit, no re-resolve)

/** Match type */
export type VoucherMatchType =
  | 'exact'      // Exact product match
  | 'category'   // Category match
  | 'shop'       // Shop match
  | 'platform'   // Platform-wide voucher
  | 'fallback'   // Best available fallback
  | 'none';      // No match

/** Eligibility severity */
export type EligibilitySeverity = 'critical' | 'warning' | 'info';

/** Voucher source */
export type VoucherSource = 'manual' | 'crawled' | 'api' | 'partner';

// =============================================================================
// Domain Models
// =============================================================================

/** Voucher catalog record */
export interface VoucherCatalogRecord {
  id: string;
  platform: SupportedVoucherPlatform;
  voucherCode: string | null;
  voucherTitle: string;
  voucherType: VoucherType;
  discountType: VoucherDiscountType | null;
  discountValue: number | null;
  maxDiscountValue: number | null;
  minimumSpend: number | null;
  appliesToScope: VoucherScope;
  shopId: string | null;
  shopName: string | null;
  categoryId: string | null;
  categoryPath: string[] | null;
  productConstraints: Record<string, unknown> | null;
  eligibilityRules: VoucherEligibilityRule[] | null;
  campaignMetadata: Record<string, unknown> | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  priority: number;
  source: VoucherSource;
  verificationStatus: 'unverified' | 'verified' | 'expired' | 'invalid';
  lastVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Eligibility rule definition */
export interface VoucherEligibilityRule {
  id?: string;
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'regex';
  value: unknown;
  severity: EligibilitySeverity;
  message?: string;
}

// =============================================================================
// Product Reference
// =============================================================================

/** Product reference input */
export interface ProductReferenceInput {
  url: string;
  platform: SupportedVoucherPlatform;
  normalizedUrl?: string;
}

/** Canonical Shopee product reference */
export interface CanonicalShopeeProductReference {
  platform: 'shopee';
  itemId: string;
  shopId: string | null;
  categoryId: string | null;
  categoryPath: string[] | null;
  title: string | null;
  price: number | null;
  originalPrice: number | null;
  imageUrl: string | null;
  shopName: string | null;
  normalizedUrl: string;
  extractedAt: Date;
}

/** Generic product reference for other platforms */
export interface GenericProductReference {
  platform: SupportedVoucherPlatform;
  productId: string | null;
  shopId: string | null;
  keywords: string[];
  categoryHints: string[];
  normalizedUrl: string;
  extractedAt: Date;
}

/** Product reference union */
export type ProductReference = CanonicalShopeeProductReference | GenericProductReference;

/** Product fingerprint for caching */
export interface ProductFingerprint {
  platform: SupportedVoucherPlatform;
  itemId?: string;
  shopId?: string;
  categoryPath?: string[];
  titleHash?: string;
  urlHash: string;
}

// =============================================================================
// Product Context
// =============================================================================

/** Product context for voucher matching */
export interface ProductContext {
  platform: SupportedVoucherPlatform;
  productReference: ProductReference;

  // Core identifiers
  productId: string | null;
  shopId: string | null;
  shopName: string | null;
  categoryId: string | null;
  categoryPath: string[];

  // Product details
  title: string | null;
  price: number | null;
  originalPrice: number | null;
  imageUrl: string | null;

  // URL & source
  normalizedUrl: string;
  sourceUrl: string;

  // Context metadata
  confidence: number;
  contextSource: 'url' | 'crawler' | 'catalog' | 'inferred';
  extractedHints: string[];
  metadata: Record<string, unknown>;

  // Timestamp
  loadedAt: Date;
}

/** Product context summary for logging/debugging */
export interface ProductContextSummary {
  platform: string;
  hasProductId: boolean;
  hasShopId: boolean;
  hasCategory: boolean;
  price: number | null;
  confidence: number;
  source: string;
}

// =============================================================================
// Eligibility
// =============================================================================

/** Eligibility evaluation result */
export interface VoucherEligibilityResult {
  voucher: VoucherCatalogRecord;
  isEligible: boolean;
  eligibilityScore: number; // 0-1

  // Detailed results
  matchedRules: MatchedRule[];
  failedRules: FailedRule[];
  warnings: string[];

  // Context
  matchType: VoucherMatchType;
  applicabilityCertainty: number; // 0-1

  // Metadata
  evaluatedAt: Date;
}

/** Matched eligibility rule */
export interface MatchedRule {
  ruleId: string;
  field: string;
  matchedValue: unknown;
  message?: string;
}

/** Failed eligibility rule */
export interface FailedRule {
  ruleId: string;
  field: string;
  expectedValue: unknown;
  actualValue: unknown;
  severity: EligibilitySeverity;
  message: string;
}

// =============================================================================
// Ranking
// =============================================================================

/** Voucher candidate after eligibility filtering */
export interface VoucherCandidate {
  voucher: VoucherCatalogRecord;
  eligibilityResult: VoucherEligibilityResult;

  // Ranking metrics
  rankingScore: number;
  expectedDiscountValue: number;
  matchType: VoucherMatchType;
  scopePrecision: number; // How precise the match is

  // Details
  applicabilityScore: number;
  valueScore: number;
  freshnessScore: number;
  priorityScore: number;

  // Metadata
  rankedAt: Date;
}

/** Ranking trace for debugging */
export interface VoucherRankingTrace {
  candidateId: string;
  voucherId: string;
  finalScore: number;
  scoreBreakdown: ScoreBreakdown;
  decisionFactors: string[];
  tradeoffs: string[];
}

/** Score breakdown */
export interface ScoreBreakdown {
  applicabilityScore: number;
  valueScore: number;
  freshnessScore: number;
  priorityScore: number;
  totalWeight: number;
}

// =============================================================================
// Resolution
// =============================================================================

/** Resolution request input */
export interface VoucherResolutionRequestInput {
  url: string;
  platform?: SupportedVoucherPlatform;
  forceRefresh?: boolean;
  includeFallback?: boolean;
  maxCandidates?: number;
  options?: ResolutionOptions;
}

/** Resolution options */
export interface ResolutionOptions {
  skipCache?: boolean;
  skipPersistence?: boolean;
  extendedExplanation?: boolean;
  includeTrace?: boolean;
  timeoutMs?: number;
}

/** Voucher resolution request */
export interface VoucherResolutionRequest {
  id: string;
  platform: SupportedVoucherPlatform;
  rawUrl: string;
  normalizedUrl: string;
  productReference: ProductReference;
  status: VoucherResolutionStatus;
  cacheKey: string | null;
  cacheHit: boolean;
  requestedAt: Date;
  resolvedAt: Date | null;
  durationMs: number | null;
  errorMessage: string | null;
}

/** Voucher resolution result */
export interface VoucherResolutionResult {
  requestId: string;
  platform: SupportedVoucherPlatform;
  hasMatch: boolean;
  matchType: VoucherMatchType;

  // Best voucher
  bestVoucher: ResolvedVoucher | null;

  // Candidates
  candidates: VoucherCandidate[];
  eligibleCount: number;
  totalCandidates: number;

  // Explanation
  explanation: VoucherExplainabilityResult;

  // Trace
  rankingTrace: VoucherRankingTrace[];

  // Context
  productContext: ProductContext;
  resolvedAt: Date;
  resolutionDurationMs: number;

  // Metadata
  cached: boolean;
  warnings: VoucherEngineWarning[];
}

/** Resolved voucher for API response */
export interface ResolvedVoucher {
  id: string;
  code: string | null;
  title: string;
  type: VoucherType;
  discountType: VoucherDiscountType | null;
  discountValue: number | null;
  maxDiscountValue: number | null;
  minimumSpend: number | null;
  scope: VoucherScope;
  expiresAt: Date | null;
  shopName: string | null;
  matchType: VoucherMatchType;
  expectedValue: number;
  applicabilityScore: number;
  url: string | null;
}

// =============================================================================
// Explainability
// =============================================================================

/** Explanation result */
export interface VoucherExplainabilityResult {
  hasMatch: boolean;
  bestMatchReason: string | null;
  candidateSummaries: CandidateExplanation[];
  fallbackRecommendation: FallbackExplanation | null;
  noMatchReason: string | null;
  tips: string[];
}

/** Individual candidate explanation */
export interface CandidateExplanation {
  voucherId: string;
  title: string;
  matchReason: string;
  applicabilityDetails: string[];
  valueDetails: string[];
  warnings: string[];
}

/** Fallback explanation */
export interface FallbackExplanation {
  recommendation: string;
  reason: string;
  alternativeStrategies: string[];
}

// =============================================================================
// Caching
// =============================================================================

/** Cache entry */
export interface VoucherCacheEntry {
  cacheKey: string;
  platform: SupportedVoucherPlatform;
  normalizedUrl: string;
  productFingerprint: ProductFingerprint;
  result: VoucherResolutionResult;
  expiresAt: Date;
  createdAt: Date;
  hitCount: number;
  lastHitAt: Date | null;
}

/** Cache key components */
export interface CacheKeyComponents {
  platform: SupportedVoucherPlatform;
  urlHash: string;
  productId?: string;
  shopId?: string;
}

// =============================================================================
// Errors & Warnings
// =============================================================================

/** Engine warning */
export interface VoucherEngineWarning {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  context?: Record<string, unknown>;
}

/** Engine error */
export interface VoucherEngineError {
  code: VoucherErrorCode;
  message: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
}

/** Error codes */
export type VoucherErrorCode =
  | 'INVALID_URL'
  | 'UNSUPPORTED_PLATFORM'
  | 'PRODUCT_RESOLUTION_FAILED'
  | 'CONTEXT_LOAD_FAILED'
  | 'CATALOG_LOAD_FAILED'
  | 'ELIGIBILITY_EVAL_FAILED'
  | 'RANKING_FAILED'
  | 'CACHE_ERROR'
  | 'PERSISTENCE_ERROR'
  | 'TIMEOUT'
  | 'INTERNAL_ERROR';

// =============================================================================
// API DTOs
// =============================================================================

/** API request DTO */
export interface ResolveVoucherRequestDto {
  url: string;
  platform?: SupportedVoucherPlatform;
  force_refresh?: boolean;
  include_fallback?: boolean;
  max_candidates?: number;
}

/** API response DTO */
export interface ResolveVoucherResponseDto {
  success: boolean;
  data: VoucherResolutionResultDto | null;
  error: VoucherEngineError | null;
  request_id: string;
  resolved_at: string;
}

/** Resolution result DTO */
export interface VoucherResolutionResultDto {
  has_match: boolean;
  match_type: VoucherMatchType;
  best_voucher: ResolvedVoucherDto | null;
  candidates: ResolvedVoucherDto[];
  eligible_count: number;
  explanation: VoucherExplanationDto;
  product_context: ProductContextDto;
  cached: boolean;
  warnings: VoucherEngineWarning[];
}

/** Resolved voucher DTO */
export interface ResolvedVoucherDto {
  id: string;
  code: string | null;
  title: string;
  type: VoucherType;
  discount_type: VoucherDiscountType | null;
  discount_value: number | null;
  max_discount_value: number | null;
  minimum_spend: number | null;
  scope: VoucherScope;
  expires_at: string | null;
  shop_name: string | null;
  match_type: VoucherMatchType;
  expected_value: number;
  applicability_score: number;
  url: string | null;
}

/** Product context DTO */
export interface ProductContextDto {
  platform: string;
  product_id: string | null;
  shop_id: string | null;
  shop_name: string | null;
  category_path: string[];
  title: string | null;
  price: number | null;
  normalized_url: string;
  confidence: number;
  source: string;
}

/** Explanation DTO */
export interface VoucherExplanationDto {
  has_match: boolean;
  best_match_reason: string | null;
  candidate_summaries: CandidateExplanationDto[];
  fallback_recommendation: FallbackExplanationDto | null;
  no_match_reason: string | null;
  tips: string[];
}

/** Candidate explanation DTO */
export interface CandidateExplanationDto {
  voucher_id: string;
  title: string;
  match_reason: string;
  applicability_details: string[];
  value_details: string[];
  warnings: string[];
}

/** Fallback explanation DTO */
export interface FallbackExplanationDto {
  recommendation: string;
  reason: string;
  alternative_strategies: string[];
}
