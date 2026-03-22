/**
 * Commercial Intelligence Layer - Constants
 *
 * Production-grade constants for:
 * - Attribution windows
 * - Session thresholds
 * - Funnel aggregation
 * - Revenue-quality thresholds
 * - Anomaly thresholds
 * - Quality gates
 */

import type {
  CommercialAttributionConfig,
  CommercialQualityGate,
  GrowthSurfaceType,
  CommercialEventType,
} from './types.js';

// ============================================================
// A. Attribution Windows
// ============================================================

/**
 * Default attribution window configurations
 */
export const DEFAULT_ATTRIBUTION_CONFIG: CommercialAttributionConfig = {
  attributionClickWindowDays: 7,
  attributionImpressionWindowHours: 24,
  sessionInactivityTimeoutMinutes: 30,
  funnelAggregationIntervalHours: 1,
  revenueQualityThreshold: 0.7,
  lowValueTrafficThreshold: 0.2,
  anomalyDetectionBaselineDays: 7,
};

/**
 * Attribution window in milliseconds
 */
export const ATTRIBUTION_WINDOWS = {
  CLICK: 7 * 24 * 60 * 60 * 1000, // 7 days
  IMPRESSION: 24 * 60 * 60 * 1000, // 24 hours
  SESSION: 30 * 60 * 1000, // 30 minutes
} as const;

// ============================================================
// B. Session Stitching
// ============================================================

/**
 * Session stitching thresholds
 */
export const SESSION_THRESHOLDS = {
  INACTIVITY_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
  IP_CHANGE_TOLERANCE: 10, // minutes to tolerate IP changes
  DEVICE_FINGERPRINT_SIMILARITY: 0.85, // minimum similarity score
  MAX_SESSION_DURATION_HOURS: 24, // maximum session duration
} as const;

// ============================================================
// C. Funnel Aggregation
// ============================================================

/**
 * Funnel aggregation intervals
 */
export const FUNNEL_AGGREGATION = {
  INTERVAL_HOURS: 1,
  MIN_EVENTS_FOR_AGGREGATION: 10,
  ROLLUP_RETENTION_DAYS: 90,
} as const;

/**
 * Funnel stage weights for scoring
 */
export const FUNNEL_STAGE_WEIGHTS = {
  public_page_view: 0.05,
  growth_surface_view: 0.05,
  paste_link_submit: 0.10,
  resolution_request: 0.10,
  resolution_success: 0.15,
  resolution_no_match: 0.05,
  best_voucher_view: 0.10,
  candidate_voucher_view: 0.05,
  voucher_copy_success: 0.20,
  voucher_copy_failure: 0.05,
  open_shopee_click: 0.10,
  affiliate_link_click: 0.10,
  downstream_conversion_reported: 0.25,
  downstream_commission_reported: 0.25,
} as const satisfies Record<CommercialEventType, number>;

// ============================================================
// D. Revenue-Quality Thresholds
// ============================================================

/**
 * Revenue-quality balance thresholds
 */
export const REVENUE_QUALITY_THRESHOLDS = {
  MIN_BALANCE_SCORE: 0.6,
  WARNING_BALANCE_SCORE: 0.7,
  GOOD_BALANCE_SCORE: 0.8,
  EXCELLENT_BALANCE_SCORE: 0.9,

  MIN_USEFULNESS_SCORE: 0.5,
  WARNING_USEFULNESS_SCORE: 0.6,
  GOOD_USEFULNESS_SCORE: 0.7,

  MIN_REVENUE_SCORE: 0.4,
  WARNING_REVENUE_SCORE: 0.6,
  GOOD_REVENUE_SCORE: 0.8,

  DIVERGENCE_THRESHOLD: 0.2, // Score difference indicating divergence
  CRITICAL_DIVERGENCE: 0.4, // Critical divergence
} as const;

/**
 * Risk thresholds for revenue-quality divergence
 */
export const RISK_THRESHOLDS = {
  LOW_VALUE_TRAFFIC_RATIO: 0.2,
  LOW_VALUE_SURFACE_RATIO: 0.15,
  NO_MATCH_SPIKE_THRESHOLD: 0.4,
  NO_MATCH_CRITICAL_THRESHOLD: 0.6,
  CONVERSION_RATE_SPIKE_THRESHOLD: 0.5, // 50% change
  REVENUE_SPIKE_THRESHOLD: 0.3, // 30% change
  CLICK_INFLATION_THRESHOLD: 2.0, // 2x normal
  QUALITY_DEGRADATION_THRESHOLD: 0.2, // 20% drop
} as const;

// ============================================================
// E. Anomaly Detection
// ============================================================

/**
 * Anomaly detection parameters
 */
export const ANOMALY_DETECTION = {
  BASELINE_DAYS: 7,
  Z_SCORE_THRESHOLD: 2.0,
  MIN_DATA_POINTS: 5,
  MOVING_AVERAGE_WINDOW: 7,
  SEASONALITY_DETECTION: true,
  TREND_CHANGE_THRESHOLD: 0.15,
} as const;

/**
 * Anomaly severity thresholds
 */
export const ANOMALY_SEVERITY = {
  INFO: {
    zScoreMin: 1.5,
    zScoreMax: 2.0,
  },
  WARNING: {
    zScoreMin: 2.0,
    zScoreMax: 3.0,
  },
  CRITICAL: {
    zScoreMin: 3.0,
    zScoreMax: Infinity,
  },
} as const;

// ============================================================
// F. Low-Value Traffic Detection
// ============================================================

/**
 * Low-value traffic thresholds
 */
export const LOW_VALUE_THRESHOLDS = {
  SESSION_WITH_NO_SUBMIT: 0.8, // 80% sessions with no paste submit
  SUBMIT_WITH_NO_RESOLUTION: 0.7, // 70% submits with no resolution
  RESOLUTION_WITH_NO_COPY: 0.9, // 90% resolutions with no copy
  COPY_WITH_NO_OPEN: 0.95, // 95% copies with no open
  CLICK_WITH_NO_CONVERSION: 0.98, // 98% clicks with no conversion
  SURFACE_BOT_SCORE: 0.7, // Bot-like behavior threshold
} as const;

/**
 * Low-value surface criteria
 */
export const LOW_VALUE_SURFACE_CRITERIA = {
  MIN_SESSIONS_FOR_EVALUATION: 100,
  MIN_REVENUE_PER_SESSION: 0.01,
  MAX_BOUNCE_RATE: 0.9,
  MAX_NO_MATCH_RATE: 0.7,
} as const;

// ============================================================
// G. Weak Commercial Signal
// ============================================================

/**
 * Weak commercial signal thresholds
 */
export const WEAK_SIGNAL_THRESHOLDS = {
  MIN_CLICK_TO_COPY_RATE: 0.1,
  MIN_COPY_TO_OPEN_RATE: 0.2,
  MIN_OPEN_TO_CONVERSION_RATE: 0.01,
  MIN_REVENUE_PER_CLICK: 0.001,
  MIN_COMMISSION_PER_CLICK: 0.0001,
} as const;

/**
 * Voucher underperformance thresholds
 */
export const VOUCHER_UNDERPERFORMANCE = {
  MIN_CLICKS_FOR_EVALUATION: 50,
  MIN_CONVERSION_RATE: 0.005,
  MIN_REVENUE_PER_CLICK: 0.001,
  MAX_NO_MATCH_RATE: 0.8,
} as const;

// ============================================================
// H. Quality Gates
// ============================================================

/**
 * Default quality gates
 */
export const DEFAULT_QUALITY_GATES: CommercialQualityGate[] = [
  {
    gateName: 'min_revenue_quality_balance',
    gateType: 'revenue_quality_balance',
    thresholdValue: 0.6,
    comparisonOperator: 'gte',
    isActive: true,
  },
  {
    gateName: 'max_no_match_rate',
    gateType: 'no_match_rate',
    thresholdValue: 0.4,
    comparisonOperator: 'lte',
    isActive: true,
  },
  {
    gateName: 'min_copy_to_click_rate',
    gateType: 'conversion_rate',
    thresholdValue: 0.3,
    comparisonOperator: 'gte',
    isActive: true,
  },
  {
    gateName: 'min_usefulness_score',
    gateType: 'usefulness_score',
    thresholdValue: 0.5,
    comparisonOperator: 'gte',
    isActive: true,
  },
  {
    gateName: 'min_attribution_confidence',
    gateType: 'attribution_confidence',
    thresholdValue: 0.5,
    comparisonOperator: 'gte',
    isActive: true,
  },
];

// ============================================================
// I. Growth Surface Configurations
// ============================================================

/**
 * Growth surface type configurations
 */
export const GROWTH_SURFACE_CONFIG: Record<GrowthSurfaceType, {
  expectedConversionRate: number;
  expectedRevenuePerSession: number;
  isPaid: boolean;
  isOwnProperty: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}> = {
  seo_article: {
    expectedConversionRate: 0.05,
    expectedRevenuePerSession: 0.10,
    isPaid: false,
    isOwnProperty: true,
    riskLevel: 'low',
  },
  seo_product_page: {
    expectedConversionRate: 0.08,
    expectedRevenuePerSession: 0.15,
    isPaid: false,
    isOwnProperty: true,
    riskLevel: 'low',
  },
  social_facebook: {
    expectedConversionRate: 0.03,
    expectedRevenuePerSession: 0.05,
    isPaid: true,
    isOwnProperty: false,
    riskLevel: 'medium',
  },
  social_tiktok: {
    expectedConversionRate: 0.02,
    expectedRevenuePerSession: 0.03,
    isPaid: true,
    isOwnProperty: false,
    riskLevel: 'medium',
  },
  social_instagram: {
    expectedConversionRate: 0.02,
    expectedRevenuePerSession: 0.03,
    isPaid: true,
    isOwnProperty: false,
    riskLevel: 'medium',
  },
  email_campaign: {
    expectedConversionRate: 0.10,
    expectedRevenuePerSession: 0.20,
    isPaid: false,
    isOwnProperty: true,
    riskLevel: 'low',
  },
  paid_search: {
    expectedConversionRate: 0.05,
    expectedRevenuePerSession: 0.12,
    isPaid: true,
    isOwnProperty: false,
    riskLevel: 'high',
  },
  paid_social: {
    expectedConversionRate: 0.03,
    expectedRevenuePerSession: 0.06,
    isPaid: true,
    isOwnProperty: false,
    riskLevel: 'high',
  },
  referral: {
    expectedConversionRate: 0.15,
    expectedRevenuePerSession: 0.25,
    isPaid: false,
    isOwnProperty: false,
    riskLevel: 'low',
  },
  direct: {
    expectedConversionRate: 0.10,
    expectedRevenuePerSession: 0.18,
    isPaid: false,
    isOwnProperty: true,
    riskLevel: 'low',
  },
  unknown: {
    expectedConversionRate: 0.01,
    expectedRevenuePerSession: 0.01,
    isPaid: false,
    isOwnProperty: false,
    riskLevel: 'medium',
  },
};

// ============================================================
// J. Metric Snapshot Cadence
// ============================================================

/**
 * Metric snapshot intervals
 */
export const METRIC_SNAPSHOT_CONFIG = {
  HOURLY_SNAPSHOT_RETENTION_DAYS: 2,
  DAILY_SNAPSHOT_RETENTION_DAYS: 30,
  WEEKLY_SNAPSHOT_RETENTION_DAYS: 365,

  AGGREGATION_LEVELS: ['hourly', 'daily', 'weekly'] as const,
  DEFAULT_AGGREGATION_LEVEL: 'daily' as const,
} as const;

// ============================================================
// K. Governance Review Thresholds
// ============================================================

/**
 * Governance review thresholds
 */
export const GOVERNANCE_THRESHOLDS = {
  AUTO_REVIEW_REVENUE_DROP_PERCENT: 20,
  AUTO_REVIEW_QUALITY_DROP_PERCENT: 15,
  AUTO_REVIEW_ANOMALY_COUNT: 5,
  AUTO_REVIEW_CONVERSION_SPIKE_PERCENT: 50,

  RELEASE_BLOCK_REVENUE_DROP_PERCENT: 30,
  RELEASE_BLOCK_QUALITY_DROP_PERCENT: 25,
  RELEASE_BLOCK_CRITICAL_ANOMALIES: 3,

  ESCALATION_THRESHOLD: 'critical' as const,
} as const;

// ============================================================
// L. Experiment Integration
// ============================================================

/**
 * Experiment commercial evaluation thresholds
 */
export const EXPERIMENT_THRESHOLDS = {
  MIN_SAMPLES_FOR_EVALUATION: 100,
  MIN_CONFIDENCE_LEVEL: 0.95,
  MIN_DETECTION_DAYS: 3,

  REVENUE_IMPROVEMENT_THRESHOLD: 0.05, // 5% improvement
  QUALITY_IMPROVEMENT_THRESHOLD: 0.03, // 3% improvement
  HARMFUL_REGRESSION_THRESHOLD: -0.10, // 10% regression

  GUARDRAIL_BREACH_REVENUE_DROP: -0.15,
  GUARDRAIL_BREACH_QUALITY_DROP: -0.10,
} as const;

// ============================================================
// M. Event Type Mappings
// ============================================================

/**
 * Event type to funnel stage mapping
 */
export const EVENT_TYPE_TO_FUNNEL_STAGE: Record<CommercialEventType, string> = {
  public_page_view: 'entry',
  growth_surface_view: 'entry',
  paste_link_submit: 'engagement',
  resolution_request: 'resolution',
  resolution_success: 'resolution',
  resolution_no_match: 'resolution',
  best_voucher_view: 'presentation',
  candidate_voucher_view: 'presentation',
  voucher_copy_success: 'conversion',
  voucher_copy_failure: 'conversion',
  open_shopee_click: 'downstream',
  affiliate_link_click: 'downstream',
  downstream_conversion_reported: 'revenue',
  downstream_commission_reported: 'revenue',
};

/**
 * Funnel stage order for conversion calculations
 */
export const FUNNEL_STAGE_ORDER: CommercialEventType[] = [
  'public_page_view',
  'growth_surface_view',
  'paste_link_submit',
  'resolution_request',
  'resolution_success',
  'resolution_no_match',
  'best_voucher_view',
  'candidate_voucher_view',
  'voucher_copy_success',
  'voucher_copy_failure',
  'open_shopee_click',
  'affiliate_link_click',
  'downstream_conversion_reported',
  'downstream_commission_reported',
];

// ============================================================
// N. Logging & Observability
// ============================================================

/**
 * Log levels for commercial intelligence
 */
export const COMMERCIAL_LOG_LEVELS = {
  ATTRIBUTION: 'attribution',
  FUNNEL: 'funnel',
  GOVERNANCE: 'governance',
  ANOMALY: 'anomaly',
  QUALITY: 'quality',
} as const;

/**
 * Metric names for observability
 */
export const COMMERCIAL_METRIC_NAMES = {
  ATTRIBUTION_SUCCESS: 'commercial.attribution.success',
  ATTRIBUTION_FAILURE: 'commercial.attribution.failure',
  ATTRIBUTION_CONFIDENCE_HIGH: 'commercial.attribution.confidence.high',
  ATTRIBUTION_CONFIDENCE_MEDIUM: 'commercial.attribution.confidence.medium',
  ATTRIBUTION_CONFIDENCE_LOW: 'commercial.attribution.confidence.low',

  FUNNEL_EVENT: 'commercial.funnel.event',
  FUNNEL_DROP_OFF: 'commercial.funnel.drop_off',

  REVENUE_TOTAL: 'commercial.revenue.total',
  REVENUE_ATTRIBUTED: 'commercial.revenue.attributed',
  COMMISSION_TOTAL: 'commercial.commission.total',
  COMMISSION_ATTRIBUTED: 'commercial.commission.attributed',

  ANOMALY_DETECTED: 'commercial.anomaly.detected',
  ANOMALY_CRITICAL: 'commercial.anomaly.critical',
  ANOMALY_WARNING: 'commercial.anomaly.warning',

  GOVERNANCE_REVIEW_CREATED: 'commercial.governance.review.created',
  GOVERNANCE_REVIEW_APPROVED: 'commercial.governance.review.approved',
  GOVERNANCE_REVIEW_REJECTED: 'commercial.governance.review.rejected',

  QUALITY_GATE_PASSED: 'commercial.quality.gate.passed',
  QUALITY_GATE_FAILED: 'commercial.quality.gate.failed',

  LOW_VALUE_SURFACE_DETECTED: 'commercial.surface.low_value',
  VOUCHER_UNDERPERFORMANCE: 'commercial.voucher.underperformance',
} as const;

// ============================================================
// O. Error Messages
// ============================================================

/**
 * Error messages
 */
export const COMMERCIAL_ERRORS = {
  INVALID_SESSION: 'Invalid or expired commercial session',
  INVALID_EVENT_TYPE: 'Invalid commercial event type',
  INVALID_ATTRIBUTION: 'Invalid or expired click attribution',
  INVALID_CONVERSION: 'Invalid or duplicate conversion report',
  ATTRIBUTION_WINDOW_EXPIRED: 'Attribution window has expired',
  INSUFFICIENT_DATA: 'Insufficient data for analysis',
  SESSION_NOT_FOUND: 'Commercial session not found',
  EVENT_NOT_FOUND: 'Funnel event not found',
  CONFLICTING_ATTRIBUTION: 'Conflicting attribution data',
} as const;
