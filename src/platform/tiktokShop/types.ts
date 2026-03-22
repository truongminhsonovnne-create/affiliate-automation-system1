/**
 * TikTok Shop Domain Layer - Core Types
 *
 * Production-grade type definitions for:
 * - Product reference types
 * - Product context types
 * - Promotion types
 * - Compatibility types
 * - Readiness types
 */

// ============================================================
// A. Reference Types
// ============================================================

export type TikTokShopReferenceType =
  | 'product_detail'
  | 'product_detail_short'
  | 'shop'
  | 'live'
  | 'video'
  | 'user'
  | 'search'
  | 'affiliate_link'
  | 'unknown';

export type TikTokShopUrlVariant = 'full' | 'short' | 'mobile' | 'desktop' | 'app';

export interface TikTokShopProductIdentifier {
  productId: string;
  shopId?: string;
  itemId?: string;
  secItemId?: string;
}

export interface TikTokShopSellerIdentifier {
  shopId: string;
  secShopId?: string;
  shopName?: string;
}

export interface TikTokShopCanonicalReference {
  referenceId: string;
  referenceType: TikTokShopReferenceType;
  identifiers: TikTokShopProductIdentifier;
  normalizedUrl: string;
  canonicalUrl: string;
  variant: TikTokShopUrlVariant;
  confidence: number;
  isValid: boolean;
  parseErrors: string[];
}

export interface TikTokShopReferenceParseResult {
  success: boolean;
  reference?: TikTokShopCanonicalReference;
  parseMetadata: {
    inputLength: number;
    detectedVariant: TikTokShopUrlVariant;
    detectedType: TikTokShopReferenceType;
    processingTimeMs: number;
  };
  errors: string[];
}

export interface TikTokShopReferenceValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validatedAt: Date;
}

// ============================================================
// B. Product Context Types
// ============================================================

export interface TikTokShopSellerContext {
  shopId: string;
  secShopId?: string;
  shopName: string;
  shopType: 'official' | 'verified' | 'regular';
  rating?: number;
  followerCount?: number;
  productCount?: number;
  isActive: boolean;
}

export interface TikTokShopCategoryContext {
  categoryId: string;
  categoryName: string;
  breadcrumbs: string[];
}

export interface TikTokShopPriceContext {
  currentPrice: number;
  originalPrice?: number;
  discount?: number;
  currency: string;
  priceType: 'fixed' | 'range' | 'dynamic';
  minPrice?: number;
  maxPrice?: number;
}

export interface TikTokShopInventoryContext {
  stockLevel: number;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'pre_order' | 'unavailable';
}

export interface TikTokShopProductImage {
  url: string;
  type: 'main' | 'thumbnail' | 'gallery';
}

export interface TikTokShopProductContext {
  productId: string;
  title: string;
  description?: string;
  seller: TikTokShopSellerContext;
  category: TikTokShopCategoryContext;
  price: TikTokShopPriceContext;
  images: TikTokShopProductImage[];
  inventory: TikTokShopInventoryContext;
  metadata: Record<string, unknown>;
  fetchedAt: Date;
}

// ============================================================
// C. Promotion Types
// ============================================================

export type TikTokShopPromotionType =
  | 'discount'
  | 'voucher'
  | 'coupon'
  | 'flash_sale'
  | 'bundle'
  | 'free_shipping'
  | 'new_user'
  | 'loyalty'
  | 'campaign'
  | 'unknown';

export type TikTokShopPromotionScope =
  | 'global'
  | 'shop'
  | 'product'
  | 'category'
  | 'user_segment'
  | 'cart';

export type TikTokShopDiscountType = 'percentage' | 'fixed_amount' | 'bogo' | 'shipping';

export interface TikTokShopPromotionConstraint {
  type: 'min_spend' | 'min_quantity' | 'max_discount' | 'product_id' | 'category_id' | 'user_type' | 'region';
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in';
  value: unknown;
}

export interface TikTokShopPromotionEligibility {
  eligibilityType: 'all' | 'new_user' | 'vip' | 'specific_users' | 'first_purchase' | 'region';
  constraints: TikTokShopPromotionConstraint[];
}

export interface TikTokShopPromotionBenefit {
  discountType: TikTokShopDiscountType;
  discountValue: number;
  maxDiscount?: number;
  currency?: string;
}

export interface TikTokShopPromotion {
  promotionId: string;
  promotionCode?: string;
  promotionType: TikTokShopPromotionType;
  title: string;
  description?: string;
  scope: TikTokShopPromotionScope;
  benefit: TikTokShopPromotionBenefit;
  eligibility: TikTokShopPromotionEligibility;
  startDate: Date;
  endDate: Date;
  isStackable: boolean;
  maxUses?: number;
  currentUses?: number;
}

export interface TikTokShopPromotionCompatibilityResult {
  isCompatible: boolean;
  compatibilityLevel: 'full' | 'partial' | 'unsupported';
  compatibilityScore: number;
  mappedFields: string[];
  partialFields: string[];
  unsupportedFields: string[];
  blockers: TikTokShopPromotionGap[];
  warnings: TikTokShopPromotionGap[];
}

export interface TikTokShopPromotionGap {
  field: string;
  gapType: 'missing' | 'incompatible' | 'unsupported';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  commerceEquivalent?: string;
}

// ============================================================
// D. Domain Support Types
// ============================================================

export type TikTokShopDomainSupportLevel = 'supported' | 'partial' | 'unsupported' | 'unknown';

export interface TikTokShopDomainWarning {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
}

export interface TikTokShopDomainError {
  category: string;
  code: string;
  message: string;
  details?: unknown;
}

// ============================================================
// E. Readiness Types
// ============================================================

export type TikTokShopDomainReadinessStatus = 'ready' | 'proceed_cautiously' | 'hold' | 'not_ready';

export interface TikTokShopDomainReadinessScore {
  overall: number;
  referenceParsing: number;
  contextModeling: number;
  promotionCompatibility: number;
  integration: number;
}

export interface TikTokShopDomainReadiness {
  status: TikTokShopDomainReadinessStatus;
  score: TikTokShopDomainReadinessScore;
  blockers: TikTokShopDomainWarning[];
  warnings: TikTokShopDomainWarning[];
  supportLevels: {
    reference: TikTokShopDomainSupportLevel;
    context: TikTokShopDomainSupportLevel;
    promotion: TikTokShopDomainSupportLevel;
  };
}

// ============================================================
// F. Backlog Types
// ============================================================

export type TikTokShopBacklogType =
  | 'reference_parser'
  | 'context_resolver'
  | 'promotion_mapping'
  | 'integration'
  | 'testing'
  | 'documentation';

export type TikTokShopBacklogStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type TikTokShopBacklogPriority = 'critical' | 'high' | 'medium' | 'low';

export interface TikTokShopBacklogItem {
  id: string;
  backlogType: TikTokShopBacklogType;
  backlogStatus: TikTokShopBacklogStatus;
  priority: TikTokShopBacklogPriority;
  title: string;
  description: string;
  assignedTo?: string;
  dueAt?: Date;
  createdAt: Date;
  completedAt?: Date;
}

// ============================================================
// G. API Types
// ============================================================

export interface TikTokShopReferenceParseDto {
  input: string;
  options?: {
    validate?: boolean;
    normalize?: boolean;
  };
}

export interface TikTokShopReferenceResolveDto {
  input: string;
  options?: {
    resolveContext?: boolean;
    resolvePromotions?: boolean;
  };
}

export interface TikTokShopPromotionCompatibilityDto {
  promotionData: Record<string, unknown>;
  comparisonMode: 'shopee' | 'generic';
}

export interface TikTokShopDomainReadinessDto {
  status: string;
  score: Record<string, number>;
  blockers: TikTokShopDomainWarning[];
  warnings: TikTokShopDomainWarning[];
  supportLevels: Record<string, string>;
}

export interface TikTokShopCapabilityGapDto {
  category: string;
  priority: string;
  title: string;
  description: string;
  blockers: number;
  estimatedEffort?: string;
}

// ============================================================
// H. Utility Types
// ============================================================

export interface TikTokShopParseOptions {
  validate?: boolean;
  normalize?: boolean;
  strict?: boolean;
}

export interface TikTokShopResolveOptions {
  resolveContext?: boolean;
  resolvePromotions?: boolean;
  includeMetadata?: boolean;
}

export interface TikTokShopResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}
