/**
 * Data Parsing Utilities for Shopee Crawler
 *
 * Provides functions to normalize and clean product data
 * from Shopee's HTML structure.
 */

import type { ShopeeRawProduct, NormalizedProduct } from '../types/product.js';

// ============================================
// Price Parsing
// ============================================

/**
 * Parse Vietnamese price string to number.
 *
 * Handles formats:
 * - ₫199.000
 * - 199.000đ
 * - ₫1.250.000
 * - 1.250.000
 * - 199000
 * - $199.00
 *
 * @param priceText - Price string in various formats
 * @returns Parsed price as number, or null if invalid
 *
 * @example
 * parsePrice('₫199.000')     // 199000
 * parsePrice('199.000đ')      // 199000
 * parsePrice('₫1.250.000')   // 1250000
 * parsePrice('1,250,000')     // 1250000
 */
export function parsePrice(priceText: string): number | null {
  if (!priceText || typeof priceText !== 'string') {
    return null;
  }

  // Trim whitespace
  const trimmed = priceText.trim();

  if (trimmed.length === 0) {
    return null;
  }

  try {
    // Step 1: Remove currency symbols and common suffixes
    let cleaned = trimmed
      // Vietnamese Dong symbol
      .replace(/[₫]/g, '')
      // Common currency symbols
      .replace(/[\$€£¥]/g, '')
      // Remove 'đ' suffix (Vietnamese dong)
      .replace(/đ\s*$/i, '')
      // Remove 'VND' suffix
      .replace(/\s*VND\s*$/i, '');

    // Step 2: Handle different thousand separators
    // Vietnamese uses dot (.) as thousand separator: 1.000.000
    // US/UK uses comma: 1,000,000

    // Check if it uses comma as decimal (US format) or dot as thousand (VN format)
    const hasCommaAsDecimal = cleaned.includes(',') && !cleaned.includes('.');
    const hasDotAsDecimal = cleaned.includes('.') && !cleaned.includes(',');

    if (hasCommaAsDecimal) {
      // US format: 1,250.00 -> remove commas
      cleaned = cleaned.replace(/,/g, '');
    } else if (hasDotAsDecimal) {
      // Vietnamese format: 1.250.000 -> remove dots
      cleaned = cleaned.replace(/\./g, '');
    } else {
      // No separators or mixed - remove dots (thousand separators)
      cleaned = cleaned.replace(/\./g, '');
    }

    // Step 3: Remove any remaining non-numeric characters except dot and comma
    cleaned = cleaned.replace(/[^\d.,]/g, '');

    // Step 4: Handle any remaining decimal separators
    cleaned = cleaned.replace(/,/g, '.');

    // Step 5: Parse float
    const parsed = parseFloat(cleaned);

    // Validate result
    if (isNaN(parsed) || parsed < 0) {
      return null;
    }

    // Round to integer (VND doesn't have decimals)
    return Math.round(parsed);
  } catch {
    return null;
  }
}

/**
 * Parse price range (e.g., "₫100.000 - ₫200.000")
 * Returns the average price or first price found.
 *
 * @param priceRangeText - Price range string
 * @returns Average price or null
 */
export function parsePriceRange(priceRangeText: string): number | null {
  if (!priceRangeText || typeof priceRangeText !== 'string') {
    return null;
  }

  // Split by common separators
  const parts = priceRangeText.split(/[-–—:to]+/);

  const prices = parts
    .map((part) => parsePrice(part))
    .filter((p): p is number => p !== null);

  if (prices.length === 0) {
    return null;
  }

  if (prices.length === 1) {
    return prices[0];
  }

  // Return average of range
  const sum = prices.reduce((acc, p) => acc + p, 0);
  return Math.round(sum / prices.length);
}

// ============================================
// Text Cleaning
// ============================================

/**
 * Clean and normalize text input.
 *
 * Removes:
 * - Extra whitespace
 * - Special characters
 * - Unicode normalize
 *
 * @param input - Raw text input
 * @returns Cleaned text
 *
 * @example
 * cleanText('  Product  Title  ')  // 'Product Title'
 * cleanText('Product\n\nName')     // 'Product Name'
 */
export function cleanText(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Trim
  let cleaned = input.trim();

  // Replace multiple whitespace with single space
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Replace newlines with space
  cleaned = cleaned.replace(/[\n\r\t]/g, ' ');

  // Remove non-printable characters
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');

  // Normalize Unicode (NFC)
  cleaned = cleaned.normalize('NFC');

  // Trim again after all transformations
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Remove HTML tags from text.
 *
 * @param html - HTML string
 * @returns Plain text
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, ' ');

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return cleanText(text);
}

/**
 * Clean product title.
 * Removes extra info like "Hàng chính hãng" etc.
 *
 * @param title - Raw product title
 * @returns Cleaned title
 */
export function cleanProductTitle(title: string): string {
  if (!title) {
    return '';
  }

  let cleaned = stripHtml(title);

  // Remove common prefixes/suffixes that aren't part of product name
  const patternsToRemove = [
    /^(Hàng\s+chính\s+hãng\s*)/i,
    /(\s*-\s*Hàng\s+chính\s+hãng)$/i,
    /^(Sản\s+phẩm\s+)/i,
    /(✅|\*|\[|\]|#|✔|✓)+/g,
  ];

  for (const pattern of patternsToRemove) {
    cleaned = cleaned.replace(pattern, '');
  }

  return cleanText(cleaned);
}

// ============================================
// URL Normalization
// ============================================

/**
 * Normalize Shopee product URL.
 *
 * @param url - Raw URL
 * @param baseUrl - Base URL to prepend if relative
 * @returns Normalized absolute URL
 *
 * @example
 * normalizeProductUrl('/product/123456')           // 'https://shopee.vn/product/123456'
 * normalizeProductUrl('https://s.shopee.vn/abc')  // 'https://shopee.vn/product/abc'
 */
export function normalizeProductUrl(url: string, baseUrl: string = 'https://shopee.vn'): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  let normalized = url.trim();

  // Handle relative URLs
  if (normalized.startsWith('/')) {
    normalized = baseUrl + normalized;
  }

  // Handle short Shopee URLs
  if (normalized.includes('s.shopee.vn') || normalized.includes('shopee.vn/')) {
    // Already a Shopee URL, ensure it has protocol
    if (!normalized.startsWith('http')) {
      normalized = 'https://' + normalized;
    }
  }

  // Validate URL format
  try {
    const urlObj = new URL(normalized);
    return urlObj.toString();
  } catch {
    // Invalid URL, return empty
    return '';
  }
}

/**
 * Extract product ID from Shopee URL.
 *
 * @param url - Product URL
 * @returns Product ID or null
 */
export function extractProductId(url: string): string | null {
  if (!url) {
    return null;
  }

  // Match patterns like:
  // - shopee.vn/product-name.i.123456789
  // - s.shopee.vn/abc123
  const patterns = [
    /\.i\.(\d+)/,                    // shopee.vn/product-name.i.123456789
    /\/(\d+)(?:\?|$)/,               // shopee.vn/product/123456789
    /\/product\/[^\/]+\.(\d+)/,      // /product/name.123456789
    /-i\.(\d+)/,                     // -i.123456789 (short URL)
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract shop ID from Shopee URL or page.
 *
 * @param urlOrText - URL or shop identifier
 * @returns Shop ID or null
 */
export function extractShopId(urlOrText: string): string | null {
  if (!urlOrText) {
    return null;
  }

  // Match patterns like:
  // - shopee.vn/shop-name.123456789
  // shop_id=123456789
  const patterns = [
    /\/shop\/[^\/]+\.(\d+)/,         // /shop/shopname.123456789
    /\.(\d+)(?:\/|$)/,               // .123456789/
    /shop_id[=:](\d+)/i,            // shop_id=123456789
  ];

  for (const pattern of patterns) {
    const match = urlOrText.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Convert mobile URL to desktop URL or vice versa.
 *
 * @param url - Original URL
 * @param toMobile - Convert to mobile version (default: false)
 * @returns Converted URL
 */
export function convertShopeeUrl(url: string, toMobile: boolean = false): string {
  if (!url) {
    return '';
  }

  let converted = url;

  if (toMobile) {
    // Convert desktop to mobile
    converted = converted
      .replace('www.shopee.vn', 'm.shopee.vn')
      .replace('shopee.vn', 'm.shopee.vn');
  } else {
    // Convert mobile to desktop
    converted = converted
      .replace('m.shopee.vn', 'shopee.vn')
      .replace('s.shopee.vn', 'shopee.vn');
  }

  return converted;
}

// ============================================
// Image URL Processing
// ============================================

/**
 * Extract main image URL from various Shopee image formats.
 *
 * @param imageUrl - Raw image URL or data
 * @returns Cleaned image URL
 */
export function normalizeImageUrl(imageUrl: string): string {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return '';
  }

  let normalized = imageUrl.trim();

  // Remove query parameters that might cause issues
  try {
    const urlObj = new URL(normalized);
    // Keep only essential params
    const essentialParams = ['url'];
    const filteredParams = new URLSearchParams();

    for (const [key, value] of urlObj.searchParams) {
      if (essentialParams.includes(key.toLowerCase())) {
        filteredParams.append(key, value);
      }
    }

    // Reconstruct URL
    normalized = urlObj.origin + urlObj.pathname;
    if (filteredParams.toString()) {
      normalized += '?' + filteredParams.toString();
    }
  } catch {
    // Not a valid URL, try to clean anyway
  }

  return normalized;
}

/**
 * Get high-resolution image URL from Shopee thumbnail.
 *
 * @param thumbnailUrl - Thumbnail URL
 * @returns High-res URL
 */
export function getHighResImageUrl(thumbnailUrl: string): string {
  if (!thumbnailUrl) {
    return '';
  }

  // Shopee thumbnail pattern:
  // https://cf.shopee.vn/file/...
  // High-res: replace /image/ with actual file path

  // Try to get larger version by removing size parameters
  // Common patterns: _tn, _fw
  let highRes = thumbnailUrl
    .replace(/_tn\d+/g, '')
    .replace(/_fw\d+/g, '')
    .replace(/_\d+x\d+/g, '');

  // Some Shopee images have size params at end
  highRes = highRes.replace(/\?type=\w+$/i, '');

  return highRes || thumbnailUrl;
}

// ============================================
// Product Normalization
// ============================================

/**
 * Normalize raw Shopee product to structured format.
 *
 * @param raw - Raw product from crawler
 * @returns Normalized product
 *
 * @example
 * const raw = {
 *   title: '  iPhone 15 Pro Max  ',
 *   priceText: '₫25.000.000',
 *   imageUrl: 'https://cf.shopee.vn/file/...',
 *   productUrl: 'https://shopee.vn/iphone-15.i.123456',
 *   sourceType: 'shopee',
 *   sourceKeyword: 'iphone',
 *   crawledAt: new Date()
 * };
 *
 * const normalized = normalizeRawProduct(raw);
 */
export function normalizeRawProduct(raw: ShopeeRawProduct): NormalizedProduct {
  // Parse price
  const price = parsePrice(raw.priceText) ?? 0;

  // Clean title
  const title = cleanProductTitle(raw.title);

  // Normalize URL
  const productUrl = normalizeProductUrl(raw.productUrl);

  // Extract product ID
  const platformProductId = extractProductId(productUrl) ?? raw.shopeeProductId;

  // Normalize image
  const imageUrl = normalizeImageUrl(raw.imageUrl);

  return {
    title,
    price,
    imageUrl,
    description: raw.description ? cleanText(raw.description) : undefined,
    productUrl,
    sourceType: raw.sourceType,
    sourceKeyword: raw.sourceKeyword,
    crawledAt: raw.crawledAt,
    shopName: raw.shopName ? cleanText(raw.shopName) : undefined,
    platformProductId,
    rating: raw.rating,
    reviewCount: raw.reviewCount,
    soldCount: raw.soldCount,
  };
}

/**
 * Validate normalized product has minimum required fields.
 *
 * @param product - Product to validate
 * @returns True if valid
 */
export function isValidNormalizedProduct(product: NormalizedProduct): boolean {
  return !!(
    product &&
    product.title &&
    product.title.length > 0 &&
    product.price > 0 &&
    product.productUrl &&
    product.sourceType &&
    product.sourceKeyword
  );
}

// ============================================
// Number Parsing
// ============================================

/**
 * Parse Vietnamese number format (e.g., "1,2k", "1.5k", "1000")
 *
 * @param text - Text containing number
 * @returns Parsed number or null
 */
export function parseVietnameseNumber(text: string): number | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const cleaned = text.toLowerCase().trim();

  // Handle k suffix (thousand)
  let multiplier = 1;
  let numericText = cleaned;

  if (cleaned.endsWith('k')) {
    multiplier = 1000;
    numericText = cleaned.slice(0, -1);
  } else if (cleaned.endsWith('m')) {
    multiplier = 1000000;
    numericText = cleaned.slice(0, -1);
  }

  // Remove non-numeric except dot and comma
  numericText = numericText.replace(/[^\d.,]/g, '');

  // Handle separators
  numericText = numericText.replace(/\./g, '').replace(',', '.');

  const parsed = parseFloat(numericText);

  if (isNaN(parsed)) {
    return null;
  }

  return Math.round(parsed * multiplier);
}

/**
 * Parse sold count (e.g., "1,2k đã bán", "500 đã bán")
 *
 * @param text - Sold count text
 * @returns Number of sold items
 */
export function parseSoldCount(text: string): number | null {
  if (!text) {
    return null;
  }

  // Extract number from text like "1,2k đã bán" or "500 đã bán"
  const match = text.match(/([\d.,]+)\s*(k|m)?\s*đã\s*bán/i);

  if (!match) {
    return parseVietnameseNumber(text);
  }

  const numStr = match[1];
  const suffix = match[2];

  let multiplier = 1;
  if (suffix === 'k') multiplier = 1000;
  if (suffix === 'm') multiplier = 1000000;

  const price = parsePrice(numStr);
  return price ? price * multiplier : null;
}

/**
 * Parse rating (e.g., "4.5 sao", "4.5/5")
 *
 * @param text - Rating text
 * @returns Rating number (0-5) or null
 */
export function parseRating(text: string): number | null {
  if (!text) {
    return null;
  }

  // Match patterns like "4.5", "4.5/5", "4.5 sao"
  const match = text.match(/(\d[.,]?\d*)/);

  if (!match) {
    return null;
  }

  const rating = parseFloat(match[1].replace(',', '.'));

  if (isNaN(rating) || rating < 0 || rating > 5) {
    return null;
  }

  return rating;
}

