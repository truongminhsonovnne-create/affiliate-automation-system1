/**
 * Growth Engine Constants
 *
 * Centralized configuration for Growth Engine + Programmatic SEO Governance.
 */

// ============================================================================
// Page Generation Limits
// ============================================================================

export const SURFACE_GENERATION_CONFIG = {
  // Max surfaces per batch generation
  MAX_BATCH_SIZE: 50,
  MAX_DAILY_GENERATIONS: 500,

  // Surface type specific limits
  MAX_SHOP_PAGES: 10000,
  MAX_CATEGORY_PAGES: 5000,
  MAX_INTENT_PAGES: 2000,
  MAX_DISCOVERY_PAGES: 500,
  MAX_RANKING_PAGES: 200,
  MAX_GUIDE_PAGES: 100,
} as const;

// ============================================================================
// Internal Link Limits
// ============================================================================

export const LINK_CONFIG = {
  // Max links per surface
  MAX_LINKS_PER_SURFACE: 10,
  MAX_CONTEXTUAL_LINKS: 5,
  MAX_NAVIGATION_LINKS: 3,
  MAX_CTA_LINKS: 2,
  MAX_RELATED_LINKS: 5,

  // Link priority
  CTA_PRIORITY: 10,
  CONTEXTUAL_PRIORITY: 5,
  NAVIGATION_PRIORITY: 8,
  RELATED_PRIORITY: 3,
  BREADCRUMB_PRIORITY: 7,
} as const;

// ============================================================================
// Quality Score Thresholds
// ============================================================================

export const QUALITY_SCORE_CONFIG = {
  // Quality score thresholds (0-100)
  EXCELLENT_THRESHOLD: 90,
  GOOD_THRESHOLD: 75,
  ACCEPTABLE_THRESHOLD: 60,
  POOR_THRESHOLD: 40,

  // Component weights
  COMPONENT_WEIGHTS: {
    usefulness: 0.30,
    clarity: 0.15,
    ctaDiscipline: 0.20,
    freshness: 0.10,
    seoCleanliness: 0.15,
    conversionRelevance: 0.10,
  },
} as const;

// ============================================================================
// Usefulness Score Thresholds
// ============================================================================

export const USEFULNESS_SCORE_CONFIG = {
  // Usefulness thresholds (0-100)
  HIGH_USE_THRESHOLD: 70,
  MEDIUM_USE_THRESHOLD: 50,
  LOW_USE_THRESHOLD: 30,

  // Bounce rate threshold
  HIGH_BOUNCE_THRESHOLD: 70,
  MEDIUM_BOUNCE_THRESHOLD: 50,

  // Conversion threshold
  MIN_CONVERSION_RATE: 0.01, // 1%
} as const;

// ============================================================================
// Thin Content Thresholds
// ============================================================================

export const THIN_CONTENT_CONFIG = {
  // Character count thresholds
  MIN_CHARS_FOR_INDEXABLE: 300,
  MIN_CHARS_FOR_QUALITY: 500,
  RECOMMENDED_CHARS: 1000,

  // Word count thresholds
  MIN_WORDS_FOR_INDEXABLE: 50,
  MIN_WORDS_FOR_QUALITY: 100,
  RECOMMENDED_WORDS: 200,

  // Section/component thresholds
  MIN_SECTIONS: 1,
  MIN_VALUABLE_SECTIONS: 2,

  // Risk levels
  CRITICAL_THIN_CHARS: 100,
  HIGH_THIN_CHARS: 200,
  MEDIUM_THIN_CHARS: 300,
} as const;

// ============================================================================
// Duplicate Content Thresholds
// ============================================================================

export const DUPLICATE_CONTENT_CONFIG = {
  // Similarity thresholds (0-1)
  HIGH_DUPLICATION_SIMILARITY: 0.8,
  MEDIUM_DUPLICATION_SIMILARITY: 0.6,
  LOW_DUPLICATION_SIMILARITY: 0.4,

  // Content fingerprint thresholds
  MIN_UNIQUE_TOKENS: 50,

  // Risk levels
  CRITICAL_DUPLICATION: 0.9,
  HIGH_DUPLICATION: 0.7,
  MEDIUM_DUPLICATION: 0.5,
} as const;

// ============================================================================
// Clutter Risk Thresholds
// ============================================================================

export const CLUTTER_CONFIG = {
  // Max elements per page
  MAX_SECTIONS: 8,
  MAX_CTA_COUNT: 3,
  MAX_INTERNAL_LINKS: 10,

  // Clutter scores
  LOW_CLUTTER_SCORE: 30,
  MEDIUM_CLUTTER_SCORE: 60,
  HIGH_CLUTTER_SCORE: 80,

  // Risk thresholds
  LOW_CLUTTER_RISK: 0.3,
  MEDIUM_CLUTTER_RISK: 0.5,
  HIGH_CLUTTER_RISK: 0.7,
} as const;

// ============================================================================
// Freshness Windows
// ============================================================================

export const FRESHNESS_CONFIG = {
  // Freshness windows in days
  FRESH_WINDOW_DAYS: 7,
  STALE_WINDOW_DAYS: 30,
  NEEDS_REFRESH_WINDOW_DAYS: 14,

  // Refresh cadence by surface type
  REFRESH_CADENCE: {
    shop_page: 7,
    category_page: 14,
    intent_page: 14,
    tool_entry: 30,
    discovery_page: 14,
    ranking_page: 7,
    guide_page: 30,
  },

  // Auto-refresh thresholds
  AUTO_REFRESH_TRIGGER_DAYS: 10,
} as const;

// ============================================================================
// Indexability Thresholds
// ============================================================================

export const INDEXABILITY_CONFIG = {
  // Minimum quality for indexability
  MIN_QUALITY_FOR_INDEX: 50,
  MIN_USE_FOR_INDEX: 40,

  // Content requirements
  MIN_CONTENT_FOR_INDEX: THIN_CONTENT_CONFIG.MIN_CHARS_FOR_INDEXABLE,

  // Risk thresholds
  HIGH_DUPLICATION_RISK: 0.6,
  HIGH_THIN_RISK: 0.7,

  // Canonical requirements
  REQUIRES_CANONICAL: true,
} as const;

// ============================================================================
// Stale Surface Thresholds
// ============================================================================

export const STALE_SURFACE_CONFIG = {
  // Days before marked stale
  STALE_THRESHOLD_DAYS: 30,

  // Days before auto-deindex
  AUTO_DEINDEX_THRESHOLD_DAYS: 60,

  // Warning thresholds
  STALE_WARNING_DAYS: 21,

  // Orphan surface threshold
  ORPHAN_THRESHOLD_DAYS: 90,
} as const;

// ============================================================================
// Tool Alignment Thresholds
// ============================================================================

export const TOOL_ALIGNMENT_CONFIG = {
  // CTA presence required
  MIN_CTA_COUNT: 1,
  MAX_CTA_COUNT: 3,

  // Tool emphasis score (0-1)
  MIN_TOOL_EMPHASIS: 0.3,

  // Wander risk thresholds
  LOW_WANDER_RISK: 0.2,
  MEDIUM_WANDER_RISK: 0.5,
  HIGH_WANDER_RISK: 0.7,

  // Navigation rules
  ALLOW_NAVIGATION_LINKS: true,
  MAX_NAVIGATION_DEPTH: 2,
} as const;

// ============================================================================
// Generation Batch Settings
// ============================================================================

export const GENERATION_BATCH_CONFIG = {
  // Batch sizes
  DEFAULT_BATCH_SIZE: 20,
  MAX_PARALLEL_GENERATIONS: 5,

  // Retry settings
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,

  // Timeout
  GENERATION_TIMEOUT_MS: 30000,

  // Idempotency
  IDEMPOTENCY_WINDOW_MS: 60000,
} as const;

// ============================================================================
// Governance Action Thresholds
// ============================================================================

export const GOVERNANCE_CONFIG = {
  // Auto-block thresholds
  CRITICAL_THIN_CONTENT_AUTOBLOCK: true,
  CRITICAL_DUPLICATION_AUTOBLOCK: true,
  CRITICAL_LOW_USE_AUTOBLOCK: false,

  // Manual review thresholds
  REVIEW_QUALITY_THRESHOLD: 50,
  REVIEW_USE_THRESHOLD: 30,

  // Deindex thresholds
  DEINDEX_STALE_DAYS: STALE_SURFACE_CONFIG.AUTO_DEINDEX_THRESHOLD_DAYS,
  DEINDEX_QUALITY_THRESHOLD: 20,

  // Escalation
  ESCALATE_AFTER_FAILED_ATTEMPTS: 3,
} as const;

// ============================================================================
// Surface Type Config
// ============================================================================

export const SURFACE_TYPE_CONFIG = {
  [GrowthSurfaceType.SHOP_PAGE]: {
    minContentChars: 500,
    maxContentChars: 3000,
    requiresCta: true,
    indexableByDefault: true,
    refreshCadence: 7,
  },
  [GrowthSurfaceType.CATEGORY_PAGE]: {
    minContentChars: 300,
    maxContentChars: 2000,
    requiresCta: true,
    indexableByDefault: true,
    refreshCadence: 14,
  },
  [GrowthSurfaceType.INTENT_PAGE]: {
    minContentChars: 400,
    maxContentChars: 2500,
    requiresCta: true,
    indexableByDefault: true,
    refreshCadence: 14,
  },
  [GrowthSurfaceType.TOOL_ENTRY]: {
    minContentChars: 100,
    maxContentChars: 500,
    requiresCta: false,
    indexableByDefault: true,
    refreshCadence: 30,
  },
  [GrowthSurfaceType.DISCOVERY_PAGE]: {
    minContentChars: 200,
    maxContentChars: 1500,
    requiresCta: true,
    indexableByDefault: false,
    refreshCadence: 14,
  },
  [GrowthSurfaceType.RANKING_PAGE]: {
    minContentChars: 500,
    maxContentChars: 4000,
    requiresCta: true,
    indexableByDefault: true,
    refreshCadence: 7,
  },
  [GrowthSurfaceType.GUIDE_PAGE]: {
    minContentChars: 1000,
    maxContentChars: 5000,
    requiresCta: true,
    indexableByDefault: true,
    refreshCadence: 30,
  },
} as const;

// Import types
import { GrowthSurfaceType } from './types';
