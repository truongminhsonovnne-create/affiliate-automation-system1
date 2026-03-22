/**
 * TikTok Shop Placeholder API Source Adapter
 * Production-grade placeholder for future API-like sources
 * Clearly indicates unavailable/not ready states
 */

import type {
  TikTokShopProductSourceAdapter,
  TikTokShopPromotionSourceAdapter,
  TikTokShopRawProductRecord,
  TikTokShopNormalizedProductRecord,
  TikTokShopSourceHealthResult,
  TikTokShopSourceReadinessResult,
  TikTokShopSourceHealthCheck,
  TikTokShopSourceValidationResult,
  TikTokShopProductSourceOptions,
  TikTokShopRawProductDataResult,
  TikTokShopPromotionDataResult,
  TikTokShopDataBlocker,
  TikTokShopDataWarning,
} from '../types.js';
import {
  TikTokShopDataSourceType,
  TikTokShopSourceHealthStatus,
  TikTokShopSourceSupportLevel,
} from '../types.js';
import { TIKTOK_SHOP_SOURCE_READINESS_THRESHOLDS } from '../constants.js';

/**
 * Base placeholder for unavailable sources
 */
export abstract class TikTokShopPlaceholderSourceAdapter<T = unknown> implements TikTokShopProductSourceAdapter {
  abstract readonly sourceKey: string;
  abstract readonly sourceType: TikTokShopDataSourceType;
  abstract readonly displayName: string;
  abstract readonly description: string;

  readonly isSupported = false;

  async isAvailable(): Promise<boolean> {
    return false;
  }

  getConfig(): Record<string, unknown> {
    return {
      enabled: false,
      available: false,
      reason: 'Source not yet available',
    };
  }

  async healthCheck(): Promise<TikTokShopSourceHealthResult> {
    return {
      sourceKey: this.sourceKey,
      healthStatus: TikTokShopSourceHealthStatus.UNKNOWN,
      healthScore: 0,
      checks: [
        {
          checkName: 'source_availability',
          passed: false,
          score: 0,
          message: `${this.displayName} is not available`,
        },
      ],
      lastChecked: new Date(),
      metadata: {
        reason: 'API access not yet implemented',
        displayName: this.displayName,
      },
    };
  }

  async evaluateReadiness(): Promise<TikTokShopSourceReadinessResult> {
    const blockers: TikTokShopDataBlocker[] = [];
    const warnings: TikTokShopDataWarning[] = [];

    blockers.push({
      blockerId: `${this.sourceKey}-not-available`,
      blockerType: 'source_unavailable',
      severity: 'critical',
      message: `${this.displayName} is not available - ${this.description}`,
      sourceKey: this.sourceKey,
    });

    const readinessScore = 0;
    const readinessStatus: 'ready' | 'proceed_cautiously' | 'hold' | 'not_ready' = 'not_ready';

    return {
      sourceKey: this.sourceKey,
      readinessStatus,
      readinessScore,
      blockers,
      warnings,
      metadata: {
        displayName: this.displayName,
        description: this.description,
        reason: 'API access not implemented',
      },
    };
  }

  async loadRawData(_options?: TikTokShopProductSourceOptions): Promise<TikTokShopRawProductDataResult> {
    return {
      success: false,
      sourceKey: this.sourceKey,
      records: [],
      totalCount: 0,
      errors: [`${this.displayName} is not available - API access not implemented`],
      metadata: {
        reason: 'source_unavailable',
      },
    };
  }

  validateSourcePayload(_payload: unknown): TikTokShopSourceValidationResult {
    return {
      isValid: false,
      errors: [`${this.displayName} is not available - cannot validate`],
      warnings: [],
      validatedAt: new Date(),
    };
  }

  normalizeSourcePayload(_rawData: TikTokShopRawProductRecord[]): TikTokShopNormalizedProductRecord[] {
    return [];
  }

  getSupportedFields(): string[] {
    return [];
  }

  getMissingFields(): string[] {
    return ['all_fields'];
  }
}

/**
 * TikTok API Product Source - Placeholder for official TikTok Shop Product API
 */
export class TikTokShopApiProductSourceAdapter extends TikTokShopPlaceholderSourceAdapter {
  readonly sourceKey = 'tiktok_api_product';
  readonly sourceType = TikTokShopDataSourceType.API;
  readonly displayName = 'TikTok Product API';
  readonly description = 'Official TikTok Shop Product API for product data access';
}

/**
 * TikTok API Promotion Source - Placeholder for official TikTok Shop Promotion API
 */
export class TikTokShopApiPromotionSourceAdapter extends TikTokShopPlaceholderSourceAdapter {
  readonly sourceKey = 'tiktok_api_promotion';
  readonly sourceType = TikTokShopDataSourceType.API;
  readonly displayName = 'TikTok Promotion API';
  readonly description = 'Official TikTok Shop Promotion API for promotion/campaign data';
}

/**
 * TikTok Web Scraper Source - Placeholder for web scraping approach
 */
export class TikTokShopWebScraperSourceAdapter extends TikTokShopPlaceholderSourceAdapter {
  readonly sourceKey = 'tiktok_web_scraper';
  readonly sourceType = TikTokShopDataSourceType.SCRAPER;
  readonly displayName = 'TikTok Web Scraper';
  readonly description = 'Web scraping solution for TikTok Shop data extraction';
}

/**
 * TikTok Affiliate API Source - Placeholder for TikTok Partner/Affiliate API
 */
export class TikTokShopAffiliateApiSourceAdapter extends TikTokShopPlaceholderSourceAdapter {
  readonly sourceKey = 'tiktok_affiliate_api';
  readonly sourceType = TikTokShopDataSourceType.API;
  readonly displayName = 'TikTok Affiliate API';
  readonly description = 'TikTok Affiliate/Partner API for affiliate data access';
}

// Factory functions
export function createTikTokShopApiProductSource(): TikTokShopProductSourceAdapter {
  return new TikTokShopApiProductSourceAdapter();
}

export function createTikTokShopApiPromotionSource(): TikTokShopProductSourceAdapter {
  return new TikTokShopApiPromotionSourceAdapter();
}

export function createTikTokShopWebScraperSource(): TikTokShopProductSourceAdapter {
  return new TikTokShopWebScraperSourceAdapter();
}

export function createTikTokShopAffiliateApiSource(): TikTokShopProductSourceAdapter {
  return new TikTokShopAffiliateApiSourceAdapter();
}

/**
 * Get all placeholder sources
 */
export function getAllPlaceholderSources(): TikTokShopProductSourceAdapter[] {
  return [
    new TikTokShopApiProductSourceAdapter(),
    new TikTokShopApiPromotionSourceAdapter(),
    new TikTokShopWebScraperSourceAdapter(),
    new TikTokShopAffiliateApiSourceAdapter(),
  ];
}

/**
 * Get placeholder source by key
 */
export function getPlaceholderSourceByKey(sourceKey: string): TikTokShopProductSourceAdapter | null {
  const sources = getAllPlaceholderSources();
  return sources.find((s) => s.sourceKey === sourceKey) || null;
}
