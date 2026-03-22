// =============================================================================
// Voucher Data Layer - Shared Types and Interfaces
// Production-grade type definitions for voucher data, rules, and evaluation
// =============================================================================

import { z } from 'zod';

// =============================================================================
// A. Source Types
// =============================================================================

export type VoucherSourceType =
  | 'manual'
  | 'import_file'
  | 'api_sync'
  | 'partner_feed'
  | 'internal';

export type VoucherPlatform = 'shopee' | 'lazada' | 'tiktok' | 'general';

export type VoucherSourceConfig = Record<string, unknown>;

export interface VoucherCatalogSource {
  id: string;
  sourceName: string;
  sourceType: VoucherSourceType;
  platform: VoucherPlatform;
  sourceConfig: VoucherSourceConfig | null;
  isActive: boolean;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// B. Ingestion Types
// =============================================================================

export interface VoucherIngestionInput {
  sourceId: string;
  rawItems: VoucherRawInput[];
  context?: VoucherIngestionContext;
}

export interface VoucherIngestionContext {
  triggeredBy?: string;
  sourceType?: VoucherSourceType;
  importMode?: 'full' | 'incremental';
  skipValidation?: boolean;
  skipNormalization?: boolean;
}

export interface VoucherRawInput {
  // Raw fields from external sources - may have various naming conventions
  [key: string]: unknown;
}

export interface VoucherIngestionRun {
  id: string;
  sourceId: string;
  runStatus: VoucherIngestionRunStatus;
  itemsSeen: number;
  itemsInserted: number;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsFailed: number;
  errorSummary: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  createdAt: Date;
}

export type VoucherIngestionRunStatus =
  | 'running'
  | 'completed'
  | 'completed_with_errors'
  | 'failed'
  | 'cancelled';

export interface VoucherIngestionResult {
  success: boolean;
  runId: string;
  itemsSeen: number;
  itemsInserted: number;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsFailed: number;
  errors: VoucherIngestionError[];
  warnings: VoucherIngestionWarning[];
  duration: number;
}

export interface VoucherIngestionError {
  itemIndex: number;
  itemExternalId?: string;
  errorCode: string;
  errorMessage: string;
  recoverable: boolean;
}

export interface VoucherIngestionWarning {
  itemIndex: number;
  itemExternalId?: string;
  warningCode: string;
  warningMessage: string;
}

// =============================================================================
// C. Normalized Voucher Types
// =============================================================================

export interface VoucherNormalizedRecord {
  // Identity
  id?: string;
  externalId: string;
  sourceId: string;

  // Basic Info
  code: string;
  title: string;
  description: string | null;
  platform: VoucherPlatform;

  // Value
  discountType: VoucherDiscountType;
  discountValue: number;
  minSpend: number | null;
  maxDiscount: number | null;

  // Validity
  startDate: Date;
  endDate: Date;
  isActive: boolean;

  // Scope
  scope: VoucherScope;
  applicableShopIds: string[];
  applicableCategoryIds: string[];
  applicableProductIds: string[];

  // Constraints
  constraints: VoucherConstraint[];

  // Metadata
  campaignName: string | null;
  campaignMetadata: Record<string, unknown> | null;
  sourceRawData: Record<string, unknown>;

  // Freshness
  freshnessStatus: VoucherFreshnessStatus;
  lastValidatedAt: Date | null;
  qualityScore: number | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export type VoucherDiscountType = 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y' | 'other';

export type VoucherScope = 'global' | 'shop' | 'category' | 'product' | '特定商品' | '特定店铺' | '特定分类';

export type VoucherFreshnessStatus = 'fresh' | 'stale' | 'expired' | 'unknown';

export interface VoucherConstraint {
  type: VoucherConstraintType;
  operator: VoucherConstraintOperator;
  value: unknown;
  metadata?: Record<string, unknown>;
}

export type VoucherConstraintType =
  | 'min_spend'
  | 'max_discount'
  | 'product_limit'
  | 'user_limit'
  | 'category_required'
  | 'product_required'
  | 'payment_method'
  | 'shipping_method'
  | 'time_window'
  | 'device_type'
  | 'user_segment'
  | 'custom';

export type VoucherConstraintOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'between';

// =============================================================================
// D. Rule Types
// =============================================================================

export interface VoucherRuleSet {
  id: string;
  voucherId: string;
  ruleVersion: string;
  ruleStatus: VoucherRuleStatus;
  rulePayload: VoucherRulePayload;
  validationStatus: VoucherRuleValidationStatus;
  validationErrors: VoucherRuleValidationError[] | null;
  createdBy: string | null;
  activatedAt: Date | null;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type VoucherRuleStatus = 'draft' | 'active' | 'archived' | 'superseded';

export type VoucherRuleValidationStatus = 'pending' | 'valid' | 'invalid' | 'warning';

export interface VoucherRulePayload {
  // Rule metadata
  version: string;
  name: string;
  description?: string;

  // Eligibility conditions
  conditions: VoucherRuleCondition[];

  // Ranking configuration
  ranking: VoucherRuleRanking;

  // Additional constraints
  constraints: VoucherRuleConstraint[];

  // Compatibility
  compatibility: VoucherRuleCompatibility;

  // Windows
  activeWindows: VoucherRuleTimeWindow[];

  // Custom logic
  customLogic?: Record<string, unknown>;
}

export interface VoucherRuleCondition {
  id: string;
  field: string;
  operator: VoucherConstraintOperator;
  value: unknown;
  metadata?: Record<string, unknown>;
}

export interface VoucherRuleConstraint {
  type: VoucherConstraintType;
  config: Record<string, unknown>;
}

export interface VoucherRuleRanking {
  priority: number;
  boostFactors: VoucherRankingBoostFactor[];
  decayFactors: VoucherRankingDecayFactor[];
  scoreWeights: VoucherRankingScoreWeights;
}

export interface VoucherRankingBoostFactor {
  factor: string;
  weight: number;
  condition?: VoucherRuleCondition;
}

export interface VoucherRankingDecayFactor {
  factor: string;
  decayRate: number;
  threshold: number;
}

export interface VoucherRankingScoreWeights {
  discountValue: number;
  relevance: number;
  recency: number;
  confidence: number;
}

export interface VoucherRuleCompatibility {
  canCombine: boolean;
  compatibleWith: string[];
  incompatibleWith: string[];
  combinationRules?: VoucherCombinationRule[];
}

export interface VoucherCombinationRule {
  voucherType: string;
  maxCombined: number;
  discountCap?: number;
}

export interface VoucherRuleTimeWindow {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
}

export interface VoucherRuleValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'warning' | 'info';
}

// =============================================================================
// E. Override Types
// =============================================================================

export interface VoucherOverrideRecord {
  id: string;
  voucherId: string;
  overrideType: VoucherOverrideType;
  overridePayload: Record<string, unknown>;
  overrideStatus: VoucherOverrideStatus;
  createdBy: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type VoucherOverrideType = 'eligibility' | 'ranking' | 'visibility' | 'exclusion' | 'priority';

export type VoucherOverrideStatus = 'active' | 'expired' | 'cancelled';

// =============================================================================
// F. Evaluation Types
// =============================================================================

export interface VoucherMatchEvaluationInput {
  platform: VoucherPlatform;
  requestInput: VoucherMatchRequestInput;
  expectedVoucherIds: string[] | null;
}

export interface VoucherMatchRequestInput {
  // Product context
  productId?: string;
  productTitle?: string;
  productCategory?: string;
  productShopId?: string;
  productPrice?: number;

  // Request context
  userId?: string;
  sessionId?: string;
  context?: Record<string, unknown>;

  // Request parameters
  limit?: number;
  includeExpired?: boolean;
}

export interface VoucherMatchEvaluationResult {
  id: string;
  platform: VoucherPlatform;
  requestInput: VoucherMatchRequestInput;
  expectedVoucherIds: string[] | null;
  resolvedVoucherIds: string[];
  bestResolvedVoucherId: string | null;
  evaluationStatus: VoucherEvaluationStatus;
  qualityScore: number | null;
  qualityMetrics: VoucherQualityMetrics | null;
  errorSummary: string | null;
  rankingTrace: VoucherRankingTrace | null;
  createdAt: Date;
}

export type VoucherEvaluationStatus = 'pending' | 'success' | 'partial' | 'failed' | 'no_expectation';

export interface VoucherQualityMetrics {
  // Accuracy metrics
  bestMatchAccuracy: number;
  topKRecall: number;
  topKPrecision: number;

  // Ranking metrics
  rankingDiscount: number;
  rankingCorrelation: number;

  // Error hints
  falsePositiveHints: string[];
  falseNegativeHints: string[];

  // Additional metrics
  coverageScore: number;
  confidenceScore: number;
}

export interface VoucherRankingTrace {
  candidates: VoucherRankingCandidate[];
  selectedVoucherId: string | null;
  selectionReason: string;
}

export interface VoucherRankingCandidate {
  voucherId: string;
  score: number;
  scoreBreakdown: Record<string, number>;
  rank: number;
  matched: boolean;
}

export interface VoucherRankingExpectation {
  voucherId: string;
  expectedRank: number;
  expectedScore?: number;
  mustInclude: boolean;
}

// =============================================================================
// G. Quality Issue Types
// =============================================================================

export interface VoucherQualityIssue {
  id: string;
  issueType: VoucherQualityIssueType;
  severity: VoucherQualityIssueSeverity;
  voucherId?: string;
  evaluationId?: string;
  description: string;
  evidence: Record<string, unknown>;
  detectedAt: Date;
  resolvedAt: Date | null;
}

export type VoucherQualityIssueType =
  | 'bad_match'
  | 'missed_voucher'
  | 'poor_ranking'
  | 'invalid_rule'
  | 'rule_conflict'
  | 'stale_data'
  | 'expired_voucher'
  | 'incorrect_eligibility';

export type VoucherQualityIssueSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface VoucherDataWarning {
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface VoucherDataError {
  code: string;
  message: string;
  context?: Record<string, unknown>;
  recoverable: boolean;
}

// =============================================================================
// H. Version Types
// =============================================================================

export interface VoucherCatalogVersion {
  id: string;
  voucherId: string;
  versionNumber: number;
  snapshotPayload: Record<string, unknown>;
  changeReason: string | null;
  changedBy: string | null;
  createdAt: Date;
}

// =============================================================================
// I. Compiled Rule Types (Runtime)
// =============================================================================

export interface CompiledVoucherRule {
  voucherId: string;
  version: string;
  conditions: CompiledCondition[];
  ranking: CompiledRanking;
  constraints: CompiledConstraint[];
  compatibility: CompiledCompatibility;
  isActive: boolean;
  compiledAt: Date;
}

export interface CompiledCondition {
  field: string;
  operator: string;
  value: unknown;
  evaluator: (context: Record<string, unknown>) => boolean;
}

export interface CompiledRanking {
  priority: number;
  scoreWeights: Record<string, number>;
  boostFunctions: ((context: Record<string, unknown>) => number)[];
}

export interface CompiledConstraint {
  type: string;
  validator: (context: Record<string, unknown>) => boolean;
}

export interface CompiledCompatibility {
  canCombine: boolean;
  compatibleVoucherTypes: string[];
}

// =============================================================================
// J. API DTO Types
// =============================================================================

export interface VoucherCatalogQueryParams {
  platform?: VoucherPlatform;
  isActive?: boolean;
  freshnessStatus?: VoucherFreshnessStatus;
  sourceId?: string;
  limit?: number;
  offset?: number;
}

export interface VoucherRuleQueryParams {
  voucherId?: string;
  ruleStatus?: VoucherRuleStatus;
  validationStatus?: VoucherRuleValidationStatus;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
