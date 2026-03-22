/**
 * Shopee Pipeline - Discovery Adapter
 *
 * Unified discovery layer interface for Shopee crawl pipeline.
 */

import type { Browser, Page } from 'playwright';
import type { PipelineLogger } from './types.js';
import type { ShopeeListingDiscovery, ShopeeListingDiscoveryOptions } from '../discovery/shopeeListingDiscovery.js';

export interface DiscoveryAdapterResult {
  /** Discovered items */
  items: Array<{
    productUrl: string;
    positionIndex: number;
    metadata?: Record<string, unknown>;
  }>;

  /** Total found before filtering */
  totalFound: number;

  /** Source URL */
  sourceUrl: string;

  /** Duration */
  durationMs: number;
}

export interface DiscoveryAdapterOptions {
  /** Browser instance */
  browser: Browser;

  /** Page instance */
  page: Page;

  /** Discovery mode */
  mode: 'flash_sale' | 'search';

  /** Search keyword (for search mode) */
  keyword?: string;

  /** Maximum items to discover */
  maxItems?: number;

  /** Custom logger */
  logger?: PipelineLogger;
}

/**
 * Unified discovery adapter
 */
export class ShopeeDiscoveryAdapter {
  private discovery: ShopeeListingDiscovery;
  private logger?: PipelineLogger;

  constructor(options: {
    discovery: ShopeeListingDiscovery;
    logger?: PipelineLogger;
  }) {
    this.discovery = options.discovery;
    this.logger = options.logger;
  }

  /**
   * Execute discovery based on mode
   */
  async discover(options: DiscoveryAdapterOptions): Promise<DiscoveryAdapterResult> {
    const startTime = Date.now();
    const { browser, page, mode, keyword, maxItems = 100 } = options;

    this.logger?.info('Starting discovery', { mode, keyword, maxItems });

    let discoveryOptions: ShopeeListingDiscoveryOptions = {
      browser,
      page,
      maxItems,
    };

    if (mode === 'flash_sale') {
      return await this.discoverFlashSale(discoveryOptions, startTime);
    } else if (mode === 'search' && keyword) {
      return await this.discoverSearch(discoveryOptions, keyword, startTime);
    } else {
      throw new Error(`Invalid mode or missing keyword: ${mode}, ${keyword}`);
    }
  }

  /**
   * Discover flash sale items
   */
  private async discoverFlashSale(
    options: ShopeeListingDiscoveryOptions,
    startTime: number
  ): Promise<DiscoveryAdapterResult> {
    const result = await this.discovery.discoverFlashSale(options);

    this.logger?.info('Flash sale discovery complete', {
      totalFound: result.items.length,
      durationMs: Date.now() - startTime,
    });

    return {
      items: result.items.map((item, index) => ({
        productUrl: item.productUrl,
        positionIndex: index,
        metadata: {
          ...item.metadata,
          discoveredAt: Date.now(),
        },
      })),
      totalFound: result.totalFound,
      sourceUrl: result.sourceUrl,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Discover search items
   */
  private async discoverSearch(
    options: ShopeeListingDiscoveryOptions,
    keyword: string,
    startTime: number
  ): Promise<DiscoveryAdapterResult> {
    const result = await this.discovery.discoverSearch({
      ...options,
      keyword,
    });

    this.logger?.info('Search discovery complete', {
      keyword,
      totalFound: result.items.length,
      durationMs: Date.now() - startTime,
    });

    return {
      items: result.items.map((item, index) => ({
        productUrl: item.productUrl,
        positionIndex: index,
        metadata: {
          ...item.metadata,
          discoveredAt: Date.now(),
        },
      })),
      totalFound: result.totalFound,
      sourceUrl: result.sourceUrl,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Create discovery adapter
 */
export function createDiscoveryAdapter(
  discovery: ShopeeListingDiscovery,
  logger?: PipelineLogger
): ShopeeDiscoveryAdapter {
  return new ShopeeDiscoveryAdapter({ discovery, logger });
}
