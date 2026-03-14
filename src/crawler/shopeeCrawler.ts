/**
 * Shopee Crawler Module
 *
 * Crawls product data from m.shopee.vn
 * Supports Flash Sale and Search results
 */

import { Page, BrowserContext } from 'playwright';
import { createShopeeBrowserContext, createShopeePage } from './browser.js';
import { env } from '../config/env.js';
import { humanLikeScroll, scrollToElement } from '../utils/scroll.js';
import { randomBetween, sleep } from '../utils/delay.js';
import { log } from '../utils/logger.js';
import type { ShopeeRawProduct } from '../types/product.js';
import { normalizeProductUrl, extractProductId } from './parsers.js';

// ============================================
// Types & Interfaces
// ============================================

/**
 * Crawler options
 */
export interface CrawlerOptions {
  /** Maximum products to crawl */
  maxProducts?: number;

  /** Maximum scroll actions */
  maxScrolls?: number;

  /** Minimum delay between actions (ms) */
  minDelay?: number;

  /** Maximum delay between actions (ms) */
  maxDelay?: number;

  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Result from crawling operation
 */
export interface CrawlResult<T> {
  success: boolean;
  data: T[];
  totalFound: number;
  error?: string;
}

/**
 * Default crawler options
 */
const DEFAULT_OPTIONS: Required<CrawlerOptions> = {
  maxProducts: 50,
  maxScrolls: 20,
  minDelay: 500,
  maxDelay: 1500,
  verbose: false,
};

// ============================================
// Mobile Shopee Selectors
// ============================================

/**
 * CSS selectors for mobile Shopee
 */
const SELECTORS = {
  // Product card selectors
  productCard: [
    // Primary selectors
    '[data-sqe="product"]',
    '.product-card',
    // Fallback selectors
    'div[class*="product"]',
    'a[href*="/product/"]',
  ].join(', '),

  productCardMobile: [
    // Mobile-specific
    '.WYYKg',
    '.shopee-search-item-result__item',
    '[class*="item"] [class*="product"]',
    'a[href*="i."]',
  ].join(', '),

  // Product details
  productTitle: [
    'h1[data-sqe="name"]',
    '.product-title',
    'span[class*="name"]',
    'div[data-sqe="name"]',
  ].join(', '),

  productPrice: [
    'span[data-sqe="price"]',
    '.product-price',
    'div[class*="price"] span:first-child',
  ].join(', '),

  productImage: [
    'img[data-sqe="image"]',
    '.product-image img',
    'div[data-sqe="image"] img',
  ].join(', '),

  productDescription: [
    'div[data-sqe="description"]',
    '.product-description',
    'div[class*="description"]',
  ].join(', '),

  productLink: [
    'a[href*="/product/"]',
    'a[href*="i."]',
  ].join(', '),

  // Flash Sale specific
  flashSaleSection: [
    '.flash-sale-section',
    '[data-sqe="flash_sale"]',
    '.shopee-flash-sale',
    '[class*="flash-sale"]',
  ].join(', '),

  flashSaleItem: [
    '.flash-sale-item',
    '[data-sqe="flash_sale_item"]',
    '[class*="flashsale-item"]',
    '[class*="fs-item"]',
  ].join(', '),

  // Search results
  searchResultItem: [
    '[data-sqe="item"]',
    '.search-result-item',
    '[class*="search-item"]',
    '.search-item',
  ].join(', '),

  // Load more
  loadMoreButton: [
    'button[data-sqe="loadMore"]',
    '.load-more-btn',
    '[class*="load-more"]',
    'button:has-text("Xem thêm")',
  ].join(', '),

  // No more content
  noMoreContent: [
    '.no-more-content',
    '[class*="no-more"]',
    '.empty-result',
  ].join(', '),
};

// ============================================
// Helper Functions
// ============================================

/**
 * Wait with random delay between actions
 */
async function waitBetweenActions(min: number, max: number): Promise<void> {
  const delay = randomBetween(min, max);
  await sleep(delay);
}

/**
 * Find element using multiple selector fallbacks
 */
async function findElement(
  page: Page,
  selectors: string | string[],
  options?: { timeout?: number; state?: 'visible' | 'attached' }
): Promise<ReturnType<Page['$']> | null> {
  const selectorArray = Array.isArray(selectors) ? selectors : [selectors];

  for (const selector of selectorArray) {
    try {
      const element = await page.$(selector);
      if (element) {
        return element;
      }
    } catch {
      // Continue to next selector
    }
  }

  return null;
}

/**
 * Find all elements using multiple selector fallbacks
 */
async function findElements(
  page: Page,
  selectors: string | string[]
): Promise<ReturnType<Page['$$']>> {
  const selectorArray = Array.isArray(selectors) ? selectors : [selectors];

  for (const selector of selectorArray) {
    try {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        return elements;
      }
    } catch {
      // Continue to next selector
    }
  }

  return [];
}

/**
 * Extract text from element with fallbacks
 */
async function getElementText(
  page: Page,
  selectors: string | string[]
): Promise<string> {
  const element = await findElement(page, selectors);
  if (!element) return '';

  try {
    const text = await element.textContent();
    return text?.trim() || '';
  } catch {
    return '';
  }
}

/**
 * Extract attribute from element with fallbacks
 */
async function getElementAttribute(
  page: Page,
  selectors: string | string[],
  attribute: string
): Promise<string> {
  const element = await findElement(page, selectors);
  if (!element) return '';

  try {
    const value = await element.getAttribute(attribute);
    return value || '';
  } catch {
    return '';
  }
}

// ============================================
// Product Data Extraction
// ============================================

/**
 * Extract product card data from a product card element
 */
export async function extractProductCardData(
  page: Page,
  cardElement: ReturnType<Page['$']>
): Promise<ShopeeRawProduct | null> {
  if (!cardElement) {
    return null;
  }

  try {
    // Extract data using page evaluation for better performance
    const productData = await page.evaluate((el) => {
      // Find title
      const titleEl = el.querySelector('h1[data-sqe="name"]') ||
                      el.querySelector('[data-sqe="name"]') ||
                      el.querySelector('.product-name') ||
                      el.querySelector('[class*="name"]') ||
                      el.querySelector('span') ||
                      el.querySelector('div');

      // Find price
      const priceEl = el.querySelector('[data-sqe="price"]') ||
                      el.querySelector('[class*="price"]') ||
                      el.querySelector('span');

      // Find image
      const imageEl = el.querySelector('img[data-sqe="image"]') ||
                      el.querySelector('img') ||
                      el.querySelector('[data-sqe="image"]') ||
                      el.querySelector('[class*="image"] img');

      // Find link
      const linkEl = el.querySelector('a[href*="/product/"]') ||
                     el.querySelector('a[href*="i."]') ||
                     el.querySelector('a');

      return {
        rawTitle: titleEl?.textContent?.trim() || '',
        rawPrice: priceEl?.textContent?.trim() || '',
        rawImage: (imageEl as HTMLImageElement)?.src ||
                  (imageEl as HTMLImageElement)?.dataset?.src || '',
        rawUrl: linkEl?.getAttribute('href') || '',
      };
    }, cardElement);

    // Validate minimal required data
    if (!productData.rawTitle || !productData.rawPrice) {
      return null;
    }

    // Normalize URL
    const productUrl = normalizeProductUrl(productData.rawUrl);

    // Build raw product
    const rawProduct: ShopeeRawProduct = {
      title: productData.rawTitle,
      priceText: productData.rawPrice,
      imageUrl: productData.rawImage,
      productUrl,
      sourceType: 'shopee',
      sourceKeyword: '', // Will be set by caller
      crawledAt: new Date(),
    };

    return rawProduct;
  } catch (error) {
    log.debug({ error }, 'Failed to extract product card data');
    return null;
  }
}

/**
 * Extract detailed product data from product detail page
 */
export async function extractProductDetailData(
  page: Page,
  sourceKeyword: string
): Promise<ShopeeRawProduct | null> {
  try {
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded').catch(() => {});

    const productData = await page.evaluate(() => {
      // Title
      const titleEl = document.querySelector('h1[data-sqe="name"]') ||
                      document.querySelector('[data-sqe="name"]') ||
                      document.querySelector('h1');

      // Price
      const priceEl = document.querySelector('[data-sqe="price"]') ||
                      document.querySelector('[class*="price"]') ||
                      document.querySelector('span');

      // Image
      const imageEl = document.querySelector('img[data-sqe="image"]') ||
                      document.querySelector('.product-image img') ||
                      document.querySelector('img');

      // Description
      const descEl = document.querySelector('[data-sqe="description"]') ||
                     document.querySelector('[class*="description"]') ||
                     document.querySelector('.product-details');

      // Shop info
      const shopEl = document.querySelector('[data-sqe="shop_name"]') ||
                     document.querySelector('[class*="shop-name"]');

      // Rating
      const ratingEl = document.querySelector('[data-sqe="rating"]') ||
                       document.querySelector('[class*="rating"]');

      // Reviews
      const reviewsEl = document.querySelector('[data-sqe="review_count"]') ||
                        document.querySelector('[class*="review"]');

      // Sold count
      const soldEl = document.querySelector('[data-sqe="sold"]') ||
                     document.querySelector('[class*="sold"]');

      return {
        rawTitle: titleEl?.textContent?.trim() || '',
        rawPrice: priceEl?.textContent?.trim() || '',
        rawImage: (imageEl as HTMLImageElement)?.src || '',
        rawDescription: descEl?.textContent?.trim() || '',
        rawShopName: shopEl?.textContent?.trim() || '',
        rawRating: ratingEl?.textContent?.trim() || '',
        rawReviewCount: reviewsEl?.textContent?.trim() || '',
        rawSoldCount: soldEl?.textContent?.trim() || '',
        currentUrl: window.location.href,
      };
    });

    // Validate
    if (!productData.rawTitle || !productData.rawPrice) {
      return null;
    }

    // Extract product ID for shopeeProductId
    const productId = extractProductId(productData.currentUrl);

    // Parse rating and reviews
    const rating = productData.rawRating ? parseFloat(productData.rawRating) : undefined;
    const reviewCount = productData.rawReviewCount
      ? parseInt(productData.rawReviewCount.replace(/\D/g, ''), 10)
      : undefined;
    const soldCount = productData.rawSoldCount
      ? parseInt(productData.rawSoldCount.replace(/\D/g, ''), 10)
      : undefined;

    return {
      title: productData.rawTitle,
      priceText: productData.rawPrice,
      imageUrl: productData.rawImage,
      description: productData.rawDescription || undefined,
      productUrl: productData.currentUrl,
      sourceType: 'shopee',
      sourceKeyword,
      crawledAt: new Date(),
      shopName: productData.rawShopName || undefined,
      shopeeProductId: productId || undefined,
      rating: !isNaN(rating || 0) ? rating : undefined,
      reviewCount: !isNaN(reviewCount || 0) ? reviewCount : undefined,
      soldCount: !isNaN(soldCount || 0) ? soldCount : undefined,
    };
  } catch (error) {
    log.debug({ error }, 'Failed to extract product detail data');
    return null;
  }
}

// ============================================
// Main Crawler Functions
// ============================================

/**
 * Crawl products from Flash Sale page
 */
export async function crawlFlashSaleProducts(
  page: Page,
  options: CrawlerOptions = {}
): Promise<CrawlResult<ShopeeRawProduct>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const products: ShopeeRawProduct[] = [];

  try {
    log.info('Starting Flash Sale crawl...');

    // Navigate to Flash Sale page
    const flashSaleUrl = 'https://m.shopee.vn/flash-sale';
    await page.goto(flashSaleUrl, {
      waitUntil: 'networkidle',
      timeout: env.BROWSER_TIMEOUT,
    });

    // Wait for page to stabilize
    await waitBetweenActions(opts.minDelay, opts.maxDelay);

    // Scroll to load products
    await humanLikeScroll(page, {
      minStep: 300,
      maxStep: 600,
      maxScrolls: opts.maxScrolls,
      minDelay: opts.minDelay,
      maxDelay: opts.maxDelay,
    });

    // Find all product cards
    const productCards = await findElements(page, [
      SELECTORS.productCard,
      SELECTORS.productCardMobile,
      SELECTORS.flashSaleItem,
      'a[href*="/product/"]',
    ]);

    log.info({ count: productCards.length }, 'Found product elements');

    // Extract data from each card
    for (const card of productCards) {
      if (products.length >= opts.maxProducts) break;

      const product = await extractProductCardData(page, card);

      if (product) {
        product.sourceKeyword = 'flash_sale';
        products.push(product);
      }

      await waitBetweenActions(opts.minDelay, opts.maxDelay);
    }

    return {
      success: true,
      data: products,
      totalFound: products.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error({ error }, 'Flash Sale crawl failed');

    return {
      success: false,
      data: [],
      totalFound: 0,
      error: errorMessage,
    };
  }
}

/**
 * Crawl products from search results
 */
export async function crawlSearchProducts(
  page: Page,
  keyword: string,
  options: CrawlerOptions = {}
): Promise<CrawlResult<ShopeeRawProduct>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const products: ShopeeRawProduct[] = [];

  try {
    log.info({ keyword }, 'Starting search crawl...');

    // Build search URL
    const searchUrl = `https://m.shopee.vn/search?keyword=${encodeURIComponent(keyword)}`;

    await page.goto(searchUrl, {
      waitUntil: 'networkidle',
      timeout: env.BROWSER_TIMEOUT,
    });

    // Wait for initial load
    await waitBetweenActions(opts.minDelay, opts.maxDelay);

    // Scroll to load more products
    await humanLikeScroll(page, {
      minStep: 300,
      maxStep: 500,
      maxScrolls: opts.maxScrolls,
      minDelay: opts.minDelay,
      maxDelay: opts.maxDelay,
    });

    // Find all product cards
    const productCards = await findElements(page, [
      SELECTORS.productCard,
      SELECTORS.productCardMobile,
      SELECTORS.searchResultItem,
      'a[href*="/product/"]',
    ]);

    log.info({ count: productCards.length, keyword }, 'Found product elements');

    // Extract data from each card
    for (const card of productCards) {
      if (products.length >= opts.maxProducts) break;

      const product = await extractProductCardData(page, card);

      if (product) {
        product.sourceKeyword = keyword;
        products.push(product);
      }

      await waitBetweenActions(opts.minDelay, opts.maxDelay);
    }

    return {
      success: true,
      data: products,
      totalFound: products.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error({ error, keyword }, 'Search crawl failed');

    return {
      success: false,
      data: [],
      totalFound: 0,
      error: errorMessage,
    };
  }
}

/**
 * Crawl product details by visiting each product page
 */
export async function crawlProductDetails(
  page: Page,
  products: ShopeeRawProduct[],
  options: CrawlerOptions = {}
): Promise<CrawlResult<ShopeeRawProduct>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const detailedProducts: ShopeeRawProduct[] = [];

  try {
    log.info({ count: products.length }, 'Crawling product details...');

    for (const product of products) {
      if (detailedProducts.length >= opts.maxProducts) break;

      try {
        // Navigate to product page
        await page.goto(product.productUrl, {
          waitUntil: 'networkidle',
          timeout: env.BROWSER_TIMEOUT,
        });

        // Wait for page to stabilize
        await waitBetweenActions(opts.minDelay, opts.maxDelay);

        // Extract detailed data
        const detailProduct = await extractProductDetailData(page, product.sourceKeyword);

        if (detailProduct) {
          detailedProducts.push(detailProduct);
        }

        await waitBetweenActions(opts.minDelay, opts.maxDelay);
      } catch (error) {
        log.debug({ error, url: product.productUrl }, 'Failed to crawl product detail');
        // Keep original product if detail crawl fails
        detailedProducts.push(product);
      }
    }

    return {
      success: true,
      data: detailedProducts,
      totalFound: detailedProducts.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error({ error }, 'Product details crawl failed');

    return {
      success: false,
      data: products, // Return original products on failure
      totalFound: products.length,
      error: errorMessage,
    };
  }
}

// ============================================
// ShopeeCrawler Class (High-level API)
// ============================================

/**
 * Shopee Crawler class for easier usage
 */
export class ShopeeCrawler {
  private page: Page | null = null;
  private context: BrowserContext | null = null;

  /**
   * Initialize crawler with browser context
   */
  async init(): Promise<void> {
    this.context = await createShopeeBrowserContext();
    this.page = await this.context.newPage();
    log.info('ShopeeCrawler initialized');
  }

  /**
   * Crawl Flash Sale products
   */
  async crawlFlashSale(options?: CrawlerOptions): Promise<CrawlResult<ShopeeRawProduct>> {
    if (!this.page) {
      throw new Error('Crawler not initialized. Call init() first.');
    }
    return crawlFlashSaleProducts(this.page, options);
  }

  /**
   * Crawl search results
   */
  async search(keyword: string, options?: CrawlerOptions): Promise<CrawlResult<ShopeeRawProduct>> {
    if (!this.page) {
      throw new Error('Crawler not initialized. Call init() first.');
    }
    return crawlSearchProducts(this.page, keyword, options);
  }

  /**
   * Crawl product details for list of products
   */
  async getProductDetails(
    products: ShopeeRawProduct[],
    options?: CrawlerOptions
  ): Promise<CrawlResult<ShopeeRawProduct>> {
    if (!this.page) {
      throw new Error('Crawler not initialized. Call init() first.');
    }
    return crawlProductDetails(this.page, products, options);
  }

  /**
   * Get the underlying page
   */
  getPage(): Page | null {
    return this.page;
  }

  /**
   * Close crawler and release resources
   */
  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }

    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    log.info('ShopeeCrawler closed');
  }
}

/**
 * Factory function to create a new Shopee crawler
 */
export async function createShopeeCrawler(): Promise<ShopeeCrawler> {
  const crawler = new ShopeeCrawler();
  await crawler.init();
  return crawler;
}

// ============================================
// Export
// ============================================

export type { CrawlerOptions, CrawlResult };
export {
  crawlFlashSaleProducts,
  crawlSearchProducts,
  crawlProductDetails,
  extractProductCardData,
  extractProductDetailData,
};
