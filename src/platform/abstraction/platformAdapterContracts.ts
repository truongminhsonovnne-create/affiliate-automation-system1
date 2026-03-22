/**
 * Platform Adapter Contracts
 *
 * Defines the contracts for platform-specific adapters.
 */

import type { CommercePlatform, PlatformAdapterHealth } from '../types.js';
import type { CommerceProductReference, PlatformReferenceNormalizationResult, PlatformReferenceValidationResult } from '../contracts/productReference.js';
import type { CommerceProductContext, PlatformProductContextResolutionResult } from '../contracts/productContext.js';
import type { CommercePromotion, CommercePromotionResolutionResult } from '../contracts/promotion.js';
import type { CommerceOutboundAction, CommerceConversionOutcome, CommerceAttributionLineage } from '../contracts/commercial.js';
import type { CommerceGrowthSurface, CommerceEntrySurface, PlatformGrowthAnalysis } from '../contracts/growth.js';

// ============================================================
// A. Product Reference Adapter
// ============================================================

export interface PlatformProductReferenceAdapter {
  platform: CommercePlatform;
  canParse: (input: string) => boolean;
  normalize: (input: string) => Promise<PlatformReferenceNormalizationResult>;
  validate: (reference: CommerceProductReference) => PlatformReferenceValidationResult;
}

// ============================================================
// B. Product Context Adapter
// ============================================================

export interface PlatformProductContextAdapter {
  platform: CommercePlatform;
  resolve: (reference: CommerceProductReference) => Promise<PlatformProductContextResolutionResult>;
  resolveBulk: (references: CommerceProductReference[]) => Promise<PlatformProductContextResolutionResult[]>;
}

// ============================================================
// C. Promotion Adapter
// ============================================================

export interface PlatformPromotionAdapter {
  platform: CommercePlatform;
  resolvePromotions: (context: {
    productId?: string;
    categoryId?: string;
    sellerId?: string;
    cartValue: number;
    userType?: string;
  }) => Promise<CommercePromotionResolutionResult>;
  getPromotionByCode: (code: string) => Promise<CommercePromotion | null>;
  evaluatePromotion: (promotion: CommercePromotion, context: any) => Promise<{ applicable: boolean; reason?: string }>;
}

// ============================================================
// D. Commercial Adapter
// ============================================================

export interface PlatformCommercialAdapter {
  platform: CommercePlatform;
  trackAction: (action: CommerceOutboundAction) => Promise<{ success: boolean; actionId: string }>;
  trackConversion: (outcome: CommerceConversionOutcome) => Promise<{ success: boolean; conversionId: string }>;
  calculateAttribution: (conversionId: string, model: string) => Promise<CommerceAttributionLineage>;
}

// ============================================================
// E. Growth Adapter
// ============================================================

export interface PlatformGrowthAdapter {
  platform: CommercePlatform;
  getSurfaces: () => Promise<CommerceGrowthSurface[]>;
  getSurface: (surfaceId: string) => Promise<CommerceGrowthSurface | null>;
  createSurface: (surface: Omit<CommerceGrowthSurface, 'surfaceId' | 'createdAt' | 'updatedAt'>) => Promise<CommerceGrowthSurface>;
  trackEntry: (entry: CommerceEntrySurface) => Promise<{ success: boolean; entryId: string }>;
  analyzePerformance: () => Promise<PlatformGrowthAnalysis>;
}

// ============================================================
// F. Adapter Health Result
// ============================================================

export interface PlatformAdapterHealthResult {
  platform: CommercePlatform;
  isHealthy: boolean;
  errors: string[];
  warnings: string[];
  lastCheck: Date;
  adapters: {
    reference: PlatformAdapterHealth;
    context: PlatformAdapterHealth;
    promotion: PlatformAdapterHealth;
    commercial: PlatformAdapterHealth;
    growth: PlatformAdapterHealth;
  };
}

// ============================================================
// G. Adapter Registry
// ============================================================

export interface PlatformAdapterRegistry {
  getReferenceAdapter: (platform: CommercePlatform) => PlatformProductReferenceAdapter | null;
  getContextAdapter: (platform: CommercePlatform) => PlatformProductContextAdapter | null;
  getPromotionAdapter: (platform: CommercePlatform) => PlatformPromotionAdapter | null;
  getCommercialAdapter: (platform: CommercePlatform) => PlatformCommercialAdapter | null;
  getGrowthAdapter: (platform: CommercePlatform) => PlatformGrowthAdapter | null;
  hasAdapter: (platform: CommercePlatform) => boolean;
  getSupportedPlatforms: () => CommercePlatform[];
}
