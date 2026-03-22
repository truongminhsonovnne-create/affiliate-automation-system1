/**
 * TikTok Shop Import File Source Adapter
 * Production-grade adapter for JSON/CSV file imports
 * Used for bulk data loading from internal files
 */

import { readFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';
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
} from '../types.js';
import {
  TikTokShopDataSourceType,
  TikTokShopSourceHealthStatus,
} from '../types.js';
import { TIKTOK_SHOP_SOURCE_READINESS_THRESHOLDS } from '../constants.js';

export interface TikTokShopImportFileOptions {
  filePath: string;
  format: 'json' | 'csv';
  encoding?: BufferEncoding;
}

/**
 * Import File Source Adapter
 * Loads product data from JSON or CSV files
 */
export class TikTokShopImportFileSourceAdapter implements TikTokShopProductSourceAdapter {
  readonly sourceKey = 'import_file';
  readonly sourceType = TikTokShopDataSourceType.FILE;
  readonly isSupported = false; // Not production ready

  private filePath?: string;
  private format?: 'json' | 'csv';

  constructor(options?: TikTokShopImportFileOptions) {
    this.filePath = options?.filePath;
    this.format = options?.format ?? 'json';
  }

  async isAvailable(): Promise<boolean> {
    // File import requires explicit file path
    return !!this.filePath;
  }

  getConfig(): Record<string, unknown> {
    return {
      batchSize: 100,
      timeout: 30000,
      retryAttempts: 2,
      enabled: false,
      supportedFormats: ['json', 'csv'],
      filePath: this.filePath,
    };
  }

  async healthCheck(): Promise<TikTokShopSourceHealthResult> {
    const checks: TikTokShopSourceHealthCheck[] = [];
    let totalScore = 0;

    // Check 1: Configuration availability
    const hasConfig = !!this.filePath;
    checks.push({
      checkName: 'file_configuration',
      passed: hasConfig,
      score: hasConfig ? 1.0 : 0,
      message: hasConfig ? `File path configured: ${this.filePath}` : 'No file path configured',
    });
    totalScore += hasConfig ? 1.0 : 0;

    // Check 2: File readability (if path is set)
    if (this.filePath) {
      try {
        await readFile(this.filePath, { encoding: 'utf-8' });
        checks.push({
          checkName: 'file_readability',
          passed: true,
          score: 1.0,
          message: 'File is readable',
        });
        totalScore += 1.0;
      } catch {
        checks.push({
          checkName: 'file_readability',
          passed: false,
          score: 0,
          message: 'File is not readable or does not exist',
        });
      }
    } else {
      checks.push({
        checkName: 'file_readability',
        passed: false,
        score: 0,
        message: 'Cannot check file - no path configured',
      });
    }

    // Check 3: Format support
    const validFormat = this.format === 'json' || this.format === 'csv';
    checks.push({
      checkName: 'format_support',
      passed: validFormat,
      score: validFormat ? 1.0 : 0,
      message: validFormat ? `Format supported: ${this.format}` : 'Invalid format',
    });
    totalScore += validFormat ? 1.0 : 0;

    const healthScore = totalScore / checks.length;
    const healthStatus =
      healthScore >= TIKTOK_SHOP_SOURCE_READINESS_THRESHOLDS.HEALTHY_THRESHOLD
        ? TikTokShopSourceHealthStatus.HEALTHY
        : healthScore >= TIKTOK_SHOP_SOURCE_READINESS_THRESHOLDS.DEGRADED_THRESHOLD
        ? TikTokShopSourceHealthStatus.DEGRADED
        : TikTokShopSourceHealthStatus.UNHEALTHY;

    return {
      sourceKey: this.sourceKey,
      healthStatus,
      healthScore,
      checks,
      lastChecked: new Date(),
      metadata: {
        filePath: this.filePath,
        format: this.format,
      },
    };
  }

  async evaluateReadiness(): Promise<TikTokShopSourceReadinessResult> {
    const blockers: TikTokShopDataBlocker[] = [];
    const warnings: TikTokShopDataWarning[] = [];

    // Blockers
    if (!this.filePath) {
      blockers.push({
        blockerId: 'no-file-path',
        blockerType: 'configuration_missing',
        severity: 'critical',
        message: 'No file path configured for import',
        field: 'filePath',
        sourceKey: this.sourceKey,
      });
    }

    blockers.push({
      blockerId: 'file-source-not-production',
      blockerType: 'source_not_production_ready',
      severity: 'high',
      message: 'File import source is not suitable for production use',
      sourceKey: this.sourceKey,
    });

    // Warnings
    warnings.push({
      warningId: 'manual-process',
      warningType: 'coverage_gap',
      severity: 'medium',
      message: 'File import requires manual file placement - not automated',
      sourceKey: this.sourceKey,
    });

    const readinessScore = 0.2;
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
        filePath: this.filePath,
        format: this.format,
      },
    };
  }

  async loadRawData(options?: TikTokShopProductSourceOptions): Promise<TikTokShopRawProductDataResult> {
    if (!this.filePath) {
      return {
        success: false,
        sourceKey: this.sourceKey,
        records: [],
        totalCount: 0,
        errors: ['No file path configured'],
      };
    }

    try {
      const content = await readFile(this.filePath, { encoding: this.format === 'json' ? 'utf-8' : 'utf-8' });

      let records: TikTokShopRawProductRecord[] = [];

      if (this.format === 'json') {
        const data = JSON.parse(content);
        const items = Array.isArray(data) ? data : data.products || data.items || [];
        records = items.map((item: Record<string, unknown>, index: number) => ({
          rawId: (item.productId as string) || `import-${index}`,
          sourceKey: this.sourceKey,
          rawData: item,
          collectedAt: new Date(),
        }));
      } else if (this.format === 'csv') {
        const parsed = parse(content, { columns: true, skip_empty_lines: true });
        records = (parsed as Record<string, string>[]).map((row, index) => ({
          rawId: row.productId || `import-${index}`,
          sourceKey: this.sourceKey,
          rawData: row,
          collectedAt: new Date(),
        }));
      }

      const limit = options?.limit ?? records.length;
      const offset = options?.offset ?? 0;

      return {
        success: true,
        sourceKey: this.sourceKey,
        records: records.slice(offset, offset + limit),
        totalCount: records.length,
        errors: [],
        metadata: {
          filePath: this.filePath,
          format: this.format,
          limit,
          offset,
        },
      };
    } catch (error) {
      return {
        success: false,
        sourceKey: this.sourceKey,
        records: [],
        totalCount: 0,
        errors: [`Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
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

    // Basic validation for product data
    if (!data.productId && !data.productTitle) {
      errors.push('Missing product identity (productId or productTitle)');
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

      if (!raw.productId && !raw.productTitle) {
        errors.push('Missing product identity');
      }

      return {
        canonicalReferenceKey:
          (raw.productId as string) || (raw.productTitle as string) || record.rawId,
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
      'categoryId',
      'categoryName',
      'price',
      'currency',
      'originalPrice',
      'discountPercentage',
      'stockStatus',
      'rating',
      'reviewCount',
      'salesCount',
      'images',
    ];
  }

  getMissingFields(): string[] {
    return [
      'realTimeStock',
      'realTimePrice',
      'liveSalesCount',
      'sellerFollowerCount',
      'sellerVerified',
      'promotionEligibility',
      'shippingOptions',
    ];
  }
}

// Factory function
export function createTikTokShopImportFileSource(options?: TikTokShopImportFileOptions): TikTokShopProductSourceAdapter {
  return new TikTokShopImportFileSourceAdapter(options);
}
