/**
 * Shopee Detail Extraction - Normalizers
 *
 * Normalizes raw detail data to canonical product model.
 */

import type {
  ShopeeDetailRawPayload,
  ShopeeCanonicalProduct,
  ShopeePriceInfo,
  ShopeeSellerInfo,
  ShopeeProductMedia,
  ShopeeRatingInfo,
  ShopeeCategoryPath,
  ShopeeBadgeInfo,
  ShopeeDetailInput,
  DetailLogger,
} from './types.js';
import { PRICE_PARSING_DETAIL, MEDIA, DETAIL_LIMITS } from './constants.js';
import { normalizeShopeeImageUrls, selectPrimaryMedia } from './media.js';

/**
 * Normalize raw detail payload to canonical product
 *
 * @param raw - Raw extracted data
 * @param context - Source context (from discovery)
 * @param options - Normalization options
 * @returns Canonical product
 */
export function normalizeShopeeDetailRaw(
  raw: ShopeeDetailRawPayload,
  context?: {
    sourceType?: 'flash_sale' | 'search' | 'direct';
    sourceKeyword?: string;
    discoveredAt?: number;
  },
  options: {
    /** Custom logger */
    logger?: DetailLogger;
  } = {}
): ShopeeCanonicalProduct {
  const { logger } = options;

  // Determine source
  const sourceType = context?.sourceType || 'direct';
  const sourceKeyword = context?.sourceKeyword;
  const discoveredAt = context?.discoveredAt;

  // Normalize basic fields
  const title = cleanText(raw.rawTitle);
  const productUrl = normalizeProductUrl(raw.rawPageUrl);
  const externalProductId = raw.externalProductId || extractProductId(productUrl);

  // Normalize price
  const priceInfo = normalizePriceInfo(raw);

  // Normalize media
  const media = normalizeShopeeImageUrls(raw.rawImageUrls, {
    logger,
  });

  // Normalize seller
  const sellerInfo = normalizeSellerInfo(raw);

  // Normalize badges
  const badges = normalizeBadges(raw.rawBadgeTexts);

  // Normalize category
  const categoryPath = normalizeCategory(raw.rawCategoryPath);

  // Normalize rating
  const ratingInfo = normalizeRating(raw.rawRatingText, raw.rawRatingCountText);

  // Normalize sold count
  const soldCount = normalizeSoldCount(raw.rawSoldCountText);

  // Generate short description from title
  const shortDescription = generateShortDescription(title, raw.rawDescriptionText);

  const canonical: ShopeeCanonicalProduct = {
    platform: 'shopee',
    externalProductId: externalProductId || '',
    productUrl,
    title,
    description: raw.rawDescriptionText,
    shortDescription,
    price: priceInfo,
    media: {
      images: media.images,
      primaryImage: selectPrimaryMedia(media.images),
      totalImages: media.images.length,
    },
    seller: sellerInfo,
    badges,
    categoryPath,
    rating: ratingInfo,
    soldCount,
    sourceType,
    sourceKeyword,
    discoveredAt,
    detailedAt: raw.extractedAt,
  };

  logger?.debug('Normalized to canonical product', {
    productId: externalProductId,
    title: title?.substring(0, 30),
    price: priceInfo.priceVnd,
    images: media.images.length,
  });

  return canonical;
}

/**
 * Normalize price information
 */
export function normalizePriceInfo(raw: ShopeeDetailRawPayload): ShopeePriceInfo {
  const priceText = raw.rawPriceText || '';
  const originalPriceText = raw.rawOriginalPriceText;
  const discountText = raw.rawDiscountText;

  // Parse current price
  const price = parseVndPrice(priceText);

  // Parse original price
  let originalPrice: number | undefined;
  if (originalPriceText) {
    originalPrice = parseVndPrice(originalPriceText);
  }

  // Parse discount
  let discountPercent: number | undefined;
  if (discountText) {
    const match = discountText.match(/(\d+)%/);
    if (match) {
      discountPercent = parseInt(match[1], 10);
    }
  }

  // Calculate discount if we have both prices
  if (!discountPercent && price && originalPrice && originalPrice > price) {
    discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
  }

  return {
    priceVnd: price || 0,
    originalPriceVnd: originalPrice,
    discountPercent,
    currency: 'VND',
    rawPriceText: priceText,
  };
}

/**
 * Normalize seller info
 */
export function normalizeSellerInfo(raw: ShopeeDetailRawPayload): ShopeeSellerInfo {
  const name = cleanText(raw.rawSellerName) || 'Unknown Seller';
  const location = cleanText(raw.rawShopLocation);

  return {
    name,
    location,
  };
}

/**
 * Normalize rating info
 */
export function normalizeRating(
  ratingText?: string,
  ratingCountText?: string
): ShopeeRatingInfo | undefined {
  if (!ratingText) {
    return undefined;
  }

  // Parse rating (e.g., "4.5" or "4.5/5")
  const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;

  // Parse rating count (e.g., "(100 đánh giá)" or "100")
  let totalRatings = 0;
  if (ratingCountText) {
    const countMatch = ratingCountText.replace(/[^\d]/g, '');
    totalRatings = parseInt(countMatch, 10) || 0;
  }

  if (rating === undefined) {
    return undefined;
  }

  return {
    rating,
    totalRatings,
  };
}

/**
 * Normalize sold count
 */
export function normalizeSoldCount(soldText?: string): number | undefined {
  if (!soldText) {
    return undefined;
  }

  // Extract number from text like "1.2k đã bán" or "1200 đã bán"
  const cleaned = soldText.toLowerCase()
    .replace(/đã bán/g, '')
    .replace(/sold/g, '')
    .trim();

  // Handle k suffix
  if (cleaned.includes('k')) {
    const num = parseFloat(cleaned.replace('k', ''));
    if (!isNaN(num)) {
      return Math.round(num * 1000);
    }
  }

  const num = parseInt(cleaned.replace(/[^\d]/g, ''), 10);
  return isNaN(num) ? undefined : num;
}

/**
 * Normalize category path
 */
export function normalizeCategory(categoryText?: string): ShopeeCategoryPath | undefined {
  if (!categoryText) {
    return undefined;
  }

  // Split by common separators
  const levels = categoryText
    .split(/[›>/|]/)
    .map(s => cleanText(s))
    .filter(Boolean);

  if (levels.length === 0) {
    return undefined;
  }

  return {
    fullPath: categoryText.trim(),
    levels,
  };
}

/**
 * Normalize badges
 */
export function normalizeBadges(badgeTexts: string[]): ShopeeBadgeInfo[] {
  if (!badgeTexts || badgeTexts.length === 0) {
    return [];
  }

  return badgeTexts.map(text => {
    const cleanText = text.trim();
    let type: ShopeeBadgeInfo['type'] = 'other';

    const lowerText = cleanText.toLowerCase();

    if (lowerText.includes('giảm') || lowerText.includes('%') || lowerText.includes('sale')) {
      type = 'discount';
    } else if (lowerText.includes('ship') || lowerText.includes('giao') || lowerText.includes('free')) {
      type = 'shipping';
    } else if (lowerText.includes('km') || lowerText.includes('ưu đãi')) {
      type = 'promotion';
    }

    return {
      text: cleanText,
      type,
    };
  });
}

// ============================================
// Helper Functions
// ============================================

/**
 * Clean text
 */
function cleanText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\n\r\t]/g, ' ')
    .trim();
}

/**
 * Normalize product URL
 */
function normalizeProductUrl(url: string): string {
  if (!url) return '';

  let normalized = url.trim();

  if (normalized.startsWith('//')) {
    normalized = 'https:' + normalized;
  }

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

  const match = url.match(/\.i\.(\d+)/);
  if (match && match[1]) {
    return match[1];
  }

  const altMatch = url.match(/\/product\/(\d+)/);
  if (altMatch && altMatch[1]) {
    return altMatch[1];
  }

  return undefined;
}

/**
 * Parse VND price
 */
function parseVndPrice(priceText: string): number | undefined {
  if (!priceText) return undefined;

  // Remove VND symbols and spaces
  let cleaned = priceText
    .replace(/[₫\sVNĐVND]/gi, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');

  // Handle range (e.g., "100.000 - 200.000")
  if (cleaned.includes('-')) {
    cleaned = cleaned.split('-')[0].trim();
  }

  const price = parseFloat(cleaned);
  return isNaN(price) ? undefined : price;
}

/**
 * Generate short description
 */
function generateShortDescription(title: string, description?: string): string | undefined {
  if (!description) {
    return undefined;
  }

  // Take first 200 chars of description as short description
  const cleaned = cleanText(description);
  if (cleaned.length > 200) {
    return cleaned.substring(0, 200) + '...';
  }

  return cleaned;
}
