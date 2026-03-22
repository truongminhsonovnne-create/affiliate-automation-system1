/**
 * TikTok Shop Placeholder Adapters
 *
 * Production-grade placeholder adapters for TikTok Shop readiness.
 * These serve as scaffolding - they return clear "not implemented" states
 * rather than fake implementations.
 */

import type { CommercePlatform, PlatformAdapterHealth } from '../types.js';
import type { PlatformProductReferenceAdapter, PlatformProductContextAdapter, PlatformPromotionAdapter, PlatformCommercialAdapter, PlatformGrowthAdapter } from './platformAdapterContracts.js';

/**
 * Placeholder health check - indicates capability is not yet implemented
 */
function createPlaceholderHealth(isReady: boolean): PlatformAdapterHealth {
  return {
    isHealthy: isReady,
    errors: isReady ? [] : ['TikTok Shop adapter not implemented'],
    warnings: isReady ? [] : ['This is a placeholder - production implementation required'],
    lastCheck: new Date(),
  };
}

// ============================================================
// A. TikTok Shop Product Reference Adapter (Placeholder)
// ============================================================

export class TikTokShopProductReferenceAdapter implements PlatformProductReferenceAdapter {
  readonly platform: CommercePlatform = 'tiktok_shop';

  canParse(input: string): boolean {
    // Check if input looks like TikTok Shop URL
    const lower = input.toLowerCase();
    return lower.includes('tiktok') ||
           lower.includes('shop.tiktok') ||
           lower.includes('TikTok');
  }

  async normalize(input: string) {
    // Return placeholder - TikTok Shop not ready
    return {
      success: false,
      confidence: 0,
      errors: ['TikTok Shop product reference parsing not implemented. This is a placeholder for future implementation.'],
    };
  }

  validate(reference: any) {
    return {
      isValid: false,
      errors: ['TikTok Shop validation not implemented'],
    };
  }

  getHealth(): PlatformAdapterHealth {
    return createPlaceholderHealth(false);
  }
}

// ============================================================
// B. TikTok Shop Product Context Adapter (Placeholder)
// ============================================================

export class TikTokShopProductContextAdapter implements PlatformProductContextAdapter {
  readonly platform: CommercePlatform = 'tiktok_shop';

  async resolve(reference: any) {
    // Return placeholder - TikTok Shop not ready
    return {
      success: false,
      source: 'none',
      confidence: 0,
      errors: ['TikTok Shop product context resolution not implemented. This is a placeholder for future implementation.'],
      resolvedAt: new Date(),
    };
  }

  async resolveBulk(references: any[]) {
    // Return empty results - TikTok Shop not ready
    return references.map(() => ({
      success: false,
      source: 'none',
      confidence: 0,
      errors: ['TikTok Shop bulk resolution not implemented'],
      resolvedAt: new Date(),
    }));
  }

  getHealth(): PlatformAdapterHealth {
    return createPlaceholderHealth(false);
  }
}

// ============================================================
// C. TikTok Shop Promotion Adapter (Placeholder)
// ============================================================

export class TikTokShopPromotionAdapter implements PlatformPromotionAdapter {
  readonly platform: CommercePlatform = 'tiktok_shop';

  async resolvePromotions(context: any) {
    // Return empty - TikTok Shop not ready
    return {
      success: false,
      candidates: [],
      resolutionContext: context,
      resolvedAt: new Date(),
      errors: ['TikTok Shop promotion resolution not implemented'],
    };
  }

  async getPromotionByCode(code: string) {
    // Return null - TikTok Shop not ready
    return null;
  }

  async evaluatePromotion(promotion: any, context: any) {
    return {
      applicable: false,
      reason: 'TikTok Shop promotion evaluation not implemented',
    };
  }

  getHealth(): PlatformAdapterHealth {
    return createPlaceholderHealth(false);
  }
}

// ============================================================
// D. TikTok Shop Commercial Adapter (Placeholder)
// ============================================================

export class TikTokShopCommercialAdapter implements PlatformCommercialAdapter {
  readonly platform: CommercePlatform = 'tiktok_shop';

  async trackAction(action: any) {
    // Return failure - TikTok Shop not ready
    return {
      success: false,
      actionId: '',
      errors: ['TikTok Shop action tracking not implemented'],
    };
  }

  async trackConversion(outcome: any) {
    // Return failure - TikTok Shop not ready
    return {
      success: false,
      conversionId: '',
      errors: ['TikTok Shop conversion tracking not implemented'],
    };
  }

  async calculateAttribution(conversionId: string, model: string) {
    // Return empty - TikTok Shop not ready
    return {
      conversionId,
      attributionModel: model as any,
      attributedValue: 0,
      attributionBreakdown: [],
      attributionScore: 0,
      calculatedAt: new Date(),
    };
  }

  getHealth(): PlatformAdapterHealth {
    return createPlaceholderHealth(false);
  }
}

// ============================================================
// E. TikTok Shop Growth Adapter (Placeholder)
// ============================================================

export class TikTokShopGrowthAdapter implements PlatformGrowthAdapter {
  readonly platform: CommercePlatform = 'tiktok_shop';

  async getSurfaces() {
    // Return empty - TikTok Shop not ready
    return [];
  }

  async getSurface(surfaceId: string) {
    // Return null - TikTok Shop not ready
    return null;
  }

  async createSurface(surface: any) {
    // Return failure - TikTok Shop not ready
    throw new Error('TikTok Shop surface creation not implemented. This is a placeholder for future implementation.');
  }

  async trackEntry(entry: any) {
    // Return failure - TikTok Shop not ready
    return {
      success: false,
      entryId: '',
      errors: ['TikTok Shop entry tracking not implemented'],
    };
  }

  async analyzePerformance() {
    // Return empty - TikTok Shop not ready
    return {
      platform: 'tiktok_shop' as CommercePlatform,
      surfaces: [],
      aggregateMetrics: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        ctr: 0,
        cvr: 0,
      },
      topPerforming: [],
      underperforming: [],
      healthSummary: {},
      analysisDate: new Date(),
    };
  }

  getHealth(): PlatformAdapterHealth {
    return createPlaceholderHealth(false);
  }
}

// ============================================================
// F. Combined TikTok Shop Adapter (Placeholder)
// ============================================================

export class TikTokShopPlatformAdapter {
  readonly referenceAdapter = new TikTokShopProductReferenceAdapter();
  readonly contextAdapter = new TikTokShopProductContextAdapter();
  readonly promotionAdapter = new TikTokShopPromotionAdapter();
  readonly commercialAdapter = new TikTokShopCommercialAdapter();
  readonly growthAdapter = new TikTokShopGrowthAdapter();

  get platform() {
    return 'tiktok_shop' as CommercePlatform;
  }

  getHealth() {
    return {
      isHealthy: false,
      errors: [
        'TikTok Shop adapters are placeholders',
        'Production implementation required before use',
      ],
      warnings: [
        'This is a readiness scaffold, not a working implementation',
      ],
      lastCheck: new Date(),
    };
  }

  isReady(): boolean {
    return false;
  }

  getReadinessSummary(): {
    isReady: boolean;
    missing: string[];
    implemented: string[];
  } {
    return {
      isReady: false,
      missing: [
        'product_reference_parsing',
        'product_context_resolution',
        'promotion_rule_modeling',
        'public_flow_support',
        'commercial_attribution',
        'growth_surface_support',
      ],
      implemented: [],
    };
  }
}

// Export singleton instance
export const tiktokShopAdapter = new TikTokShopPlatformAdapter();
