// =============================================================================
// Voucher Data Layer - Constants
// Production-grade constants for voucher data, rules, and evaluation
// =============================================================================

// =============================================================================
// A. Ingestion Constants
// =============================================================================

export const VOUCHER_INGESTION = {
  DEFAULT_BATCH_SIZE: 100,
  MAX_BATCH_SIZE: 500,
  MIN_BATCH_SIZE: 10,
  DEFAULT_TIMEOUT_MS: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
} as const;

export const VOUCHER_SOURCE_DEFAULTS = {
  DEFAULT_PLATFORM: 'shopee' as const,
  DEFAULT_SOURCE_TYPE: 'manual' as const,
  DEFAULT_IS_ACTIVE: true,
  DEFAULT_SYNC_INTERVAL_MS: 3600000, // 1 hour
  STALE_THRESHOLD_MS: 86400000, // 24 hours
} as const;

// =============================================================================
// B. Source Types
// =============================================================================

export const SUPPORTED_SOURCE_TYPES = [
  'manual',
  'import_file',
  'api_sync',
  'partner_feed',
  'internal',
] as const;

export const SUPPORTED_PLATFORMS = [
  'shopee',
  'lazada',
  'tiktok',
  'general',
] as const;

// =============================================================================
// C. Rule Validation Thresholds
// =============================================================================

export const RULE_VALIDATION = {
  MAX_CONDITIONS_PER_RULE: 50,
  MAX_CONSTRAINTS_PER_RULE: 30,
  MAX_NESTED_CONDITIONS: 5,
  MIN_CONDITION_WEIGHT: 0,
  MAX_CONDITION_WEIGHT: 1,
  MIN_RANKING_PRIORITY: 1,
  MAX_RANKING_PRIORITY: 100,
  MAX_ACTIVE_WINDOWS: 10,
  MAX_COMPATIBLE_VOUCHERS: 20,
} as const;

export const RULE_VALIDATION_ERROR_CODES = {
  EMPTY_CONDITIONS: 'RULE_EMPTY_CONDITIONS',
  INVALID_CONDITION: 'RULE_INVALID_CONDITION',
  CONFLICTING_CONDITIONS: 'RULE_CONFLICTING_CONDITIONS',
  INVALID_CONSTRAINT: 'RULE_INVALID_CONSTRAINT',
  INVALID_RANKING: 'RULE_INVALID_RANKING',
  INVALID_COMPATIBILITY: 'RULE_INVALID_COMPATIBILITY',
  INVALID_TIME_WINDOW: 'RULE_INVALID_TIME_WINDOW',
  INVALID_SCOPE: 'RULE_INVALID_SCOPE',
  MISSING_REQUIRED_FIELD: 'RULE_MISSING_REQUIRED_FIELD',
  INVALID_VERSION: 'RULE_INVALID_VERSION',
} as const;

// =============================================================================
// D. Freshness Constants
// =============================================================================

export const FRESHNESS = {
  FRESH_THRESHOLD_MS: 3600000, // 1 hour
  STALE_THRESHOLD_MS: 86400000, // 24 hours
  WARNING_THRESHOLD_MS: 43200000, // 12 hours

  FRESH_STATUS: 'fresh' as const,
  STALE_STATUS: 'stale' as const,
  EXPIRED_STATUS: 'expired' as const,
  UNKNOWN_STATUS: 'unknown' as const,

  DEFAULT_EVALUATION_INTERVAL_MS: 1800000, // 30 minutes
} as const;

// =============================================================================
// E. Evaluation Score Thresholds
// =============================================================================

export const EVALUATION_SCORE = {
  EXCELLENT_THRESHOLD: 0.9,
  GOOD_THRESHOLD: 0.75,
  ACCEPTABLE_THRESHOLD: 0.6,
  POOR_THRESHOLD: 0.4,
  FAIL_THRESHOLD: 0.2,

  MIN_ACCURACY_FOR_SUCCESS: 0.7,
  MIN_RECALL_FOR_SUCCESS: 0.6,
  MIN_PRECISION_FOR_SUCCESS: 0.6,

  RANKING_CORRELATION_THRESHOLD: 0.5,
  COVERAGE_THRESHOLD: 0.7,
} as const;

export const EVALUATION_STATUS = {
  PENDING: 'pending' as const,
  SUCCESS: 'success' as const,
  PARTIAL: 'partial' as const,
  FAILED: 'failed' as const,
  NO_EXPECTATION: 'no_expectation' as const,
} as const;

// =============================================================================
// F. Ranking Evaluation Defaults
// =============================================================================

export const RANKING_EVALUATION = {
  DEFAULT_TOP_K: 5,
  MAX_TOP_K: 20,
  MIN_TOP_K: 1,

  DEFAULT_DISCOUNT_WEIGHT: 0.4,
  DEFAULT_RELEVANCE_WEIGHT: 0.3,
  DEFAULT_RECENCY_WEIGHT: 0.2,
  DEFAULT_CONFIDENCE_WEIGHT: 0.1,

  MAX_RANKING_DIFFERENCE: 10,
} as const;

// =============================================================================
// G. Override Constants
// =============================================================================

export const OVERRIDE = {
  DEFAULT_EXPIRY_DAYS: 30,
  MAX_EXPIRY_DAYS: 365,
  MIN_EXPIRY_DAYS: 1,

  OVERRIDE_TYPES: [
    'eligibility',
    'ranking',
    'visibility',
    'exclusion',
    'priority',
  ] as const,

  OVERRIDE_STATUS: {
    ACTIVE: 'active' as const,
    EXPIRED: 'expired' as const,
    CANCELLED: 'cancelled' as const,
  },
} as const;

// =============================================================================
// H. Rule Status Constants
// =============================================================================

export const RULE_STATUS = {
  DRAFT: 'draft' as const,
  ACTIVE: 'active' as const,
  ARCHIVED: 'archived' as const,
  SUPERSEDED: 'superseded' as const,
} as const;

export const VALIDATION_STATUS = {
  PENDING: 'pending' as const,
  VALID: 'valid' as const,
  INVALID: 'invalid' as const,
  WARNING: 'warning' as const,
} as const;

// =============================================================================
// I. Ingestion Run Status
// =============================================================================

export const INGESTION_RUN_STATUS = {
  RUNNING: 'running' as const,
  COMPLETED: 'completed' as const,
  COMPLETED_WITH_ERRORS: 'completed_with_errors' as const,
  FAILED: 'failed' as const,
  CANCELLED: 'cancelled' as const,
} as const;

// =============================================================================
// J. Discount Types
// =============================================================================

export const DISCOUNT_TYPES = [
  'percentage',
  'fixed_amount',
  'free_shipping',
  'buy_x_get_y',
  'other',
] as const;

// =============================================================================
// K. Constraint Types
// =============================================================================

export const CONSTRAINT_TYPES = [
  'min_spend',
  'max_discount',
  'product_limit',
  'user_limit',
  'category_required',
  'product_required',
  'payment_method',
  'shipping_method',
  'time_window',
  'device_type',
  'user_segment',
  'custom',
] as const;

// =============================================================================
// L. Scope Types
// =============================================================================

export const SCOPE_TYPES = [
  'global',
  'shop',
  'category',
  'product',
  '特定商品',
  '特定店铺',
  '特定分类',
] as const;

// =============================================================================
// M. Operator Types
// =============================================================================

export const OPERATORS = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'not_in',
  'contains',
  'between',
] as const;

// =============================================================================
// N. Quality Issue Types
// =============================================================================

export const QUALITY_ISSUE_TYPES = [
  'bad_match',
  'missed_voucher',
  'poor_ranking',
  'invalid_rule',
  'rule_conflict',
  'stale_data',
  'expired_voucher',
  'incorrect_eligibility',
] as const;

export const QUALITY_ISSUE_SEVERITY = [
  'critical',
  'high',
  'medium',
  'low',
] as const;

// =============================================================================
// O. Logging and Metrics
// =============================================================================

export const METRIC_NAMES = {
  INGESTION_ITEMS_SEEN: 'voucher.ingestion.items.seen',
  INGESTION_ITEMS_INSERTED: 'voucher.ingestion.items.inserted',
  INGESTION_ITEMS_UPDATED: 'voucher.ingestion.items.updated',
  INGESTION_ITEMS_FAILED: 'voucher.ingestion.items.failed',
  INGESTION_RUNS_TOTAL: 'voucher.ingestion.runs.total',
  INGESTION_RUNS_FAILED: 'voucher.ingestion.runs.failed',

  RULE_VALIDATIONS_TOTAL: 'voucher.rule.validations.total',
  RULE_VALIDATIONS_FAILED: 'voucher.rule.validations.failed',
  RULE_ACTIVATIONS_TOTAL: 'voucher.rule.activations.total',

  EVALUATIONS_TOTAL: 'voucher.evaluation.total',
  EVALUATIONS_SUCCESS: 'voucher.evaluation.success',
  EVALUATIONS_FAILED: 'voucher.evaluation.failed',
  EVALUATION_QUALITY_SCORE: 'voucher.evaluation.quality_score',

  STALE_VOUCHERS_COUNT: 'voucher.stale.count',
  ACTIVE_VOUCHERS_COUNT: 'voucher.active.count',

  OVERRIDES_TOTAL: 'voucher.overrides.total',
  OVERRIDES_EXPIRED: 'voucher.overrides.expired',
} as const;

// =============================================================================
// P. Event Names
// =============================================================================

export const EVENT_NAMES = {
  // Ingestion events
  INGESTION_STARTED: 'voucher.ingestion.started',
  INGESTION_COMPLETED: 'voucher.ingestion.completed',
  INGESTION_FAILED: 'voucher.ingestion.failed',
  INGESTION_ITEM_VALIDATED: 'voucher.ingestion.item.validated',
  INGESTION_ITEM_NORMALIZED: 'voucher.ingestion.item.normalized',
  INGESTION_ITEM_PERSISTED: 'voucher.ingestion.item.persisted',

  // Rule events
  RULE_CREATED: 'voucher.rule.created',
  RULE_UPDATED: 'voucher.rule.updated',
  RULE_VALIDATED: 'voucher.rule.validated',
  RULE_ACTIVATED: 'voucher.rule.activated',
  RULE_ARCHIVED: 'voucher.rule.archived',

  // Evaluation events
  EVALUATION_STARTED: 'voucher.evaluation.started',
  EVALUATION_COMPLETED: 'voucher.evaluation.completed',
  EVALUATION_FAILED: 'voucher.evaluation.failed',
  QUALITY_ISSUE_DETECTED: 'voucher.quality.issue.detected',

  // Override events
  OVERRIDE_CREATED: 'voucher.override.created',
  OVERRIDE_EXPIRED: 'voucher.override.expired',
  OVERRIDE_APPLIED: 'voucher.override.applied',

  // Freshness events
  VOUCHER_BECAME_STALE: 'voucher.freshness.became_stale',
  VOUCHER_BECAME_FRESH: 'voucher.freshness.became_fresh',
} as const;

// =============================================================================
// Q. API Routes
// =============================================================================

export const API_ROUTES = {
  CATALOG: '/internal/vouchers/catalog',
  CATALOG_BY_ID: '/internal/vouchers/catalog/:id',
  CATALOG_INGEST: '/internal/vouchers/catalog/ingest',
  CATALOG_REFRESH: '/internal/vouchers/catalog/:id/refresh',

  INGESTION_RUNS: '/internal/vouchers/ingestion-runs',
  INGESTION_RUN_BY_ID: '/internal/vouchers/ingestion-runs/:id',

  RULES: '/internal/vouchers/rules',
  RULE_BY_ID: '/internal/vouchers/rules/:id',
  RULE_ACTIVATE: '/internal/vouchers/rules/:id/activate',
  RULE_ARCHIVE: '/internal/vouchers/rules/:id/archive',

  EVALUATE: '/internal/vouchers/evaluate',
  EVALUATIONS: '/internal/vouchers/evaluations',
  EVALUATION_BY_ID: '/internal/vouchers/evaluations/:id',

  SOURCES: '/internal/vouchers/sources',
  SOURCE_BY_ID: '/internal/vouchers/sources/:id',

  OVERRIDES: '/internal/vouchers/overrides',
  OVERRIDE_BY_ID: '/internal/vouchers/overrides/:id',

  QUALITY: '/internal/vouchers/quality',
  QUALITY_ISSUES: '/internal/vouchers/quality/issues',
} as const;

// =============================================================================
// R. Error Codes
// =============================================================================

export const ERROR_CODES = {
  // Ingestion errors
  INGESTION_SOURCE_NOT_FOUND: 'INGESTION_SOURCE_NOT_FOUND',
  INGESTION_SOURCE_INACTIVE: 'INGESTION_SOURCE_INACTIVE',
  INGESTION_INVALID_PAYLOAD: 'INGESTION_INVALID_PAYLOAD',
  INGESTION_NORMALIZATION_FAILED: 'INGESTION_NORMALIZATION_FAILED',
  INGESTION_PERSISTENCE_FAILED: 'INGESTION_PERSISTENCE_FAILED',
  INGESTION_TIMEOUT: 'INGESTION_TIMEOUT',

  // Rule errors
  RULE_NOT_FOUND: 'RULE_NOT_FOUND',
  RULE_VALIDATION_FAILED: 'RULE_VALIDATION_FAILED',
  RULE_ACTIVATION_FAILED: 'RULE_ACTIVATION_FAILED',
  RULE_CONFLICT: 'RULE_CONFLICT',
  RULE_ARCHIVE_FAILED: 'RULE_ARCHIVE_FAILED',

  // Evaluation errors
  EVALUATION_NOT_FOUND: 'EVALUATION_NOT_FOUND',
  EVALUATION_FAILED: 'EVALUATION_FAILED',
  EVALUATION_INVALID_INPUT: 'EVALUATION_INVALID_INPUT',

  // Override errors
  OVERRIDE_NOT_FOUND: 'OVERRIDE_NOT_FOUND',
  OVERRIDE_EXPIRED: 'OVERRIDE_EXPIRED',
  OVERRIDE_VALIDATION_FAILED: 'OVERRIDE_VALIDATION_FAILED',

  // Catalog errors
  CATALOG_NOT_FOUND: 'CATALOG_NOT_FOUND',
  CATALOG_STALE: 'CATALOG_STALE',
  CATALOG_EXPIRED: 'CATALOG_EXPIRED',
} as const;
