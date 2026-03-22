/**
 * TikTok Shop Manual Sample Source Adapter
 * Production-grade adapter for manual/sample/local dataset path
 * Used for readiness testing and development
 */

import type {
  TikTokShopProductSourceAdapter,
  TikTokShopRawProductRecord,
  TikTokShopNormalizedProductRecord,
  TikTokShopSourceHealthResult,
  TikTokShopSourceReadinessResult,
  TikTokShopSourceHealthCheck,
  TikTokShopSourceValidationResult,
  TikTokShopProductSourceOptions,
  TikTokShopRawProductDataResult,
  TikTokShopDataBlocker,
  TikTokShopDataWarning,
  TikTokShopSourceSupportLevel,
  TikTokShopSourceHealthStatus,
} from '../types.js';
import {
  TikTokShopSourceSupportLevel,
  TikTokShopSourceHealthStatus,
  TikTokShopDataSourceType,
} from '../types.js';
import { TIKTOK_SHOP_SOURCE_READINESS_THRESHOLDS } from '../constants.js';

/**
 * Manual sample data for TikTok Shop testing
 */
const SAMPLE_PRODUCT_DATA = [
  {
    productId: 'TS-P001',
    productTitle: 'Premium Wireless Earbuds',
    productDescription: 'High-quality wireless earbuds with active noise cancellation',
    productUrl: 'https://shop.tiktok.com/@seller1/product/TS-P001',
    sellerId: 'S001',
    sellerName: 'Tech Gadgets Store',
    sellerRating: 4.8,
    sellerFollowerCount: 15000,
    sellerVerified: true,
    categoryId: 'C001',
    categoryName: 'Electronics',
    categoryPath: ['Electronics', 'Audio', 'Earbuds'],
    price: 79.99,
    currency: 'USD',
    originalPrice: 99.99,
    discountPercentage: 20,
    stockStatus: 'in_stock',
    stockQuantity: 500,
    rating: 4.7,
    reviewCount: 234,
    salesCount: 1200,
    images: ['https://cdn.tiktok.com/p1.jpg', 'https://cdn.tiktok.com/p2.jpg'],
    tags: ['wireless', 'bluetooth', 'noise-cancelling'],
  },
  {
    productId: 'TS-P002',
    productTitle: 'Organic Face Serum',
    productDescription: 'Vitamin C brightening face serum for all skin types',
    productUrl: 'https://shop.tiktok.com/@seller2/product/TS-P002',
    sellerId: 'S002',
    sellerName: 'Beauty Lab',
    sellerRating: 4.9,
    sellerFollowerCount: 25000,
    sellerVerified: true,
    categoryId: 'C002',
    categoryName: 'Beauty',
    categoryPath: ['Beauty', 'Skincare', 'Serums'],
    price: 34.99,
    currency: 'USD',
    originalPrice: 44.99,
    discountPercentage: 22,
    stockStatus: 'in_stock',
    stockQuantity: 200,
    rating: 4.8,
    reviewCount: 567,
    salesCount: 3500,
    images: ['https://cdn.tiktok.com/b1.jpg'],
    tags: ['organic', 'vitamin-c', 'skincare'],
  },
  {
    productId: 'TS-P003',
    productTitle: 'Smart Fitness Watch',
    productDescription: 'Track your health and fitness with this advanced smartwatch',
    productUrl: 'https://shop.tiktok.com/@seller3/product/TS-P003',
    sellerId: 'S003',
    sellerName: 'Fitness Gear Pro',
    sellerRating: 4.6,
    sellerFollowerCount: 8000,
    sellerVerified: true,
    categoryId: 'C001',
    categoryName: 'Electronics',
    categoryPath: ['Electronics', 'Wearables', 'Smartwatches'],
    price: 149.99,
    currency: 'USD',
    originalPrice: 199.99,
    discountPercentage: 25,
    stockStatus: 'low_stock',
    stockQuantity: 30,
    rating: 4.5,
    reviewCount: 189,
    salesCount: 890,
    images: ['https://cdn.tiktok.com/w1.jpg', 'https://cdn.tiktok.com/w2.jpg'],
    tags: ['smartwatch', 'fitness', 'health-tracking'],
  },
];

const SAMPLE_PROMOTION_DATA = [
  {
    promotionId: 'PROMO-FLASH-001',
    promotionType: 'flash_sale',
    discountValue: 30,
    discountType: 'percentage',
    minPurchaseAmount: 50,
    maxDiscountAmount: 50,
    applicableCategories: ['C001'],
    stackable: false,
    validFrom: new Date(Date.now() - 86400000).toISOString(),
    validUntil: new Date(Date.now() + 86400000).toISOString(),
  },
  {
    promotionId: 'PROMO-VOUCHER-001',
    promotionType: 'voucher',
    discountValue: 10,
    discountType: 'fixed',
    minPurchaseAmount: 30,
    maxDiscountAmount: 10,
    applicableCategories: ['C002'],
    stackable: true,
    validFrom: new Date(Date.now() - 172800000).toISOString(),
    validUntil: new Date(Date.now() + 604800000).toISOString(),
  },
];

/**
 * Manual Sample Source Adapter
 * Provides sample data for testing and development purposes
 */
export class TikTokShopManualSampleSourceAdapter implements TikTokShopProductSourceAdapter {
  readonly sourceKey = 'manual_sample';
  readonly sourceType = TikTokShopDataSourceType.MANUAL;
  readonly isSupported = true;

  private readonly sampleProducts = SAMPLE_PRODUCT_DATA;
  private readonly samplePromotions = SAMPLE_PROMOTION_DATA;

  async isAvailable(): Promise<boolean> {
    // Manual sample is always available for testing
    return true;
  }

  getConfig(): Record<string, unknown> {
    return {
      batchSize: 50,
      timeout: 10000,
      retryAttempts: 1,
      enabled: true,
      isSampleData: true,
    };
  }

  async healthCheck(): Promise<TikTokShopSourceHealthResult> {
    const checks: TikTokShopSourceHealthCheck[] = [];
    let totalScore = 0;

    // Check 1: Source availability
    const isAvailable = await this.isAvailable();
    checks.push({
      checkName: 'source_availability',
      passed: isAvailable,
      score: isAvailable ? 1.0 : 0,
      message: isAvailable ? 'Manual sample source is available' : 'Manual sample source is not available',
    });
    totalScore += isAvailable ? 1.0 : 0;

    // Check 2: Sample data presence
    const hasData = this.sampleProducts.length > 0;
    checks.push({
      checkName: 'sample_data_present',
      passed: hasData,
      score: hasData ? 1.0 : 0,
      message: hasData ? `Sample data available: ${this.sampleProducts.length} products` : 'No sample data available',
    });
    totalScore += hasData ? 1.0 : 0;

    // Check 3: Data structure validation
    const validStructure = this.sampleProducts.every(
      (p) => p.productId && p.productTitle && p.price
    );
    checks.push({
      checkName: 'data_structure_valid',
      passed: validStructure,
      score: validStructure ? 1.0 : 0,
      message: validStructure ? 'All sample products have valid structure' : 'Some products have invalid structure',
    });
    totalScore += validStructure ? 1.0 : 0;

    const healthScore = totalScore / checks.length;
    let healthStatus: TikTokShopSourceHealthStatus;

    if (healthScore >= TIKTOK_SHOP_SOURCE_READINESS_THRESHOLDS.HEALTHY_THRESHOLD) {
      healthStatus = TikTokShopSourceHealthStatus.HEALTHY;
    } else if (healthScore >= TIKTOK_SHOP_SOURCE_READINESS_THRESHOLDS.DEGRADED_THRESHOLD) {
      healthStatus = TikTokShopSourceHealthStatus.DEGRADED;
    } else {
      healthStatus = TikTokShopSourceHealthStatus.UNHEALTHY;
    }

    return {
      sourceKey: this.sourceKey,
      healthStatus,
      healthScore,
      checks,
      lastChecked: new Date(),
      metadata: {
        sampleProductCount: this.sampleProducts.length,
        samplePromotionCount: this.samplePromotions.length,
      },
    };
  }

  async evaluateReadiness(): Promise<TikTokShopSourceReadinessResult> {
    const blockers: TikTokShopDataBlocker[] = [];
    const warnings: TikTokShopDataWarning[] = [];

    // This is sample data - not production ready
    blockers.push({
      blockerId: 'sample-data-not-production',
      blockerType: 'source_not_production_ready',
      severity: 'critical',
      message: 'Manual sample data is for testing only - not suitable for production',
      field: 'all',
      sourceKey: this.sourceKey,
    });

    // Limited data coverage
    warnings.push({
      warningId: 'limited-data-coverage',
      warningType: 'coverage_gap',
      severity: 'medium',
      message: 'Sample data has limited coverage - only 3 products available',
      sourceKey: this.sourceKey,
    });

    // Missing real-time capabilities
    warnings.push({
      warningId: 'no-real-time',
      warningType: 'field_incomplete',
      severity: 'low',
      message: 'Sample data does not support real-time updates',
      sourceKey: this.sourceKey,
    });

    const readinessScore = 0.3; // Low score due to sample nature
    let readinessStatus: 'ready' | 'proceed_cautiously' | 'hold' | 'not_ready' = 'not_ready';

    if (readinessScore >= TIKTOK_SHOP_SOURCE_READINESS_THRESHOLDS.READY_THRESHOLD) {
      readinessStatus = 'ready';
    } else if (readinessScore >= TIKTOK_SHOP_SOURCE_READINESS_THRESHOLDS.PROCEED_CAUTIOUSLY_THRESHOLD) {
      readinessStatus = 'proceed_cautiously';
    } else if (readinessScore >= TIKTOK_SHOP_SOURCE_READINESS_THRESHOLDS.HOLD_THRESHOLD) {
      readinessStatus = 'hold';
    }

    return {
      sourceKey: this.sourceKey,
      readinessStatus,
      readinessScore,
      blockers,
      warnings,
      metadata: {
        sampleData: true,
        notForProduction: true,
      },
    };
  }

  async loadRawData(options?: TikTokShopProductSourceOptions): Promise<TikTokShopRawProductDataResult> {
    const limit = options?.limit ?? this.sampleProducts.length;
    const offset = options?.offset ?? 0;

    const records: TikTokShopRawProductRecord[] = this.sampleProducts
      .slice(offset, offset + limit)
      .map((product) => ({
        rawId: product.productId,
        sourceKey: this.sourceKey,
        rawData: product,
        collectedAt: new Date(),
      }));

    return {
      success: true,
      sourceKey: this.sourceKey,
      records,
      totalCount: this.sampleProducts.length,
      errors: [],
      metadata: {
        limit,
        offset,
        isSampleData: true,
      },
    };
  }

  validateSourcePayload(payload: unknown): TikTokShopSourceValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!payload) {
      errors.push('Payload is empty or null');
      return { isValid: false, errors, warnings, validatedAt: new Date() };
    }

    if (typeof payload !== 'object') {
      errors.push('Payload must be an object');
      return { isValid: false, errors, warnings, validatedAt: new Date() };
    }

    const data = payload as Record<string, unknown>;

    // Check for required fields
    if (!data.productId) {
      errors.push('Missing required field: productId');
    }

    if (!data.productTitle) {
      warnings.push('Missing recommended field: productTitle');
    }

    if (!data.price && !data.sellerId) {
      errors.push('At least one of price or sellerId must be present');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      validatedAt: new Date(),
    };
  }

  normalizeSourcePayload(rawData: TikTokShopRawProductRecord[]): TikTokShopNormalizedProductRecord[] {
    return rawData.map((record) => {
      const raw = record.rawData;
      const errors: string[] = [];

      // Validate required fields
      if (!raw.productId && !raw.productTitle) {
        errors.push('Missing product identity');
      }

      return {
        canonicalReferenceKey: (raw.productId as string) || (raw.productTitle as string) || record.rawId,
        normalizedData: {
          productId: raw.productId as string | undefined,
          productTitle: raw.productTitle as string | undefined,
          productDescription: raw.productDescription as string | undefined,
          productUrl: raw.productUrl as string | undefined,
          sellerId: raw.sellerId as string | undefined,
          sellerName: raw.sellerName as string | undefined,
          sellerRating: raw.sellerRating as number | undefined,
          sellerFollowerCount: raw.sellerFollowerCount as number | undefined,
          sellerVerified: raw.sellerVerified as boolean | undefined,
          categoryId: raw.categoryId as string | undefined,
          categoryName: raw.categoryName as string | undefined,
          categoryPath: raw.categoryPath as string[] | undefined,
          price: raw.price as number | undefined,
          currency: raw.currency as string | undefined,
          originalPrice: raw.originalPrice as number | undefined,
          discountPercentage: raw.discountPercentage as number | undefined,
          stockStatus: raw.stockStatus as string | undefined,
          stockQuantity: raw.staleQuantity as number | undefined,
          rating: raw.rating as number | undefined,
          reviewCount: raw.reviewCount as number | undefined,
          salesCount: raw.salesCount as number | undefined,
          images: raw.images as string[] | undefined,
          tags: raw.tags as string[] | undefined,
        },
        normalizationStatus: errors.length > 0 ? 'failed' : 'normalized',
        normalizationErrors: errors.length > 0 ? errors : undefined,
      };
    });
  }

  getSupportedFields(): string[] {
    return [
      'productId',
      'productTitle',
      'productDescription',
      'productUrl',
      'sellerId',
      'sellerName',
      'sellerRating',
      'sellerFollowerCount',
      'sellerVerified',
      'categoryId',
      'categoryName',
      'categoryPath',
      'price',
      'currency',
      'originalPrice',
      'discountPercentage',
      'stockStatus',
      'stockQuantity',
      'rating',
      'reviewCount',
      'salesCount',
      'images',
      'tags',
    ];
  }

  getMissingFields(): string[] {
    // For sample data, no fields are truly "missing" - but it's not production
    return [
      'realTimeStock',
      'realTimePrice',
      'liveSalesCount',
      'promotionEligibility',
      'shippingOptions',
    ];
  }

  /**
   * Get sample promotion data
   */
  getSamplePromotions() {
    return this.samplePromotions;
  }
}

// Factory function
export function createTikTokShopManualSampleSource(): TikTokShopProductSourceAdapter {
  return new TikTokShopManualSampleSourceAdapter();
}
