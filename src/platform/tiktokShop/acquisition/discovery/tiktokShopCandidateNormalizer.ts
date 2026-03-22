/**
 * TikTok Shop Candidate Normalizer
 * Normalizes discovery candidates to standard format
 */

import type { TikTokShopDiscoveryCandidate } from '../types.js';
import { TikTokShopCandidateStatus } from '../types.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Normalize a single candidate
 */
export function normalizeTikTokShopDiscoveryCandidate(
  candidate: any
): TikTokShopDiscoveryCandidate {
  const canonicalKey = buildTikTokShopCandidateKey(candidate);

  return {
    id: candidate.id || `candidate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    discoveryJobId: candidate.discoveryJobId,
    candidateKey: candidate.candidateKey || canonicalKey,
    rawReferencePayload: candidate.rawReferencePayload || {},
    canonicalReferenceKey: canonicalKey,
    candidateStatus: determineCandidateStatus(candidate),
    confidenceScore: candidate.confidenceScore || calculateConfidence(candidate),
    createdAt: candidate.createdAt || new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Normalize multiple candidates
 */
export function normalizeTikTokShopDiscoveryCandidates(
  candidates: any[]
): TikTokShopDiscoveryCandidate[] {
  logger.info({ msg: 'Normalizing discovery candidates', count: candidates.length });

  return candidates.map(normalizeTikTokShopDiscoveryCandidate);
}

/**
 * Build canonical candidate key
 */
export function buildTikTokShopCandidateKey(candidate: any): string {
  // Try to extract product ID from URL
  const url = candidate.candidateKey || candidate.rawReferencePayload?.url;

  if (url) {
    // Extract product ID
    const match = url.match(/\/product\/([A-Za-z0-9-]+)/);
    if (match) {
      return `tiktok-product-${match[1]}`;
    }

    // Extract seller ID
    const sellerMatch = url.match(/\/@([\w-]+)/);
    if (sellerMatch) {
      return `tiktok-seller-${sellerMatch[1]}`;
    }

    // Use URL as key if no pattern matches
    return url;
  }

  // Fallback to ID
  return candidate.id || `unknown-${Date.now()}`;
}

function determineCandidateStatus(candidate: any): TikTokShopCandidateStatus {
  // Check if we have required data
  if (!candidate.candidateKey && !candidate.rawReferencePayload?.url) {
    return TikTokShopCandidateStatus.INVALID;
  }

  // Check confidence score
  if (candidate.confidenceScore && candidate.confidenceScore < 0.3) {
    return TikTokShopCandidateStatus.INVALID;
  }

  return TikTokShopCandidateStatus.PENDING;
}

function calculateConfidence(candidate: any): number {
  let confidence = 0.5;

  // Higher confidence with URL
  if (candidate.rawReferencePayload?.url) {
    confidence += 0.2;
  }

  // Higher confidence with text
  if (candidate.rawReferencePayload?.text) {
    confidence += 0.1;
  }

  // Higher confidence with context
  if (candidate.rawReferencePayload?.context) {
    confidence += 0.1;
  }

  // Higher confidence with valid TikTok URL
  const url = candidate.candidateKey || candidate.rawReferencePayload?.url;
  if (url && url.includes('tiktok.com')) {
    confidence += 0.1;
  }

  return Math.min(confidence, 1);
}
