/**
 * TikTok Shop Candidate Deduper
 * Deduplicates discovery candidates
 */

import type { TikTokShopDiscoveryCandidate } from '../types.js';
import { TikTokShopCandidateStatus } from '../types.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Deduplicate candidates
 */
export function dedupeTikTokShopCandidates(
  candidates: TikTokShopDiscoveryCandidate[]
): {
  deduped: TikTokShopDiscoveryCandidate[];
  duplicates: number;
} {
  logger.info({ msg: 'Deduplicating candidates', count: candidates.length });

  const seen = new Map<string, TikTokShopDiscoveryCandidate>();
  const deduped: TikTokShopDiscoveryCandidate[] = [];
  let duplicates = 0;

  for (const candidate of candidates) {
    const key = getCandidateDedupKey(candidate);

    if (seen.has(key)) {
      duplicates++;
      // Keep the one with higher confidence
      const existing = seen.get(key)!;
      if ((candidate.confidenceScore || 0) > (existing.confidenceScore || 0)) {
        seen.set(key, candidate);
      }
    } else {
      seen.set(key, candidate);
      deduped.push(candidate);
    }
  }

  logger.info({ msg: 'Deduplication complete', original: candidates.length, deduped: deduped.length, duplicates });

  return { deduped, duplicates };
}

/**
 * Find equivalent candidate
 */
export function findEquivalentTikTokShopCandidate(
  candidates: TikTokShopDiscoveryCandidate[],
  referenceKey: string
): TikTokShopDiscoveryCandidate | null {
  const normalizedKey = normalizeReferenceKey(referenceKey);

  return candidates.find((c) => {
    const candidateKey = c.canonicalReferenceKey || c.candidateKey;
    return normalizeReferenceKey(candidateKey) === normalizedKey;
  }) || null;
}

/**
 * Build dedup summary
 */
export function buildTikTokShopCandidateDedupSummary(
  original: number,
  deduped: number
): {
  original: number;
  deduped: number;
  duplicates: number;
  dedupRate: number;
} {
  const duplicates = original - deduped;
  const dedupRate = original > 0 ? (duplicates / original) * 100 : 0;

  return {
    original,
    deduped,
    duplicates,
    dedupRate,
  };
}

function getCandidateDedupKey(candidate: TikTokShopDiscoveryCandidate): string {
  // Use canonical key if available
  if (candidate.canonicalReferenceKey) {
    return normalizeReferenceKey(candidate.canonicalReferenceKey);
  }

  // Use candidate key
  if (candidate.candidateKey) {
    return normalizeReferenceKey(candidate.candidateKey);
  }

  // Fallback to ID
  return candidate.id;
}

function normalizeReferenceKey(key: string): string {
  if (!key) return '';

  // Convert to lowercase
  let normalized = key.toLowerCase();

  // Remove trailing slashes
  normalized = normalized.replace(/\/+$/, '');

  // Normalize product IDs
  if (normalized.includes('tiktok-product-')) {
    return normalized;
  }

  // Extract product ID from URL if present
  const match = normalized.match(/\/product\/([a-z0-9-]+)/);
  if (match) {
    return `tiktok-product-${match[1]}`;
  }

  return normalized;
}
