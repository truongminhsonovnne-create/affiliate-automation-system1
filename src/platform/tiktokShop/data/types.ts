/**
 * TikTok Shop Data Acquisition Foundation - Types
 * Production-grade type definitions for data acquisition, enrichment, and source readiness
 */

// ============================================================================
// Enums and Constants
// ============================================================================

export enum TikTokShopDataSourceType {
  MANUAL = 'manual',
  FILE = 'file',
  API = 'api',
  SCRAPER = 'scraper',
  CRAWLER = 'crawler',
}

export enum TikTokShopDataSourceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated',
  ERROR = 'error',
}

export enum TikTokShopSourceSupportLevel {
  SUPPORTED = 'supported',
  PARTIAL = 'partial',
  UNAVAILABLE = 'unavailable',
  NOT_PRODUCTION_READY = 'not_production_ready',
}

export enum TikTokShopSourceHealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

export enum TikTokShopAcquisitionRunType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  DRY_RUN = 'dry_run',
  VALIDATION = 'validation',
}

export enum TikTokShopAcquisitionRunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TikTokShopNormalizationStatus {
  PENDING = 'pending',
  NORMALIZING = 'normalizing',
  NORMALIZED = 'normalized',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export enum TikTokShopEnrichmentType {
  PRODUCT = 'product',
  SELLER = 'seller',
  CATEGORY = 'category',
  PRICE = 'price',
  PROMOTION = 'promotion',
}

export enum TikTokShopEnrichmentStatus {
  PENDING = 'pending',
  ENRICHING = 'enriching',
  ENRICHED = 'enriched',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export enum TikTokShopFreshnessStatus {
  FRESH = 'fresh',
  STALE = 'stale',
  EXPIRED = 'expired',
  UNKNOWN = 'unknown',
}

export enum TikTokShopCompatibilityStatus {
  COMPATIBLE = 'compatible',
  PARTIALLY_COMPATIBLE = 'partially_compatible',
  NOT_COMPATIBLE = 'not_compatible',
  UNKNOWN = 'unknown',
}

export enum TikTokShopReadinessStatus {
  READY = 'ready',
  PROCEED_CAUTIOUSLY = 'proceed_cautiously',
  HOLD = 'hold',
  NOT_READY = 'not_ready',
}

export enum TikTokShopBacklogType {
  SOURCE_GAP = 'source_gap',
  NORMALIZATION_GAP = 'normalization_gap',
  ENRICHMENT_GAP = 'enrichment_gap',
  QUALITY_GAP = 'quality_gap',
  INTEGRATION_GAP = 'integration_gap',
}

export enum TikTokShopBacklogStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  WONT_DO = 'wont_do',
}

export enum TikTokShopDataWarningType {
  FIELD_MISSING = 'field_missing',
  FIELD_INCOMPLETE = 'field_incomplete',
  QUALITY_LOW = 'quality_low',
  COVERAGE_GAP = 'coverage_gap',
}

export enum TikTokShopDataErrorType {
  SOURCE_UNAVAILABLE = 'source_unavailable',
  VALIDATION_FAILED = 'validation_failed',
  NORMALIZATION_FAILED = 'normalization_failed',
  ENRICHMENT_FAILED = 'enrichment_failed',
  PERSISTENCE_FAILED = 'persistence_failed',
}

// ============================================================================
// Core Interfaces
// ============================================================================

export interface TikTokShopDataSource {
  id: string;
  sourceKey: string;
  sourceType: TikTokShopDataSourceType;
  sourceStatus: TikTokShopDataSourceStatus;
  sourcePriority: number;
  sourceConfig?: Record<string, unknown>;
  supportLevel: TikTokShopSourceSupportLevel;
  healthStatus: TikTokShopSourceHealthStatus;
  readinessPayload?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  lastCheckedAt?: Date;
}

export interface TikTokShopAcquisitionRun {
  id: string;
  sourceId: string;
  runType: TikTokShopAcquisitionRunType;
  runStatus: TikTokShopAcquisitionRunStatus;
  itemsSeen: number;
  itemsNormalized: number;
  itemsEnriched: number;
  itemsFailed: number;
  errorSummary?: string;
  runPayload?: Record<string, unknown>;
  startedAt: Date;
  finishedAt?: Date;
  createdAt: Date;
}

export interface TikTokShopRawProductRecord {
  rawId: string;
  sourceKey: string;
  rawData: Record<string, unknown>;
  collectedAt: Date;
}

export interface TikTokShopNormalizedProductRecord {
  canonicalReferenceKey: string;
  normalizedData: TikTokShopNormalizedProductData;
  normalizationStatus: TikTokShopNormalizationStatus;
  normalizationErrors?: string[];
}

export interface TikTokShopNormalizedProductData {
  // Product identity
  productId?: string;
  productTitle?: string;
  productDescription?: string;
  productUrl?: string;

  // Seller/shop context
  sellerId?: string;
  sellerName?: string;
  sellerRating?: number;
  sellerFollowerCount?: number;
  sellerVerified?: boolean;

  // Category context
  categoryId?: string;
  categoryName?: string;
  categoryPath?: string[];

  // Price context
  price?: number;
  currency?: string;
  originalPrice?: number;
  discountPercentage?: number;

  // Inventory
  stockStatus?: string;
  stockQuantity?: number;

  // Media
  images?: string[];
  videos?: string[];

  // Additional
  rating?: number;
  reviewCount?: number;
  salesCount?: number;
  tags?: string[];
  rawFields?: Record<string, unknown>;
}

export interface TikTokShopProductSnapshot {
  id: string;
  canonicalReferenceKey: string;
  sourceId?: string;
  productPayload: Record<string, unknown>;
  normalizationStatus: TikTokShopNormalizationStatus;
  enrichmentStatus: TikTokShopEnrichmentStatus;
  freshnessStatus: TikTokShopFreshnessStatus;
  qualityScore?: number;
  createdAt: Date;
  updatedAt: Date;
  snapshotTime: Date;
}

export interface TikTokShopContextEnrichmentRecord {
  id: string;
  canonicalReferenceKey: string;
  enrichmentType: TikTokShopEnrichmentType;
  enrichmentStatus: TikTokShopEnrichmentStatus;
  enrichmentPayload: Record<string, unknown>;
  qualityScore?: number;
  createdAt: Date;
}

export interface TikTokShopPromotionSourceRecord {
  id: string;
  sourceId?: string;
  promotionSourceKey: string;
  rawPayload: Record<string, unknown>;
  normalizationStatus: TikTokShopNormalizationStatus;
  compatibilityStatus: TikTokShopCompatibilityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface TikTokShopSourceReadinessReview {
  id: string;
  sourceId?: string;
  reviewType: string;
  readinessStatus: TikTokShopReadinessStatus;
  readinessScore?: number;
  blockerCount: number;
  warningCount: number;
  reviewPayload: Record<string, unknown>;
  createdAt: Date;
}

export interface TikTokShopDataBacklogItem {
  id: string;
  backlogType: TikTokShopBacklogType;
  backlogStatus: TikTokShopBacklogStatus;
  priority: string;
  backlogPayload: Record<string, unknown>;
  assignedTo?: string;
  dueAt?: Date;
  createdAt: Date;
  completedAt?: Date;
}

// ============================================================================
// Source Health & Readiness
// ============================================================================

export interface TikTokShopSourceHealthResult {
  sourceKey: string;
  healthStatus: TikTokShopSourceHealthStatus;
  healthScore: number;
  checks: TikTokShopSourceHealthCheck[];
  lastChecked: Date;
  metadata?: Record<string, unknown>;
}

export interface TikTokShopSourceHealthCheck {
  checkName: string;
  passed: boolean;
  score: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface TikTokShopSourceReadinessResult {
  sourceKey: string;
  readinessStatus: TikTokShopReadinessStatus;
  readinessScore: number;
  blockers: TikTokShopDataBlocker[];
  warnings: TikTokShopDataWarning[];
  metadata?: Record<string, unknown>;
}

export interface TikTokShopDataBlocker {
  blockerId: string;
  blockerType: string;
  severity: 'critical' | 'high';
  message: string;
  field?: string;
  sourceKey?: string;
}

export interface TikTokShopDataWarning {
  warningId: string;
  warningType: TikTokShopDataWarningType;
  severity: 'medium' | 'low';
  message: string;
  field?: string;
  sourceKey?: string;
}

export interface TikTokShopDataError {
  errorId: string;
  errorType: TikTokShopDataErrorType;
  message: string;
  field?: string;
  sourceKey?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Acquisition Contracts
// ============================================================================

export interface TikTokShopAcquisitionResult {
  success: boolean;
  sourceKey: string;
  runId?: string;
  itemsSeen: number;
  itemsNormalized: number;
  itemsEnriched: number;
  itemsFailed: number;
  errors: TikTokShopDataError[];
  warnings: TikTokShopDataWarning[];
  metadata?: Record<string, unknown>;
}

export interface TikTokShopNormalizationResult {
  success: boolean;
  originalCount: number;
  normalizedCount: number;
  failedCount: number;
  records: TikTokShopNormalizedProductRecord[];
  errors: TikTokShopDataError[];
}

export interface TikTokShopEnrichmentResult {
  success: boolean;
  recordCount: number;
  enrichedCount: number;
  failedCount: number;
  qualityScore?: number;
  gaps: TikTokShopEnrichmentGap[];
}

export interface TikTokShopEnrichmentGap {
  field: string;
  enrichmentType: TikTokShopEnrichmentType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
}

// ============================================================================
// Context & Support Matrix
// ============================================================================

export interface TikTokShopContextFieldSupport {
  field: string;
  supported: boolean;
  qualityScore?: number;
  sourceKeys: string[];
  gaps: string[];
}

export interface TikTokShopContextSupportMatrix {
  product: TikTokShopContextFieldSupport[];
  seller: TikTokShopContextFieldSupport[];
  category: TikTokShopContextFieldSupport[];
  price: TikTokShopContextFieldSupport[];
  promotion: TikTokShopContextFieldSupport[];
}

export interface TikTokShopPromotionSupportMatrix {
  promotionTypes: TikTokShopPromotionTypeSupport[];
  constraintSupport: TikTokShopPromotionConstraintSupport[];
}

export interface TikTokShopPromotionTypeSupport {
  promotionType: string;
  supported: boolean;
  qualityScore?: number;
  sourceKeys: string[];
}

export interface TikTokShopPromotionConstraintSupport {
  constraint: string;
  supported: boolean;
  sourceKeys: string[];
}

// ============================================================================
// Summary & Report Types
// ============================================================================

export interface TikTokShopDataFoundationSummary {
  sources: TikTokShopSourceSummary[];
  acquisition: TikTokShopAcquisitionSummary;
  enrichment: TikTokShopEnrichmentSummary;
  readiness: TikTokShopDataReadinessSummary;
  blockers: TikTokShopDataBlocker[];
  warnings: TikTokShopDataWarning[];
}

export interface TikTokShopSourceSummary {
  sourceKey: string;
  sourceType: TikTokShopDataSourceType;
  supportLevel: TikTokShopSourceSupportLevel;
  healthStatus: TikTokShopSourceHealthStatus;
  readinessStatus: TikTokShopReadinessStatus;
}

export interface TikTokShopAcquisitionSummary {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalItemsSeen: number;
  totalItemsNormalized: number;
  totalItemsEnriched: number;
}

export interface TikTokShopEnrichmentSummary {
  totalRecords: number;
  enrichedRecords: number;
  averageQualityScore: number;
  gaps: TikTokShopEnrichmentGap[];
}

export interface TikTokShopDataReadinessSummary {
  overallScore: number;
  readinessStatus: TikTokShopReadinessStatus;
  contextScore: number;
  promotionSourceScore: number;
  qualityScore: number;
  freshnessScore: number;
}

export interface TikTokShopDataDecisionSupport {
  recommendation: 'proceed' | 'hold' | 'not_ready';
  readinessStatus: TikTokShopReadinessStatus;
  blockers: TikTokShopDataBlocker[];
  warnings: TikTokShopDataWarning[];
  nextSteps: string[];
  summary: string;
}

// ============================================================================
// Domain Integration Types
// ============================================================================

export interface TikTokShopDomainDataContext {
  canonicalReferenceKey: string;
  productContext?: TikTokShopProductContextData;
  sellerContext?: TikTokShopSellerContextData;
  categoryContext?: TikTokShopCategoryContextData;
  priceContext?: TikTokShopPriceContextData;
}

export interface TikTokShopProductContextData {
  productId: string;
  title: string;
  description?: string;
  url?: string;
  rating?: number;
  reviewCount?: number;
  salesCount?: number;
  images?: string[];
}

export interface TikTokShopSellerContextData {
  sellerId: string;
  sellerName: string;
  rating?: number;
  followerCount?: number;
  verified: boolean;
}

export interface TikTokShopCategoryContextData {
  categoryId: string;
  categoryName: string;
  categoryPath?: string[];
}

export interface TikTokShopPriceContextData {
  price: number;
  currency: string;
  originalPrice?: number;
  discountPercentage?: number;
}

export interface TikTokShopPromotionCompatibilityInput {
  promotionData: Record<string, unknown>[];
  sourceKey: string;
  constraints: TikTokShopPromotionConstraints;
}

export interface TikTokShopPromotionConstraints {
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  applicableCategories?: string[];
  applicableProducts?: string[];
  stackable: boolean;
}

export interface TikTokShopPromotionCompatibilityEvidence {
  sourceKey: string;
  compatible: boolean;
  compatibilityScore: number;
  supportedPromotions: string[];
  unsupportedPromotions: string[];
  missingFields: string[];
  blockers: TikTokShopDataBlocker[];
}
