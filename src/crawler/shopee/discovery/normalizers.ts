/**
 * Shopee Discovery Crawler - Normalizers
 *
 * Normalizes raw listing data for downstream use.
 */

import type {
  ShopeeListingCardRaw,
  ShopeeListingCardNormalized,
  ShopeeListingSourceType,
  ShopeeListingPageKind,
} from './types.js';
import { PRICE_PARSING, VALIDATION, URL_PATTERNS } from './constants.js';

/**
 * Normalize a single raw listing card
 *
 * @param raw - Raw listing card
 * @param options - Normalization options
 * @returns Normalized listing card
 */
export function normalizeListingCard(
  raw: ShopeeListingCardRaw,
  options: {
    /** Source type */
    sourceType?: ShopeeListingSourceType;
    /** Custom logger */
    logger?: {
      debug: (msg: string, meta?: Record<string, unknown>) => void;
      warn: (msg: string, meta?: Record<string, unknown>) => void;
    };
  } = {}
): ShopeeListingCardNormalized {
  const { sourceType = 'search', logger } = options;

  // Clean title
  const title = cleanText(raw.rawTitle);

  // Parse price
  const priceData = parsePrice(raw.rawPriceText);
  const priceVnd = priceData.price;
  const originalPriceVnd = priceData.originalPrice;
  const discountPercent = priceData.discount;

  // Normalize image URL
  const imageUrl = normalizeImageUrl(raw.rawImageUrl);

  // Normalize product URL
  const productUrl = normalizeProductUrl(raw.rawProductUrl);

  // Extract product ID if possible
  const productId = extractProductId(productUrl);

  // Validate
  const warnings: string[] = [];

  if (!title || title.length < VALIDATION.MIN_TITLE_LENGTH) {
    warnings.push('Title too short or empty');
  }

  if (!imageUrl) {
    warnings.push('Missing image URL');
  }

  if (!productUrl) {
    warnings.push('Missing product URL');
  }

  if (priceVnd !== undefined && priceVnd < VALIDATION.MIN_PRICE) {
    warnings.push('Price below minimum');
  }

  if (warnings.length > 0) {
    logger?.debug('Card normalization warnings', {
      title: title?.substring(0, 30),
      warnings,
    });
  }

  return {
    productId,
    title: title || 'Unknown Product',
    priceVnd,
    originalPriceVnd,
    discountPercent,
    imageUrl: imageUrl || '',
    productUrl: productUrl || '',
    sourceType,
    pageKind: raw.pageKind,
    keyword: raw.keyword,
    positionIndex: raw.positionIndex,
    discoveredAt: raw.discoveredAt,
    metadata: {
      rawTitle: raw.rawTitle,
      rawPriceText: raw.rawPriceText,
      rawBadgeTexts: raw.rawBadgeTexts,
      normalizedAt: Date.now(),
    },
  };
}

/**
 * Normalize multiple raw cards
 *
 * @param rawCards - Array of raw cards
 * @param options - Normalization options
 * @returns Array of normalized cards
 */
export function normalizeListingCards(
  rawCards: ShopeeListingCardRaw[],
  options: {
    /** Source type */
    sourceType?: ShopeeListingSourceType;
    /** Custom logger */
    logger?: {
      debug: (msg: string, meta?: Record<string, unknown>) => void;
      warn: (msg: string, meta?: Record<string, unknown>) => void;
    };
  } = {}
): ShopeeListingCardNormalized[] {
  const { sourceType = 'search', logger } = options;

  const normalized: ShopeeListingCardNormalized[] = [];

  for (const raw of rawCards) {
    try {
      const card = normalizeListingCard(raw, { sourceType, logger });
      normalized.push(card);
    } catch (error) {
      logger?.warn('Failed to normalize card', {
        error: error instanceof Error ? error.message : String(error),
        position: raw.positionIndex,
      });
    }
  }

  return normalized;
}

/**
 * Deduplicate listing cards
 *
 * @param cards - Array of normalized cards
 * @param options - Deduplication options
 * @returns Deduplicated array
 */
export function dedupeListingCards(
  cards: ShopeeListingCardNormalized[],
  options: {
    /** Deduplication strategy */
    strategy?: 'url' | 'title_image' | 'strict';
    /** Threshold for similarity (0-1) */
    threshold?: number;
    /** Custom logger */
    logger?: {
      debug: (msg: string, meta?: Record<string, unknown>) => void;
      warn: (msg: string, meta?: Record<string, unknown>) => void;
    };
  } = {}
): ShopeeListingCardNormalized[] {
  const {
    strategy = 'url',
    threshold = 0.9,
    logger,
  } = options;

  if (cards.length === 0) {
    return [];
  }

  logger?.debug('Starting deduplication', {
    inputCount: cards.length,
    strategy,
  });

  const seen = new Set<string>();
  const result: ShopeeListingCardNormalized[] = [];

  for (const card of cards) {
    let key: string | null = null;

    switch (strategy) {
      case 'url':
        key = getUrlDedupeKey(card.productUrl);
        break;
      case 'title_image':
        key = getTitleImageDedupeKey(card);
        break;
      case 'strict':
        key = getStrictDedupeKey(card);
        break;
    }

    if (!key) {
      // If we can't generate a key, include the card
      result.push(card);
      continue;
    }

    if (!seen.has(key)) {
      seen.add(key);
      result.push(card);
    } else {
      logger?.debug('Duplicate removed', { key: key.substring(0, 50) });
    }
  }

  const removed = cards.length - result.length;
  if (removed > 0) {
    logger?.info('Deduplication complete', {
      input: cards.length,
      output: result.length,
      removed,
    });
  }

  return result;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Clean text content
 */
function cleanText(text: string | null | undefined): string {
  if (!text) return '';

  return text
    .replace(/\s+/g, ' ')
    .replace(/[\n\r\t]/g, ' ')
    .trim();
}

/**
 * Parse price from price text
 */
function parsePrice(priceText: string): {
  price?: number;
  originalPrice?: number;
  discount?: number;
} {
  if (!priceText) {
    return {};
  }

  // Clean the price text
  let cleaned = priceText
    .replace(/[^\d.,]/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');

  // Extract main price
  const mainPrice = parseFloat(cleaned);

  if (isNaN(mainPrice)) {
    return {};
  }

  // Check for original price (usually separated by - or has discount indicator)
  const originalPriceMatch = priceText.match(/(\d[\d.,]*)\s*[-–]\s*(\d[\d.,]*)/);
  let originalPrice: number | undefined;
  let discount: number | undefined;

  if (originalPriceMatch) {
    originalPrice = parseFloat(
      originalPriceMatch[1].replace(/\./g, '').replace(/,/g, '.')
    );
    if (!isNaN(originalPrice) && originalPrice > mainPrice) {
      discount = Math.round(((originalPrice - mainPrice) / originalPrice) * 100);
    }
  }

  return {
    price: mainPrice,
    originalPrice,
    discount,
  };
}

/**
 * Normalize image URL
 */
function normalizeImageUrl(url: string | null | undefined): string {
  if (!url) return '';

  let normalized = url.trim();

  // Add protocol if missing
  if (normalized.startsWith('//')) {
    normalized = 'https:' + normalized;
  }

  // Remove tracking parameters
  normalized = normalized.split('?')[0];

  return normalized;
}

/**
 * Normalize product URL
 */
function normalizeProductUrl(url: string | null | undefined): string {
  if (!url) return '';

  let normalized = url.trim();

  // Add protocol if missing
  if (normalized.startsWith('//')) {
    normalized = 'https:' + normalized;
  }

  // Make relative URLs absolute
  if (normalized.startsWith('/')) {
    normalized = 'https://shopee.vn' + normalized;
  }

  return normalized;
}

/**
 * Extract product ID from URL
 */
function extractProductId(url: string): string | undefined {
  if (!url) return undefined;

  // Try to match product ID pattern
  const match = url.match(URL_PATTERNS.PRODUCT_ID_PATTERN);
  if (match && match[1]) {
    return match[1];
  }

  // Try alternative pattern
  const altMatch = url.match(/\/product\/(\d+)/);
  if (altMatch && altMatch[1]) {
    return altMatch[1];
  }

  return undefined;
}

/**
 * Get URL-based deduplication key
 */
function getUrlDedupeKey(url: string): string | null {
  if (!url) return null;

  // Normalize URL for comparison
  const normalized = url.toLowerCase().split('?')[0];

  // Extract product ID if available
  const productIdMatch = normalized.match(URL_PATTERNS.PRODUCT_ID_PATTERN);
  if (productIdMatch && productIdMatch[1]) {
    return `id:${productIdMatch[1]}`;
  }

  // Fall back to full URL
  return `url:${normalized}`;
}

/**
 * Get title + image based deduplication key
 */
function getTitleImageDedupeKey(card: ShopeeListingCardNormalized): string | null {
  const title = (card.title || '').toLowerCase().trim();
  const image = (card.imageUrl || '').toLowerCase().split('?')[0];

  if (!title || !image) return null;

  // Create a simple hash-like key
  const titleHash = title.substring(0, 30).replace(/\s+/g, '_');
  const imageHash = image.substring(image.lastIndexOf('/') + 1, image.length).substring(0, 20);

  return `title:${titleHash}|image:${imageHash}`;
}

/**
 * Get strict deduplication key
 */
function getStrictDedupeKey(card: ShopeeListingCardNormalized): string | null {
  // Try URL first
  const urlKey = getUrlDedupeKey(card.productUrl);
  if (urlKey) return urlKey;

  // Fall back to title + image
  return getTitleImageDedupeKey(card);
}

/**
 * Validate normalized card
 */
export function validateNormalizedCard(
  card: ShopeeListingCardNormalized
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!card.title || card.title.length < VALIDATION.MIN_TITLE_LENGTH) {
    errors.push('Invalid or missing title');
  }

  if (!card.imageUrl || card.imageUrl.length < VALIDATION.MIN_IMAGE_URL_LENGTH) {
    errors.push('Invalid or missing image URL');
  }

  if (!card.productUrl || card.productUrl.length < VALIDATION.MIN_PRODUCT_URL_LENGTH) {
    errors.push('Invalid or missing product URL');
  }

  if (card.priceVnd !== undefined && card.priceVnd < VALIDATION.MIN_PRICE) {
    errors.push('Price below minimum');
  }

  if (card.priceVnd !== undefined && card.priceVnd > VALIDATION.MAX_PRICE) {
    errors.push('Price above maximum');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
