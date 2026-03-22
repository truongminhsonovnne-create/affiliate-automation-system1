/**
 * TikTok Shop Data Source Contracts
 * Production-grade contracts for data acquisition adapters
 */

import type {
  TikTokShopDataSource,
  TikTokShopSourceHealthResult,
  TikTokShopSourceReadinessResult,
  TikTokShopRawProductRecord,
  TikTokShopNormalizedProductRecord,
  TikTokShopPromotionSourceRecord,
  TikTokShopNormalizationStatus,
  TikTokShopEnrichmentType,
  TikTokShopDataBlocker,
  TikTokShopDataWarning,
} from '../types.js';

// ============================================================================
// Base Contracts
// ============================================================================

/**
 * Base interface for all TikTok Shop data source adapters
 */
export interface TikTokShopBaseSourceAdapter {
  readonly sourceKey: string;
  readonly sourceType: string;
  readonly isSupported: boolean;

  /**
   * Check if the source is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get source configuration
   */
  getConfig(): Record<string, unknown>;

  /**
   * Health check for the source
   */
  healthCheck(): Promise<TikTokShopSourceHealthResult>;

  /**
   * Evaluate source readiness
   */
  evaluateReadiness(): Promise<TikTokShopSourceReadinessResult>;
}

// ============================================================================
// Product Source Adapter
// ============================================================================

export interface TikTokShopProductSourceAdapter extends TikTokShopBaseSourceAdapter {
  /**
   * Load raw product data from the source
   */
  loadRawData(options?: TikTokShopProductSourceOptions): Promise<TikTokShopRawProductDataResult>;

  /**
   * Validate raw product payload structure
   */
  validateSourcePayload(payload: unknown): TikTokShopSourceValidationResult;

  /**
   * Normalize raw product data to standard format
   */
  normalizeSourcePayload(rawData: TikTokShopRawProductRecord[]): TikTokShopNormalizedProductRecord[];

  /**
   * Get supported product fields
   */
  getSupportedFields(): string[];

  /**
   * Get required fields that are missing
   */
  getMissingFields(): string[];
}

export interface TikTokShopProductSourceOptions {
  limit?: number;
  offset?: number;
  filters?: Record<string, unknown>;
  since?: Date;
  until?: Date;
}

export interface TikTokShopRawProductDataResult {
  success: boolean;
  sourceKey: string;
  records: TikTokShopRawProductRecord[];
  totalCount: number;
  errors: string[];
  metadata?: Record<string, unknown>;
}

export interface TikTokShopSourceValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validatedAt: Date;
}

// ============================================================================
// Context Source Adapter
// ============================================================================

export interface TikTokShopContextSourceAdapter extends TikTokShopBaseSourceAdapter {
  /**
   * Load context data (seller, category, price) for a product
   */
  loadContextData(referenceKey: string, contextTypes: TikTokShopEnrichmentType[]): Promise<TikTokShopContextDataResult>;

  /**
   * Validate context payload
   */
  validateContextPayload(payload: unknown): TikTokShopSourceValidationResult;

  /**
   * Get supported context types
   */
  getSupportedContextTypes(): TikTokShopEnrichmentType[];

  /**
   * Get context quality score
   */
  getContextQualityScore(contextType: TikTokShopEnrichmentType): number;
}

export interface TikTokShopContextDataResult {
  success: boolean;
  referenceKey: string;
  contextData: TikTokShopContextData;
  qualityScore: number;
  errors: string[];
}

export interface TikTokShopContextData {
  product?: Record<string, unknown>;
  seller?: Record<string, unknown>;
  category?: Record<string, unknown>;
  price?: Record<string, unknown>;
}

// ============================================================================
// Promotion Source Adapter
// ============================================================================

export interface TikTokShopPromotionSourceAdapter extends TikTokShopBaseSourceAdapter {
  /**
   * Load raw promotion data from the source
   */
  loadPromotionData(options?: TikTokShopPromotionSourceOptions): Promise<TikTokShopPromotionDataResult>;

  /**
   * Validate promotion payload
   */
  validatePromotionPayload(payload: unknown): TikTokShopSourceValidationResult;

  /**
   * Normalize promotion data for compatibility mapping
   */
  normalizePromotionData(rawData: TikTokShopPromotionSourceRecord[]): TikTokShopNormalizedPromotionData[];

  /**
   * Get supported promotion types
   */
  getSupportedPromotionTypes(): string[];

  /**
   * Get promotion constraint support
   */
  getConstraintSupport(): TikTokShopPromotionConstraintSupport[];
}

export interface TikTokShopPromotionSourceOptions {
  limit?: number;
  offset?: number;
  promotionTypes?: string[];
  activeOnly?: boolean;
  since?: Date;
  until?: Date;
}

export interface TikTokShopPromotionDataResult {
  success: boolean;
  sourceKey: string;
  records: TikTokShopPromotionSourceRecord[];
  totalCount: number;
  errors: string[];
  metadata?: Record<string, unknown>;
}

export interface TikTokShopNormalizedPromotionData {
  promotionId: string;
  promotionType: string;
  discountValue: number;
  discountType: 'percentage' | 'fixed';
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  applicableCategories?: string[];
  applicableProducts?: string[];
  stackable: boolean;
  validFrom?: Date;
  validUntil?: Date;
  rawData: Record<string, unknown>;
}

export interface TikTokShopPromotionConstraintSupport {
  constraint: string;
  supported: boolean;
  qualityScore: number;
  sourceKeys: string[];
}

// ============================================================================
// Source Registry Contract
// ============================================================================

export interface TikTokShopSourceRegistry {
  /**
   * Get all registered sources
   */
  getAllSources(): Promise<TikTokShopDataSource[]>;

  /**
   * Get source by key
   */
  getSourceByKey(sourceKey: string): Promise<TikTokShopDataSource | null>;

  /**
   * Get active sources
   */
  getActiveSources(): Promise<TikTokShopDataSource[]>;

  /**
   * Get sources by type
   */
  getSourcesByType(sourceType: string): Promise<TikTokShopDataSource[]>;

  /**
   * Register a new source
   */
  registerSource(source: Omit<TikTokShopDataSource, 'id' | 'createdAt' | 'updatedAt'>): Promise<TikTokShopDataSource>;

  /**
   * Update source status
   */
  updateSourceStatus(sourceKey: string, status: string): Promise<TikTokShopDataSource>;

  /**
   * Validate registry integrity
   */
  validateRegistry(): Promise<TikTokShopRegistryValidationResult>;
}

export interface TikTokShopRegistryValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sourcesChecked: number;
}

// ============================================================================
// Acquisition Orchestrator Contract
// ============================================================================

export interface TikTokShopAcquisitionOrchestrator {
  /**
   * Run acquisition for a specific source
   */
  runSourceAcquisition(sourceKey: string, options?: TikTokShopAcquisitionOptions): Promise<TikTokShopAcquisitionRunResult>;

  /**
   * Run acquisition for all active sources
   */
  runAllActiveSources(options?: TikTokShopAcquisitionOptions): Promise<TikTokShopAcquisitionRunResult[]>;

  /**
   * Get acquisition run status
   */
  getRunStatus(runId: string): Promise<TikTokShopAcquisitionRunStatusResult | null>;

  /**
   * Cancel a running acquisition
   */
  cancelRun(runId: string): Promise<boolean>;

  /**
   * Build acquisition summary
   */
  buildAcquisitionSummary(): Promise<TikTokShopAcquisitionSummaryResult>;
}

export interface TikTokShopAcquisitionOptions {
  runType?: 'full' | 'incremental' | 'dry_run' | 'validation';
  batchSize?: number;
  timeout?: number;
  validateOnly?: boolean;
}

export interface TikTokShopAcquisitionRunResult {
  success: boolean;
  sourceKey: string;
  runId?: string;
  itemsSeen: number;
  itemsNormalized: number;
  itemsEnriched: number;
  itemsFailed: number;
  blockers: TikTokShopDataBlocker[];
  warnings: TikTokShopDataWarning[];
  errors: string[];
  metadata?: Record<string, unknown>;
}

export interface TikTokShopAcquisitionRunStatusResult {
  runId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  itemsProcessed: number;
  errors: string[];
}

export interface TikTokShopAcquisitionSummaryResult {
  totalSources: number;
  activeSources: number;
  successfulRuns: number;
  failedRuns: number;
  totalItemsProcessed: number;
  averageQualityScore: number;
  blockers: TikTokShopDataBlocker[];
  warnings: TikTokShopDataWarning[];
}

// ============================================================================
// Enrichment Pipeline Contract
// ============================================================================

export interface TikTokShopEnrichmentPipeline {
  /**
   * Enrich product context
   */
  enrichProductContext(normalizedData: TikTokShopNormalizedProductRecord[]): Promise<TikTokShopEnrichmentResult>;

  /**
   * Enrich seller context
   */
  enrichSellerContext(normalizedData: TikTokShopNormalizedProductRecord[]): Promise<TikTokShopEnrichmentResult>;

  /**
   * Enrich category context
   */
  enrichCategoryContext(normalizedData: TikTokShopNormalizedProductRecord[]): Promise<TikTokShopEnrichmentResult>;

  /**
   * Enrich price context
   */
  enrichPriceContext(normalizedData: TikTokShopNormalizedProductRecord[]): Promise<TikTokShopEnrichmentResult>;

  /**
   * Build enrichment summary
   */
  buildEnrichmentSummary(): Promise<TikTokShopEnrichmentSummaryResult>;
}

export interface TikTokShopEnrichmentResult {
  success: boolean;
  recordCount: number;
  enrichedCount: number;
  failedCount: number;
  qualityScore: number;
  gaps: TikTokShopEnrichmentGap[];
}

export interface TikTokShopEnrichmentGap {
  field: string;
  enrichmentType: TikTokShopEnrichmentType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
}

export interface TikTokShopEnrichmentSummaryResult {
  totalRecords: number;
  enrichedRecords: number;
  averageQualityScore: number;
  enrichmentGaps: TikTokShopEnrichmentGap[];
  byType: Record<TikTokShopEnrichmentType, TikTokShopEnrichmentResult>;
}

// ============================================================================
// Source Readiness Contract
// ============================================================================

export interface TikTokShopSourceReadinessEvaluator {
  /**
   * Evaluate data readiness for a source
   */
  evaluateDataReadiness(sourceKey: string): Promise<TikTokShopSourceReadinessResult>;

  /**
   * Evaluate context readiness
   */
  evaluateContextReadiness(sourceKey: string): Promise<TikTokShopSourceReadinessResult>;

  /**
   * Evaluate promotion source readiness
   */
  evaluatePromotionSourceReadiness(sourceKey: string): Promise<TikTokShopSourceReadinessResult>;

  /**
   * Build overall data readiness summary
   */
  buildDataReadinessSummary(): Promise<TikTokShopDataReadinessSummaryResult>;

  /**
   * Classify blockers and warnings
   */
  classifyBlockersAndWarnings(blockers: TikTokShopDataBlocker[], warnings: TikTokShopDataWarning[]): TikTokShopReadinessClassification;
}

export interface TikTokShopDataReadinessSummaryResult {
  overallScore: number;
  readinessStatus: 'ready' | 'proceed_cautiously' | 'hold' | 'not_ready';
  contextScore: number;
  promotionSourceScore: number;
  qualityScore: number;
  freshnessScore: number;
  blockers: TikTokShopDataBlocker[];
  warnings: TikTokShopDataWarning[];
}

export interface TikTokShopReadinessClassification {
  criticalBlockers: TikTokShopDataBlocker[];
  highBlockers: TikTokShopDataBlocker[];
  mediumWarnings: TikTokShopDataWarning[];
  lowWarnings: TikTokShopDataWarning[];
  canProceed: boolean;
  recommendation: 'proceed' | 'hold' | 'not_ready';
}
