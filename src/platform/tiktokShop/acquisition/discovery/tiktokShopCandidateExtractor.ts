/**
 * TikTok Shop Candidate Extractor
 * Extracts discovery candidates from TikTok Shop surfaces
 */

import type { TikTokShopDiscoveryCandidate, TikTokShopExtractionEvidence } from '../types.js';
import { TikTokShopCandidateStatus } from '../types.js';
import { TIKTOK_SHOP_URL_PATTERNS } from '../constants.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Extract discovery candidates from page
 */
export async function extractTikTokShopDiscoveryCandidates(
  page: any,
  options?: {
    maxCandidates?: number;
  }
): Promise<TikTokShopDiscoveryCandidate[]> {
  logger.info({ msg: 'Extracting discovery candidates from page' });

  const candidates: TikTokShopDiscoveryCandidate[] = [];

  try {
    // Extract product links from page
    const productLinks = await extractTikTokShopCandidateReferences(page);

    for (const link of productLinks.slice(0, options?.maxCandidates || 50)) {
      candidates.push({
        id: `candidate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        candidateKey: link.url,
        rawReferencePayload: {
          url: link.url,
          text: link.text,
          context: link.context,
        },
        canonicalReferenceKey: extractProductIdFromUrl(link.url),
        candidateStatus: TikTokShopCandidateStatus.PENDING,
        confidenceScore: calculateConfidenceScore(link),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    logger.info({ msg: 'Extracted candidates', count: candidates.length });

    return candidates;
  } catch (error) {
    logger.error({ msg: 'Failed to extract candidates', error });
    return [];
  }
}

/**
 * Extract candidate references from page
 */
export async function extractTikTokShopCandidateReferences(
  page: any
): Promise<Array<{
  url: string;
  text: string;
  context: string;
}>> {
  const references: Array<{ url: string; text: string; context: string }> = [];

  try {
    // Evaluate page for product links
    const links = await page.evaluate(() => {
      const results: Array<{ url: string; text: string; context: string }> = [];

      // Find all anchor tags
      const anchors = document.querySelectorAll('a[href]');

      anchors.forEach((anchor) => {
        const href = anchor.getAttribute('href');
        const text = anchor.textContent?.trim() || '';

        if (href && isProductLink(href)) {
          // Get context (parent elements)
          let context = '';
          const parent = anchor.closest('[class*="product"], [class*="item"], [data-testid]');
          if (parent) {
            context = parent.className || '';
          }

          results.push({
            url: href,
            text: text.substring(0, 200),
            context,
          });
        }
      });

      return results;
    });

    // Filter valid TikTok Shop links
    for (const link of links) {
      if (isValidTikTokShopUrl(link.url)) {
        references.push(link);
      }
    }

    return references;
  } catch (error) {
    logger.error({ msg: 'Failed to extract references', error });
    return [];
  }
}

function isProductLink(url: string): boolean {
  return TIKTOK_SHOP_URL_PATTERNS.PRODUCT_PAGE.some((pattern) => pattern.test(url));
}

function isValidTikTokShopUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('tiktok.com');
  } catch {
    return false;
  }
}

function extractProductIdFromUrl(url: string): string | undefined {
  // Try to extract product ID from URL
  const match = url.match(/\/product\/([A-Za-z0-9-]+)/);
  if (match) {
    return match[1];
  }

  // Fallback to full URL
  return url;
}

function calculateConfidenceScore(link: { url: string; text: string; context: string }): number {
  let score = 0.5;

  // Higher confidence if URL has product ID
  if (link.url.includes('/product/')) {
    score += 0.2;
  }

  // Higher confidence if has text
  if (link.text.length > 10) {
    score += 0.1;
  }

  // Higher confidence if has context
  if (link.context.length > 0) {
    score += 0.1;
  }

  // Higher confidence if URL is complete
  if (link.url.startsWith('http')) {
    score += 0.1;
  }

  return Math.min(score, 1);
}

/**
 * Build candidate extraction evidence
 */
export function buildTikTokShopCandidateExtractionEvidence(
  pageUrl: string,
  candidates: TikTokShopDiscoveryCandidate[]
): TikTokShopExtractionEvidence {
  return {
    url: pageUrl,
    timestamp: new Date(),
    selectors: {},
    fallbackSelectors: {},
    extractionMethod: 'discovery_candidate_extraction',
    confidenceScores: {
      overall: candidates.reduce((sum, c) => sum + (c.confidenceScore || 0), 0) / (candidates.length || 1),
    },
  };
}
