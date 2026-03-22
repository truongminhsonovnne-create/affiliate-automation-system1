/**
 * AI Enrichment Pipeline - Constants
 *
 * Default configuration values for AI content enrichment.
 */

// ============================================
// Gemini API Configuration
// ============================================

export const GEMINI_CONFIG = {
  /** Default model */
  DEFAULT_MODEL: 'gemini-2.0-flash-exp',

  /** Fallback model */
  FALLBACK_MODEL: 'gemini-1.5-flash',

  /** Default temperature */
  DEFAULT_TEMPERATURE: 0.7,

  /** Temperature range */
  MIN_TEMPERATURE: 0.0,
  MAX_TEMPERATURE: 1.0,

  /** Default top P */
  DEFAULT_TOP_P: 0.95,

  /** Default top K */
  DEFAULT_TOP_K: 40,

  /** Default max output tokens */
  DEFAULT_MAX_TOKENS: 2048,

  /** Absolute max tokens */
  MAX_TOKENS_LIMIT: 8192,

  /** Request timeout (ms) */
  REQUEST_TIMEOUT: 60000,

  /** Base URL for API */
  BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
} as const;

// ============================================
// Retry Configuration
// ============================================

export const AI_RETRY = {
  /** Maximum retry attempts */
  DEFAULT_MAX_RETRIES: 3,

  /** Maximum retries for API calls */
  MAX_API_RETRIES: 3,

  /** Base backoff delay (ms) */
  BACKOFF_BASE: 1000,

  /** Maximum backoff delay (ms) */
  BACKOFF_MAX: 10000,

  /** Jitter factor */
  JITTER_FACTOR: 0.3,
} as const;

// ============================================
// JSON Parsing Configuration
// ============================================

export const JSON_PARSING = {
  /** Maximum parse attempts */
  MAX_PARSE_ATTEMPTS: 3,

  /** Maximum repair attempts */
  MAX_REPAIR_ATTEMPTS: 2,

  /** Budget for fallback parsing */
  FALLBACK_BUDGET: 500,

  /** Regex patterns to clean */
  MARKDOWN_FENCE_PATTERNS: [
    /```json\s*([\s\S]*?)\s*```/gi,
    /```\s*([\s\S]*?)\s*```/gi,
  ],

  /** Text to strip */
  STRIP_PATTERNS: [
    /^\s*```[\s\S]*?```\s*/gi,
    /^\s*json\s*/gi,
  ],
} as const;

// ============================================
// Content Quality Thresholds
// ============================================

export const CONTENT_QUALITY = {
  /** Minimum rewritten title length */
  MIN_TITLE_LENGTH: 20,

  /** Maximum rewritten title length */
  MAX_TITLE_LENGTH: 150,

  /** Minimum review content length */
  MIN_REVIEW_LENGTH: 200,

  /** Maximum review content length */
  MAX_REVIEW_LENGTH: 2000,

  /** Minimum social caption length */
  MIN_CAPTION_LENGTH: 50,

  /** Maximum social caption length */
  MAX_CAPTION_LENGTH: 500,

  /** Minimum hashtags count */
  MIN_HASHTAGS: 3,

  /** Maximum hashtags count */
  MAX_HASHTAGS: 15,

  /** Minimum quality score to pass */
  MIN_QUALITY_SCORE: 50,

  /** Quality score for warning */
  WARNING_QUALITY_SCORE: 70,

  /** Strict quality score */
  STRICT_QUALITY_SCORE: 80,

  /** Minimum word uniqueness ratio */
  MIN_WORD_UNIQUENESS_RATIO: 0.3,
} as const;

// ============================================
// Batch Processing
// ============================================

export const BATCH_CONFIG = {
  /** Default concurrency */
  DEFAULT_CONCURRENCY: 3,

  /** Maximum concurrency */
  MAX_CONCURRENCY: 10,

  /** Minimum concurrency */
  MIN_CONCURRENCY: 1,

  /** Default batch size */
  DEFAULT_BATCH_SIZE: 10,

  /** Maximum batch size */
  MAX_BATCH_SIZE: 50,
} as const;

// ============================================
// Prompt Configuration
// ============================================

export const PROMPT_CONFIG = {
  /** Default prompt version */
  DEFAULT_VERSION: 'v1',

  /** Current prompt version for affiliate review */
  CURRENT_AFFILIATE_REVIEW_VERSION: 'v1',

  /** Current prompt version for affiliate caption */
  CURRENT_AFFILIATE_CAPTION_VERSION: 'v1',

  /** Supported versions */
  SUPPORTED_VERSIONS: ['v1', 'v2'] as const,

  /** Version descriptions */
  VERSION_DESCRIPTIONS: {
    v1: 'Initial version with basic affiliate review structure',
    v2: 'Enhanced version with better CTA and hashtag optimization',
  } as Record<string, string>,
} as const;

// ============================================
// Dedup / Regeneration Policy
// ============================================

export const DEDUP_POLICY = {
  /** Skip if content exists with same prompt version and model */
  SKIP_SAME_VERSION: true,

  /** Create new version if model changed */
  CREATE_NEW_ON_MODEL_CHANGE: true,

  /** Update if new quality is better */
  UPDATE_ON_BETTER_QUALITY: true,

  /** Minimum quality improvement to trigger update */
  MIN_QUALITY_IMPROVEMENT: 5,
} as const;

// ============================================
// Logging Configuration
// ============================================

export const AI_LOGGING = {
  /** Log prefix */
  PREFIX: '[AiEnrichment]',

  /** Include raw output in debug (be careful with tokens) */
  INCLUDE_RAW_OUTPUT: false,

  /** Include raw input in debug */
  INCLUDE_RAW_INPUT: false,

  /** Max message length */
  MAX_MESSAGE_LENGTH: 500,
} as const;

// ============================================
// Eligibility Thresholds
// ============================================

export const ELIGIBILITY_CONFIG = {
  /** Minimum fields required */
  MIN_REQUIRED_FIELDS: ['title', 'productUrl'] as const,

  /** Fields that make product interesting for content */
  INTEREST_FIELDS: ['description', 'priceVnd', 'images', 'rating'] as const,

  /** Minimum interest score */
  MIN_INTEREST_SCORE: 2,

  /** Require price for enrichment */
  REQUIRE_PRICE: false,

  /** Require images for enrichment */
  REQUIRE_IMAGES: false,

  /** Require description minimum length */
  MIN_DESCRIPTION_LENGTH: 50,
} as const;

// ============================================
// Persistence Configuration
// ============================================

export const PERSISTENCE_CONFIG = {
  /** Default batch size */
  DEFAULT_BATCH_SIZE: 10,

  /** Maximum batch size */
  MAX_BATCH_SIZE: 50,

  /** Enable upsert by default */
  DEFAULT_UPSERT: true,
} as const;

// ============================================
// Timeouts
// ============================================

export const AI_TIMEOUT = {
  /** Overall enrichment timeout (5 minutes) */
  ENRICHMENT_TIMEOUT: 300000,

  /** Stage timeout (2 minutes) */
  STAGE_TIMEOUT: 120000,

  /** API call timeout */
  API_TIMEOUT: 60000,
} as const;

// ============================================
// Partial Success Thresholds
// ============================================

export const PARTIAL_SUCCESS = {
  /** Minimum success rate for partial success */
  MIN_SUCCESS_RATE: 0.3,

  /** Minimum items processed for partial success */
  MIN_ITEMS_PROCESSED: 1,
} as const;
