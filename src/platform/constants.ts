/**
 * Multi-Platform Foundation Constants
 */

// ============================================================
// A. Readiness Thresholds
// ============================================================

export const READINESS_THRESHOLDS = {
  READY_MIN: 0.85,
  PROCEED_CAUTIOUSLY_MIN: 0.70,
  HOLD_MIN: 0.50,
  // If below HOLD_MIN, status is NOT_READY
} as const;

export const CAPABILITY_SCORE_THRESHOLDS = {
  COMPLETE_MIN: 0.90,
  PARTIAL_MIN: 0.50,
  NOT_STARTED_MAX: 0.10,
} as const;

// ============================================================
// B. Support Level Defaults
// ============================================================

export const SUPPORT_LEVELS = {
  NONE: 'none',
  DISCOVERY: 'discovery',
  REFERENCE: 'reference',
  CONTEXT: 'context',
  PROMOTION: 'promotion',
  FULL: 'full',
} as const;

// ============================================================
// C. Platform Defaults
// ============================================================

export const PLATFORM_STATUS_DEFAULTS = {
  DEFAULT: 'planned',
  SHOPEE: 'active',
  TIKTOK_SHOP: 'preparing',
} as const;

export const PLATFORM_SUPPORT_DEFAULTS = {
  SHOPEE: 'full',
  TIKTOK_SHOP: 'none',
} as const;

// ============================================================
// D. Capability Area Definitions
// ============================================================

export const CAPABILITY_AREAS = {
  PRODUCT_REFERENCE_PARSING: 'product_reference_parsing',
  PRODUCT_CONTEXT_RESOLUTION: 'product_context_resolution',
  PROMOTION_RULE_MODELING: 'promotion_rule_modeling',
  PUBLIC_FLOW_SUPPORT: 'public_flow_support',
  COMMERCIAL_ATTRIBUTION: 'commercial_attribution',
  GROWTH_SURFACE_SUPPORT: 'growth_surface_support',
  OPS_GOVERNANCE_SUPPORT: 'ops_governance_support',
  BI_READINESS_SUPPORT: 'bi_readiness_support',
} as const;

// ============================================================
// E. Blocker/Warning Thresholds
// ============================================================

export const BLOCKER_THRESHOLDS = {
  CRITICAL_BLOCKER_COUNT: 5,
  HIGH_BLOCKER_COUNT: 10,
  MEDIUM_BLOCKER_COUNT: 20,
} as const;

export const WARNING_THRESHOLDS = {
  HIGH_WARNING_COUNT: 15,
  MEDIUM_WARNING_COUNT: 25,
} as const;

// ============================================================
// F. Backlog Priority Thresholds
// ============================================================

export const BACKLOG_PRIORITY_THRESHOLDS = {
  CRITICAL_DUE_DAYS: 7,
  HIGH_DUE_DAYS: 14,
  MEDIUM_DUE_DAYS: 30,
} as const;

// ============================================================
// G. Review Cadence
// ============================================================

export const REVIEW_CADENCE = {
  INITIAL_REVIEW_DAYS: 30,
  INCREMENTAL_REVIEW_DAYS: 14,
  PRE_LAUNCH_REVIEW_DAYS: 7,
  QUARTERLY_REVIEW_DAYS: 90,
} as const;

// ============================================================
// H. TikTok Shop Specific
// ============================================================

export const TIKTOK_SHOP_KEY = 'tiktok_shop';

export const TIKTOK_SHOP_CORE_CAPABILITIES = [
  'product_reference_parsing',
  'product_context_resolution',
  'promotion_rule_modeling',
] as const;

export const TIKTOK_SHOP_OPERATIONAL_CAPABILITIES = [
  'commercial_attribution',
  'ops_governance_support',
] as const;

export const TIKTOK_SHOP_UX_CAPABILITIES = [
  'public_flow_support',
  'growth_surface_support',
] as const;

// ============================================================
// I. Platform Keys
// ============================================================

export const PLATFORM_KEYS = {
  SHOPEE: 'shopee',
  TIKTOK_SHOP: 'tiktok_shop',
  LAZADA: 'lazada',
  TOKOPEDIA: 'tokopedia',
  GENERIC: 'generic',
} as const;

// ============================================================
// J. Risk Weights for Readiness
// ============================================================

export const READINESS_WEIGHTS = {
  DOMAIN_MODEL: 0.15,
  PARSER_REFERENCE: 0.20,
  PRODUCT_CONTEXT: 0.15,
  PROMOTION_RULES: 0.15,
  PUBLIC_FLOW: 0.15,
  COMMERCIAL_ATTRIBUTION: 0.10,
  GOVERNANCE: 0.10,
} as const;

// ============================================================
// K. Capability Status Priority
// ============================================================

export const CAPABILITY_STATUS_PRIORITY: Record<string, number> = {
  verified: 5,
  complete: 4,
  partial: 3,
  in_progress: 2,
  not_started: 1,
  unsupported: 0,
};
