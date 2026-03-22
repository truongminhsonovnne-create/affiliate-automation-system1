/**
 * Shopee Detail Extraction - Extractors
 *
 * Extracts raw data from Shopee product detail page.
 */

import type { Page } from 'playwright';
import type {
  ShopeeDetailRawPayload,
  DetailLogger,
} from './types.js';
import { getDetailSelector, getAllDetailSelectors, getImageSelectors } from './selectors.js';
import { DETAIL_TIMEOUT, DETAIL_SELECTOR_WAIT, DETAIL_LIMITS } from './constants.js';

/**
 * Extract all detail data from page
 *
 * @param page - Playwright Page
 * @param options - Extraction options
 * @returns Raw detail payload
 */
export async function extractShopeeDetailRaw(
  page: Page,
  options: {
    /** Maximum images to extract */
    maxImages?: number;
    /** Custom logger */
    logger?: DetailLogger;
  } = {}
): Promise<ShopeeDetailRawPayload> {
  const { maxImages = DETAIL_LIMITS.MAX_IMAGES, logger } = options;

  const extractedAt = Date.now();

  logger?.debug('Starting detail extraction');

  // Extract all fields
  const [
    title,
    priceData,
    images,
    description,
    seller,
    stats,
    badges,
    category,
  ] = await Promise.all([
    extractTitleRaw(page, { logger }),
    extractPriceRaw(page, { logger }),
    extractImagesRaw(page, { maxImages, logger }),
    extractDescriptionRaw(page, { logger }),
    extractSellerRaw(page, { logger }),
    extractStatsRaw(page, { logger }),
    extractBadgesRaw(page, { logger }),
    extractCategoryRaw(page, { logger }),
  ]);

  const rawPageUrl = page.url();

  // Extract product ID
  const externalProductId = extractProductIdFromPage(page);

  const payload: ShopeeDetailRawPayload = {
    rawTitle: title.rawTitle,
    rawPriceText: priceData.rawPriceText,
    rawOriginalPriceText: priceData.rawOriginalPriceText,
    rawDiscountText: priceData.rawDiscountText,
    rawImageUrls: images,
    rawDescriptionText: description,
    rawSellerName: seller.name,
    rawShopLocation: seller.location,
    rawSoldCountText: stats.soldCount,
    rawRatingText: stats.rating,
    rawRatingCountText: stats.ratingCount,
    rawCategoryPath: category,
    rawBadgeTexts: badges,
    rawPageUrl,
    externalProductId,
    extractedAt,
  };

  logger?.debug('Detail extraction complete', {
    hasTitle: !!payload.rawTitle,
    hasPrice: !!payload.rawPriceText,
    imagesCount: payload.rawImageUrls.length,
    hasSeller: !!payload.rawSellerName,
  });

  return payload;
}

/**
 * Extract title
 */
export async function extractTitleRaw(
  page: Page,
  options: {
    /** Custom logger */
    logger?: DetailLogger;
  } = {}
): Promise<{ rawTitle: string }> {
  const selectors = [
    getDetailSelector('title'),
    ...getAllDetailSelectors('title'),
    'h1',
    '.product-title',
  ].filter(Boolean) as string[];

  for (const selector of selectors) {
    try {
      const title = await page.textContent(selector, { timeout: 2000 });
      if (title && title.trim().length > 0) {
        return { rawTitle: title.trim() };
      }
    } catch {
      continue;
    }
  }

  // Fallback: get from page title
  try {
    const pageTitle = await page.title();
    // Extract product name from page title
    const match = pageTitle.match(/^([^|]+)/);
    if (match) {
      return { rawTitle: match[1].trim() };
    }
    return { rawTitle: pageTitle };
  } catch {
    return { rawTitle: '' };
  }
}

/**
 * Extract price data
 */
export async function extractPriceRaw(
  page: Page,
  options: {
    /** Custom logger */
    logger?: DetailLogger;
  } = {}
): Promise<{
  rawPriceText: string;
  rawOriginalPriceText?: string;
  rawDiscountText?: string;
}> {
  const result = {
    rawPriceText: '',
    rawOriginalPriceText: undefined as string | undefined,
    rawDiscountText: undefined as string | undefined,
  };

  // Try price selector
  const priceSelectors = getAllDetailSelectors('price');
  for (const selector of priceSelectors) {
    try {
      const price = await page.textContent(selector, { timeout: 2000 });
      if (price && price.trim()) {
        result.rawPriceText = price.trim();
        break;
      }
    } catch {
      continue;
    }
  }

  // Try original price
  const originalSelectors = getAllDetailSelectors('originalPrice');
  for (const selector of originalSelectors) {
    try {
      const original = await page.textContent(selector, { timeout: 1000 });
      if (original && original.trim()) {
        result.rawOriginalPriceText = original.trim();
        break;
      }
    } catch {
      continue;
    }
  }

  // Try discount
  const discountSelectors = getAllDetailSelectors('discount');
  for (const selector of discountSelectors) {
    try {
      const discount = await page.textContent(selector, { timeout: 1000 });
      if (discount && discount.trim()) {
        result.rawDiscountText = discount.trim();
        break;
      }
    } catch {
      continue;
    }
  }

  // Fallback: try to find price in page content
  if (!result.rawPriceText) {
    try {
      const bodyText = await page.evaluate(() => document.body.innerText);
      const priceMatch = bodyText?.match(/(\d{1,3}(\.\d{3})+)\s*₫/);
      if (priceMatch) {
        result.rawPriceText = priceMatch[0];
      }
    } catch {
      // Ignore
    }
  }

  return result;
}

/**
 * Extract images
 */
export async function extractImagesRaw(
  page: Page,
  options: {
    /** Maximum images */
    maxImages?: number;
    /** Custom logger */
    logger?: DetailLogger;
  } = {}
): Promise<string[]> {
  const { maxImages = DETAIL_LIMITS.MAX_IMAGES, logger } = options;
  const images: string[] = [];

  try {
    // Try to get from image gallery
    const galleryImages = await page.evaluate((limit) => {
      const result: string[] = [];

      // Try product image gallery
      const mainImages = document.querySelectorAll(
        '.product-image-gallery img, .pdp-product-image img, [data-sqe="product-image"] img, .product-images img'
      );

      mainImages.forEach((img) => {
        const src = (img as HTMLImageElement).src;
        if (src && !src.includes('data:') && result.length < limit) {
          result.push(src);
        }
      });

      // If not enough, try thumbnails
      if (result.length < limit) {
        const thumbnails = document.querySelectorAll(
          '.product-image-thumbnails img, .pdp-product-thumbnail img, [data-sqe="product-thumbnail"] img'
        );
        thumbnails.forEach((img) => {
          const src = (img as HTMLImageElement).src;
          if (src && !src.includes('data:') && result.length < limit && !result.includes(src)) {
            result.push(src);
          }
        });
      }

      // Last resort: any product-related images
      if (result.length === 0) {
        const allImages = document.querySelectorAll('img[class*="product"], img[class*="image"]');
        allImages.forEach((img) => {
          const src = (img as HTMLImageElement).src;
          if (src && !src.includes('data:') && !src.includes('avatar') && result.length < limit && !result.includes(src)) {
            result.push(src);
          }
        });
      }

      return result;
    }, maxImages);

    images.push(...galleryImages);
  } catch (error) {
    logger?.warn('Image extraction failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Dedupe and limit
  const uniqueImages = [...new Set(images)];
  return uniqueImages.slice(0, maxImages);
}

/**
 * Extract description
 */
export async function extractDescriptionRaw(
  page: Page,
  options: {
    /** Custom logger */
    logger?: DetailLogger;
  } = {}
): Promise<string | undefined> {
  const selectors = getAllDetailSelectors('description');

  for (const selector of selectors) {
    try {
      const description = await page.textContent(selector, { timeout: 2000 });
      if (description && description.trim().length > 0) {
        // Clean and limit
        const cleaned = description
          .trim()
          .replace(/\s+/g, ' ')
          .substring(0, DETAIL_LIMITS.MAX_DESCRIPTION_LENGTH);
        return cleaned;
      }
    } catch {
      continue;
    }
  }

  return undefined;
}

/**
 * Extract seller info
 */
export async function extractSellerRaw(
  page: Page,
  options: {
    /** Custom logger */
    logger?: DetailLogger;
  } = {}
): Promise<{
  name?: string;
  location?: string;
  rating?: string;
}> {
  const result = { name: undefined as string | undefined, location: undefined as string | undefined, rating: undefined as string | undefined };

  // Seller name
  const nameSelectors = getAllDetailSelectors('sellerName');
  for (const selector of nameSelectors) {
    try {
      const name = await page.textContent(selector, { timeout: 2000 });
      if (name && name.trim()) {
        result.name = name.trim();
        break;
      }
    } catch {
      continue;
    }
  }

  // Seller location
  const locationSelectors = getAllDetailSelectors('sellerLocation');
  for (const selector of locationSelectors) {
    try {
      const location = await page.textContent(selector, { timeout: 1000 });
      if (location && location.trim()) {
        result.location = location.trim();
        break;
      }
    } catch {
      continue;
    }
  }

  // Seller rating
  const ratingSelectors = getAllDetailSelectors('sellerRating');
  for (const selector of ratingSelectors) {
    try {
      const rating = await page.textContent(selector, { timeout: 1000 });
      if (rating && rating.trim()) {
        result.rating = rating.trim();
        break;
      }
    } catch {
      continue;
    }
  }

  return result;
}

/**
 * Extract stats (sold count, rating)
 */
export async function extractStatsRaw(
  page: Page,
  options: {
    /** Custom logger */
    logger?: DetailLogger;
  } = {}
): Promise<{
  soldCount?: string;
  rating?: string;
  ratingCount?: string;
}> {
  const result = {
    soldCount: undefined as string | undefined,
    rating: undefined as string | undefined,
    ratingCount: undefined as string | undefined,
  };

  // Sold count
  const soldSelectors = getAllDetailSelectors('soldCount');
  for (const selector of soldSelectors) {
    try {
      const sold = await page.textContent(selector, { timeout: 1000 });
      if (sold && sold.trim()) {
        result.soldCount = sold.trim();
        break;
      }
    } catch {
      continue;
    }
  }

  // Rating
  const ratingSelectors = getAllDetailSelectors('rating');
  for (const selector of ratingSelectors) {
    try {
      const rating = await page.textContent(selector, { timeout: 1000 });
      if (rating && rating.trim()) {
        result.rating = rating.trim();
        break;
      }
    } catch {
      continue;
    }
  }

  // Rating count
  const ratingCountSelectors = getAllDetailSelectors('ratingCount');
  for (const selector of ratingCountSelectors) {
    try {
      const count = await page.textContent(selector, { timeout: 1000 });
      if (count && count.trim()) {
        result.ratingCount = count.trim();
        break;
      }
    } catch {
      continue;
    }
  }

  return result;
}

/**
 * Extract badges
 */
export async function extractBadgesRaw(
  page: Page,
  options: {
    /** Custom logger */
    logger?: DetailLogger;
  } = {}
): Promise<string[]> {
  const badges: string[] = [];

  const selectors = getAllDetailSelectors('badges');

  for (const selector of selectors) {
    try {
      const badgeElements = await page.$$(selector);
      for (const el of badgeElements) {
        const text = await el.textContent();
        if (text && text.trim()) {
          badges.push(text.trim());
        }
      }
    } catch {
      continue;
    }
  }

  return badges;
}

/**
 * Extract category path
 */
export async function extractCategoryRaw(
  page: Page,
  options: {
    /** Custom logger */
    logger?: DetailLogger;
  } = {}
): Promise<string | undefined> {
  const selectors = getAllDetailSelectors('categoryPath');

  for (const selector of selectors) {
    try {
      const category = await page.textContent(selector, { timeout: 1000 });
      if (category && category.trim()) {
        return category.trim();
      }
    } catch {
      continue;
    }
  }

  return undefined;
}

/**
 * Extract product ID from page URL
 */
function extractProductIdFromPage(page: Page): string | undefined {
  const url = page.url();
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
