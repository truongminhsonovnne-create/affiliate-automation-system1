/**
 * TikTok Shop Detail Extractor
 * Extracts raw detail fields from TikTok Shop pages
 */

import type { TikTokShopExtractedDetailFields } from '../types.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Extract all detail fields from page
 */
export async function extractTikTokShopRawDetailRecord(
  referenceKey: string
): Promise<TikTokShopExtractedDetailFields> {
  logger.info({ msg: 'Extracting raw detail record', referenceKey });

  // This would be called with actual page in production
  // For now, return placeholder structure

  return {
    productId: undefined,
    productTitle: undefined,
    productDescription: undefined,
    productUrl: undefined,
    sellerId: undefined,
    sellerName: undefined,
    sellerRating: undefined,
    sellerFollowerCount: undefined,
    sellerVerified: undefined,
    price: undefined,
    currency: undefined,
    originalPrice: undefined,
    discountPercentage: undefined,
    categoryId: undefined,
    categoryName: undefined,
    categoryPath: undefined,
    promotionSignals: undefined,
    images: undefined,
    videos: undefined,
    thumbnails: undefined,
  };
}

/**
 * Extract product title
 */
export async function extractTikTokShopProductTitle(page: any): Promise<string | undefined> {
  try {
    const title = await page.evaluate(() => {
      // Try multiple selectors
      const selectors = [
        '[data-testid="product-title"]',
        '.product-title',
        '.product-info h1',
        'h1[class*="title"]',
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          return element.textContent?.trim();
        }
      }

      return null;
    });

    return title || undefined;
  } catch (error) {
    logger.warn({ msg: 'Failed to extract product title', error });
    return undefined;
  }
}

/**
 * Extract seller signals
 */
export async function extractTikTokShopSellerSignals(page: any): Promise<{
  sellerId?: string;
  sellerName?: string;
  sellerRating?: number;
  sellerFollowerCount?: number;
  sellerVerified?: boolean;
}> {
  try {
    const seller = await page.evaluate(() => {
      const result: any = {};

      // Seller name
      const nameSelectors = [
        '[data-testid="seller-name"]',
        '.seller-name',
        '[class*="shop-name"]',
      ];
      for (const selector of nameSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          result.sellerName = el.textContent?.trim();
          break;
        }
      }

      // Seller rating
      const ratingSelectors = [
        '[data-testid="seller-rating"]',
        '.seller-rating',
        '[class*="rating"]',
      ];
      for (const selector of ratingSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          const text = el.textContent?.trim();
          const match = text?.match(/(\d+\.?\d*)/);
          if (match) {
            result.sellerRating = parseFloat(match[1]);
          }
          break;
        }
      }

      // Seller followers
      const followerSelectors = [
        '[data-testid="follower-count"]',
        '.follower-count',
      ];
      for (const selector of followerSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          const text = el.textContent?.trim();
          const match = text?.match(/(\d+)/);
          if (match) {
            result.sellerFollowerCount = parseInt(match[1], 10);
          }
          break;
        }
      }

      // Verified
      const verifiedSelectors = [
        '[data-testid="verified"]',
        '.verified-badge',
        '[class*="verified"]',
      ];
      for (const selector of verifiedSelectors) {
        if (document.querySelector(selector)) {
          result.sellerVerified = true;
          break;
        }
      }

      return result;
    });

    return seller;
  } catch (error) {
    logger.warn({ msg: 'Failed to extract seller signals', error });
    return {};
  }
}

/**
 * Extract price signals
 */
export async function extractTikTokShopPriceSignals(page: any): Promise<{
  price?: number;
  currency?: string;
  originalPrice?: number;
  discountPercentage?: number;
}> {
  try {
    const price = await page.evaluate(() => {
      const result: any = {};

      // Current price
      const priceSelectors = [
        '[data-testid="product-price"]',
        '.product-price',
        '[class*="price"]',
        '[class*="current-price"]',
      ];
      for (const selector of priceSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          const text = el.textContent?.trim();
          const match = text?.match(/[\d,]+\.?\d*/);
          if (match) {
            result.price = parseFloat(match[0].replace(/,/g, ''));
          }
          // Extract currency
          const currencyMatch = text?.match(/([A-Z]{3}|USD|VND|SGD|MYR)/);
          if (currencyMatch) {
            result.currency = currencyMatch[1];
          }
          break;
        }
      }

      // Original price
      const originalPriceSelectors = [
        '[data-testid="original-price"]',
        '.original-price',
        '[class*="original"]',
        '[class*="was-price"]',
      ];
      for (const selector of originalPriceSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          const text = el.textContent?.trim();
          const match = text?.match(/[\d,]+\.?\d*/);
          if (match) {
            result.originalPrice = parseFloat(match[0].replace(/,/g, ''));
          }
          break;
        }
      }

      // Discount percentage
      const discountSelectors = [
        '[data-testid="discount"]',
        '.discount-badge',
        '[class*="discount"]',
      ];
      for (const selector of discountSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          const text = el.textContent?.trim();
          const match = text?.match(/(\d+)%/);
          if (match) {
            result.discountPercentage = parseInt(match[1], 10);
          }
          break;
        }
      }

      return result;
    });

    return price;
  } catch (error) {
    logger.warn({ msg: 'Failed to extract price signals', error });
    return {};
  }
}

/**
 * Extract category signals
 */
export async function extractTikTokShopCategorySignals(page: any): Promise<{
  categoryId?: string;
  categoryName?: string;
  categoryPath?: string[];
}> {
  try {
    const category = await page.evaluate(() => {
      const result: any = {};

      // Category breadcrumb
      const breadcrumbSelectors = [
        '[data-testid="breadcrumb"]',
        '.breadcrumb',
        '[class*="breadcrumb"]',
      ];
      for (const selector of breadcrumbSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          const links = el.querySelectorAll('a, span');
          const path: string[] = [];
          links.forEach((link) => {
            const text = link.textContent?.trim();
            if (text && text !== 'Home') {
              path.push(text);
            }
          });
          if (path.length > 0) {
            result.categoryPath = path;
            result.categoryName = path[path.length - 1];
          }
          break;
        }
      }

      return result;
    });

    return category;
  } catch (error) {
    logger.warn({ msg: 'Failed to extract category signals', error });
    return {};
  }
}

/**
 * Extract promotion signals
 */
export async function extractTikTokShopPromotionSignals(page: any): Promise<string[]> {
  try {
    const promotions = await page.evaluate(() => {
      const signals: string[] = [];

      // Look for promotion badges/labels
      const promotionSelectors = [
        '[data-testid="promotion"]',
        '.promotion-badge',
        '[class*="promotion"]',
        '[class*="sale"]',
        '[class*="discount"]',
      ];

      for (const selector of promotionSelectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          const text = el.textContent?.trim();
          if (text) {
            signals.push(text);
          }
        });
      }

      return signals;
    });

    return promotions;
  } catch (error) {
    logger.warn({ msg: 'Failed to extract promotion signals', error });
    return [];
  }
}

/**
 * Extract media signals
 */
export async function extractTikTokShopMediaSignals(page: any): Promise<{
  images?: string[];
  videos?: string[];
  thumbnails?: string[];
}> {
  try {
    const media = await page.evaluate(() => {
      const result: any = {};

      // Images
      const imageSelectors = [
        '[data-testid="product-image"]',
        '.product-image img',
        '[class*="product"] img',
      ];

      const images: string[] = [];
      for (const selector of imageSelectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          const src = el.getAttribute('src') || el.getAttribute('data-src');
          if (src && src.startsWith('http')) {
            images.push(src);
          }
        });
      }
      if (images.length > 0) {
        result.images = images;
      }

      // Thumbnails (smaller images)
      const thumbnailSelectors = [
        '.thumbnail',
        '[class*="thumbnail"]',
      ];

      const thumbnails: string[] = [];
      for (const selector of thumbnailSelectors) {
        const elements = document.querySelectorAll(`${selector} img`);
        elements.forEach((el) => {
          const src = el.getAttribute('src') || el.getAttribute('data-src');
          if (src && src.startsWith('http')) {
            thumbnails.push(src);
          }
        });
      }
      if (thumbnails.length > 0) {
        result.thumbnails = thumbnails;
      }

      return result;
    });

    return media;
  } catch (error) {
    logger.warn({ msg: 'Failed to extract media signals', error });
    return {};
  }
}
