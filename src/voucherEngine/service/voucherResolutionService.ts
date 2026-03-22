/**
 * Voucher Resolution Service
 *
 * Main orchestrator for voucher resolution.
 */

import {
  VoucherResolutionRequestInput,
  VoucherResolutionResult,
  SupportedVoucherPlatform,
  ProductContext,
} from '../types';

import {
  resolveProductReference,
  buildProductReferenceFingerprint,
} from '../productReference/productReferenceResolver';
import { loadProductContextFromReference } from '../productContext/productContextLoader';
import { loadRelevantVoucherUniverse } from '../catalog/voucherCatalogLoader';
import { evaluateVoucherEligibilityBatch } from '../eligibility/voucherEligibilityEvaluator';
import { rankVoucherCandidates, buildVoucherRankingTrace } from '../ranking/voucherRankingEngine';
import { buildBestVoucherExplanation } from '../explainability/voucherExplanationBuilder';
import {
  buildVoucherResolutionCacheKey,
  getCachedVoucherResolution,
  setCachedVoucherResolution,
} from '../cache/voucherResolutionCache';
import {
  createVoucherResolutionRequest,
  completeVoucherResolutionRequest,
  getVoucherResolutionResult,
} from '../persistence/voucherResolutionPersistence';

import {
  DEFAULT_MAX_CANDIDATES,
  DEFAULT_INCLUDE_FALLBACK,
  DEFAULT_RESOLUTION_TIMEOUT_MS,
} from '../constants';

/**
 * Resolution service options
 */
export interface ResolutionServiceOptions {
  maxCandidates?: number;
  includeFallback?: boolean;
  timeoutMs?: number;
  skipCache?: boolean;
  skipPersistence?: boolean;
}

/**
 * Resolve best voucher for Shopee URL
 */
export async function resolveBestVoucherForShopeeUrl(
  input: VoucherResolutionRequestInput,
  options?: ResolutionServiceOptions
): Promise<VoucherResolutionResult> {
  return resolveVoucherInternal(input, {
    ...options,
    maxCandidates: options?.maxCandidates ?? DEFAULT_MAX_CANDIDATES,
    includeFallback: options?.includeFallback ?? DEFAULT_INCLUDE_FALLBACK,
    timeoutMs: options?.timeoutMs ?? DEFAULT_RESOLUTION_TIMEOUT_MS,
  });
}

/**
 * Resolve voucher candidates for Shopee URL
 */
export async function resolveVoucherCandidatesForShopeeUrl(
  input: VoucherResolutionRequestInput,
  options?: ResolutionServiceOptions
): Promise<VoucherResolutionResult> {
  return resolveVoucherInternal(input, {
    ...options,
    maxCandidates: options?.maxCandidates ?? 10, // More candidates for candidate listing
    includeFallback: true,
  });
}

/**
 * Resolve voucher for product context
 */
export async function resolveVoucherForProductContext(
  context: ProductContext,
  options?: ResolutionServiceOptions
): Promise<VoucherResolutionResult> {
  return resolveVoucherFromContext(context, {
    ...options,
    maxCandidates: options?.maxCandidates ?? DEFAULT_MAX_CANDIDATES,
    includeFallback: options?.includeFallback ?? DEFAULT_INCLUDE_FALLBACK,
  });
}

// =============================================================================
// Public Lookup (GET /resolve/:requestId)
// =============================================================================

/**
 * Retrieve a previously completed resolution result by its requestId.
 *
 * This is the implementation behind GET /api/v1/voucher/resolve/:requestId.
 * Returns null if the request has not been completed or has expired.
 */
export async function getVoucherResolutionResultByRequestId(
  requestId: string
): Promise<VoucherResolutionResult | null> {
  if (!requestId || typeof requestId !== 'string') {
    return null;
  }

  // Sanitise: only allow our own request ID format
  if (!/^req_[a-z0-9_]+$/i.test(requestId)) {
    return null;
  }

  return getVoucherResolutionResult(requestId);
}

// =============================================================================
// Private Implementation
// =============================================================================

/**
 * Internal resolution implementation
 */
async function resolveVoucherInternal(
  input: VoucherResolutionRequestInput,
  options: Required<ResolutionServiceOptions>
): Promise<VoucherResolutionResult> {
  const startTime = Date.now();
  const warnings: string[] = [];

  try {
    // Step 1: Validate and resolve product reference
    const referenceResult = await resolveProductReference({
      url: input.url,
      platform: input.platform || 'shopee',
    });

    if (!referenceResult.success || !referenceResult.reference) {
      throw new Error(`Product resolution failed: ${referenceResult.errors.join(', ')}`);
    }

    warnings.push(...referenceResult.warnings);

    // Step 2: Load product context
    const productContext = await loadProductContextFromReference(referenceResult.reference);

    // Step 3: Check cache
    const cacheKey = buildVoucherResolutionCacheKey(
      input.url,
      productContext.platform
    );

    let cachedResult: VoucherResolutionResult | null = null;
    let cached = false;

    if (!options.skipCache) {
      cachedResult = getCachedVoucherResolution(cacheKey);
      if (cachedResult) {
        cached = true;
        warnings.push('Result served from cache');

        // Persist request even for cache hits
        if (!options.skipPersistence) {
          try {
            await createVoucherResolutionRequest({
              platform: productContext.platform,
              rawUrl: input.url,
              normalizedUrl: referenceResult.reference.normalizedUrl,
              productReference: referenceResult.reference,
              cacheKey,
              cacheHit: true,
            });
          } catch {
            // Ignore persistence errors for cache hits
          }
        }

        return cachedResult;
      }
    }

    // Step 4: Load voucher universe
    const catalogResult = await loadRelevantVoucherUniverse(productContext);

    if (catalogResult.vouchers.length === 0) {
      warnings.push('No active vouchers found for this platform');
    }

    warnings.push(...catalogResult.warnings);

    // Step 5: Evaluate eligibility
    const eligibilityResults = evaluateVoucherEligibilityBatch(
      catalogResult.vouchers,
      productContext
    );

    // Step 6: Rank candidates
    const candidates = rankVoucherCandidates(eligibilityResults, productContext, {
      maxCandidates: options.maxCandidates,
      includeTrace: true,
    });

    // If no eligible candidates but we have fallback option
    if (candidates.length === 0 && options.includeFallback) {
      // Get non-eligible but best-matching vouchers as fallback
      const fallbackCandidates = rankVoucherCandidates(
        eligibilityResults.filter((r) => r.eligibilityScore > 0.1),
        productContext,
        {
          maxCandidates: 3,
          minScoreThreshold: 1,
        }
      );

      if (fallbackCandidates.length > 0) {
        candidates.push(...fallbackCandidates);
      }
    }

    // Step 7: Build explanation
    const bestCandidate = candidates[0];
    const hasMatch = !!bestCandidate;
    const matchType = hasMatch ? bestCandidate.matchType : 'none';

    const result: VoucherResolutionResult = {
      requestId: `req_${Date.now()}`,
      platform: productContext.platform,
      hasMatch,
      matchType,
      bestVoucher: hasMatch ? mapToResolvedVoucher(bestCandidate) : null,
      candidates: candidates.map(mapToResolvedVoucher),
      eligibleCount: eligibilityResults.filter((r) => r.isEligible).length,
      totalCandidates: catalogResult.vouchers.length,
      explanation: buildBestVoucherExplanation(
        {
          hasMatch,
          matchType,
          bestVoucher: hasCandidate(bestCandidate) ? mapToResolvedVoucher(bestCandidate) : null,
          candidates: candidates.map(mapToResolvedVoucher),
          productContext,
          resolvedAt: new Date(),
          resolutionDurationMs: Date.now() - startTime,
          cached: false,
          warnings: [],
        },
        productContext
      ),
      rankingTrace: buildVoucherRankingTrace(candidates),
      productContext,
      resolvedAt: new Date(),
      resolutionDurationMs: Date.now() - startTime,
      cached: false,
      warnings,
    };

    // Step 8: Cache result
    if (!options.skipCache && hasMatch) {
      try {
        setCachedVoucherResolution(cacheKey, result);
      } catch {
        // Ignore cache errors
      }
    }

    // Step 9: Persist request/result
    if (!options.skipPersistence) {
      try {
        const request = await createVoucherResolutionRequest({
          platform: productContext.platform,
          rawUrl: input.url,
          normalizedUrl: referenceResult.reference.normalizedUrl,
          productReference: referenceResult.reference,
          cacheKey,
          cacheHit: false,
        });

        // Stamp the real persistence ID onto the result so the API returns
        // the correct requestId that clients can later look up
        result.requestId = request.id;

        await completeVoucherResolutionRequest(request.id, result);
      } catch {
        // Ignore persistence errors
      }
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const duration = Date.now() - startTime;

    return {
      requestId: `req_${Date.now()}`,
      platform: (input.platform || 'shopee') as SupportedVoucherPlatform,
      hasMatch: false,
      matchType: 'none',
      bestVoucher: null,
      candidates: [],
      eligibleCount: 0,
      totalCandidates: 0,
      explanation: {
        hasMatch: false,
        bestMatchReason: null,
        candidateSummaries: [],
        fallbackRecommendation: null,
        noMatchReason: errorMessage,
        tips: ['Thử lại sau hoặc liên hệ hỗ trợ'],
      },
      rankingTrace: [],
      productContext: {} as ProductContext,
      resolvedAt: new Date(),
      resolutionDurationMs: duration,
      cached: false,
      warnings: [...warnings, `Error: ${errorMessage}`],
    };
  }
}

/**
 * Resolve from pre-loaded context
 */
async function resolveVoucherFromContext(
  productContext: ProductContext,
  options: Required<ResolutionServiceOptions>
): Promise<VoucherResolutionResult> {
  const startTime = Date.now();

  // Load voucher universe
  const catalogResult = await loadRelevantVoucherUniverse(productContext);

  // Evaluate eligibility
  const eligibilityResults = evaluateVoucherEligibilityBatch(
    catalogResult.vouchers,
    productContext
  );

  // Rank candidates
  const candidates = rankVoucherCandidates(eligibilityResults, productContext, {
    maxCandidates: options.maxCandidates,
    includeTrace: true,
  });

  const bestCandidate = candidates[0];
  const hasMatch = !!bestCandidate;

  return {
    requestId: `req_${Date.now()}`,
    platform: productContext.platform,
    hasMatch,
    matchType: hasMatch ? bestCandidate.matchType : 'none',
    bestVoucher: hasMatch ? mapToResolvedVoucher(bestCandidate) : null,
    candidates: candidates.map(mapToResolvedVoucher),
    eligibleCount: eligibilityResults.filter((r) => r.isEligible).length,
    totalCandidates: catalogResult.vouchers.length,
    explanation: buildBestVoucherExplanation(
      {
        hasMatch,
        matchType: hasMatch ? bestCandidate.matchType : 'none',
        bestVoucher: hasMatch ? mapToResolvedVoucher(bestCandidate) : null,
        candidates: candidates.map(mapToResolvedVoucher),
        productContext,
        resolvedAt: new Date(),
        resolutionDurationMs: 0,
        cached: false,
        warnings: [],
      },
      productContext
    ),
    rankingTrace: buildVoucherRankingTrace(candidates),
    productContext,
    resolvedAt: new Date(),
    resolutionDurationMs: Date.now() - startTime,
    cached: false,
    warnings: [],
  };
}

/**
 * Map candidate to resolved voucher DTO
 */
function mapToResolvedVoucher(candidate: any) {
  const { voucher, matchType, expectedDiscountValue, applicabilityScore } = candidate;

  return {
    id: voucher.id,
    code: voucher.voucherCode,
    title: voucher.voucherTitle,
    type: voucher.voucherType,
    discountType: voucher.discountType,
    discountValue: voucher.discountValue,
    maxDiscountValue: voucher.maxDiscountValue,
    minimumSpend: voucher.minimumSpend,
    scope: voucher.appliesToScope,
    expiresAt: voucher.endsAt,
    shopName: voucher.shopName,
    matchType,
    expectedValue: expectedDiscountValue,
    applicabilityScore,
    url: null,
  };
}

/**
 * Check if candidate exists
 */
function hasCandidate(candidate: any): candidate is { voucher: any; matchType: any } {
  return candidate !== null && candidate !== undefined;
}
