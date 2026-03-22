/**
 * AI Enrichment Pipeline - Types
 *
 * Shared types and interfaces for AI content enrichment.
 */

// ============================================
// Content Types
// ============================================

/**
 * AI content types supported
 */
export type AffiliateAiContentType =
  | 'affiliate_review'
  | 'affiliate_caption'
  | 'affiliate_description';

// ============================================
// Run Options & Results
// ============================================

/**
 * AI enrichment run options
 */
export interface AiEnrichmentRunOptions {
  /** Content type to generate */
  contentType: AffiliateAiContentType;

  /** Specific product IDs to process */
  productIds?: string[];

  /** Process latest N products */
  latestCount?: number;

  /** Filter by source type */
  sourceType?: string;

  /** Filter by keyword */
  keyword?: string;

  /** Maximum concurrent requests */
  maxConcurrency?: number;

  /** Prompt version to use */
  promptVersion?: string;

  /** Model to use */
  model?: string;

  /** Temperature for generation */
  temperature?: number;

  /** Maximum tokens */
  maxTokens?: number;

  /** Enable persistence */
  enablePersistence?: boolean;

  /** Skip existing content */
  skipExisting?: boolean;

  /** Custom logger */
  logger?: AiEnrichmentLogger;
}

/**
 * AI enrichment run result for single item
 */
export interface AiEnrichmentItemResult {
  /** Product ID */
  productId: string;

  /** Success status */
  ok: boolean;

  /** Operation performed */
  operation: 'generated' | 'skipped' | 'failed';

  /** Reason for result */
  reason?: string;

  /** Generated content (if any) */
  content?: AiEnrichmentGeneratedContent;

  /** Error if failed */
  error?: string;
}

/**
 * Generated AI content
 */
export interface AiEnrichmentGeneratedContent {
  /** Rewritten title */
  rewrittenTitle: string;

  /** Full review content */
  reviewContent: string;

  /** Social media caption */
  socialCaption: string;

  /** Hashtags */
  hashtags: string[];

  /** Quality score */
  qualityScore: number;

  /** Quality severity */
  qualitySeverity: 'pass' | 'warning' | 'fail';
}

/**
 * AI enrichment run result
 */
export interface AiEnrichmentRunResult {
  /** Overall success */
  ok: boolean;

  /** Run status */
  status: 'success' | 'partial_success' | 'failed';

  /** Content type */
  contentType: AffiliateAiContentType;

  /** Counters */
  counters: AiEnrichmentCounters;

  /** Results per product */
  results: AiEnrichmentItemResult[];

  /** Warnings */
  warnings: AiEnrichmentWarning[];

  /** Errors */
  errors: AiEnrichmentError[];

  /** Metadata */
  metadata: AiEnrichmentMetadata;

  /** Duration in ms */
  durationMs: number;
}

/**
 * Batch result
 */
export interface AiEnrichmentBatchResult {
  /** Total processed */
  total: number;

  /** Successful */
  succeeded: number;

  /** Failed */
  failed: number;

  /** Skipped */
  skipped: number;

  /** Results */
  results: AiEnrichmentRunResult[];
}

/**
 * Counters
 */
export interface AiEnrichmentCounters {
  /** Products loaded */
  loaded: number;

  /** Products eligible */
  eligible: number;

  /** Content generated */
  generated: number;

  /** Content persisted */
  persisted: number;

  /** Content skipped */
  skipped: number;

  /** Content failed */
  failed: number;
}

// ============================================
// Metadata, Warnings, Errors
// ============================================

/**
 * AI enrichment metadata
 */
export interface AiEnrichmentMetadata {
  /** Start timestamp */
  startTime: number;

  /** End timestamp */
  endTime: number;

  /** Model used */
  modelUsed: string;

  /** Prompt version used */
  promptVersionUsed: string;

  /** Content type */
  contentType: AffiliateAiContentType;

  /** Total Gemini API calls */
  totalApiCalls: number;

  /** Successful API calls */
  successfulApiCalls: number;

  /** Failed API calls */
  failedApiCalls: number;

  /** Parse failures */
  parseFailures: number;

  /** Validation failures */
  validationFailures: number;

  /** Generation duration stats */
  generationDurationStats: {
    min: number;
    max: number;
    avg: number;
    total: number;
  };
}

/**
 * AI enrichment warning
 */
export interface AiEnrichmentWarning {
  /** Warning code */
  code: string;

  /** Warning message */
  message: string;

  /** Severity */
  severity: 'info' | 'warning' | 'critical';

  /** Related product ID */
  productId?: string;

  /** Stage where it occurred */
  stage?: AiEnrichmentStage;
}

/**
 * AI enrichment error
 */
export interface AiEnrichmentError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Error stack */
  stack?: string;

  /** Whether is recoverable */
  recoverable: boolean;

  /** Related product ID */
  productId?: string;

  /** Stage where it occurred */
  stage?: AiEnrichmentStage;
}

/**
 * Pipeline stages
 */
export type AiEnrichmentStage =
  | 'initialization'
  | 'product_loading'
  | 'eligibility_check'
  | 'prompt_building'
  | 'gemini_api_call'
  | 'parsing'
  | 'validation'
  | 'quality_gate'
  | 'persistence'
  | 'finalization';

// ============================================
// Prompt Types
// ============================================

/**
 * Prompt build input
 */
export interface PromptBuildInput {
  /** Product data */
  product: AffiliateProductInput;

  /** Content type */
  contentType: AffiliateAiContentType;
}

/**
 * Simplified product input for prompt building
 */
export interface AffiliateProductInput {
  /** Product ID */
  id: string;

  /** Product title */
  title: string;

  /** Product description */
  description?: string;

  /** Short description */
  shortDescription?: string;

  /** Price in VND */
  priceVnd?: number;

  /** Original price in VND */
  originalPriceVnd?: number;

  /** Discount percent */
  discountPercent?: number;

  /** Product URL */
  productUrl: string;

  /** Images */
  images: string[];

  /** Seller name */
  sellerName?: string;

  /** Rating */
  rating?: number;

  /** Total ratings */
  totalRatings?: number;

  /** Sold count */
  soldCount?: number;

  /** Category path */
  categoryPath?: string;

  /** Source type */
  sourceType: string;

  /** Source keyword */
  sourceKeyword?: string;
}

/**
 * Prompt build result
 */
export interface PromptBuildResult {
  /** System instruction */
  systemInstruction: string;

  /** User prompt */
  userPrompt: string;

  /** Prompt version */
  version: string;

  /** Input token estimate */
  estimatedInputTokens?: number;
}

// ============================================
// Gemini API Types
// ============================================

/**
 * Gemini generation request
 */
export interface GeminiGenerationRequest {
  /** Contents to generate from */
  contents: GeminiContent[];

  /** System instruction */
  systemInstruction?: GeminiContent;

  /** Generation config */
  generationConfig?: GeminiGenerationConfig;
}

/**
 * Gemini content part
 */
export interface GeminiContent {
  /** Role */
  role: 'user' | 'model';

  /** Parts */
  parts: Array<{
    text?: string;
  }>;
}

/**
 * Gemini generation config
 */
export interface GeminiGenerationConfig {
  /** Temperature */
  temperature?: number;

  /** Top P */
  topP?: number;

  /** Top K */
  topK?: number;

  /** Max output tokens */
  maxOutputTokens?: number;

  /** Response MIME type */
  responseMimeType?: string;
}

/**
 * Gemini generation result
 */
export interface GeminiGenerationResult {
  /** Success */
  ok: boolean;

  /** Generated text */
  text?: string;

  /** Finish reason */
  finishReason?: string;

  /** Error if failed */
  error?: string;

  /** Metadata */
  metadata: {
    /** Model used */
    model: string;

    /** Generation duration in ms */
    durationMs: number;

    /** Number of attempts */
    attempts: number;

    /** Prompt token count */
    promptTokenCount?: number;

    /** Candidates token count */
    candidatesTokenCount?: number;

    /** Total token count */
    totalTokenCount?: number;
  };
}

/**
 * Parsed Gemini response
 */
export interface GeminiParsedResponse {
  /** Parsed successfully */
  ok: boolean;

  /** Parsed data */
  data?: AffiliateContentOutput;

  /** Parse error */
  parseError?: string;

  /** Raw text */
  rawText: string;
}

// ============================================
// Content Output Schema
// ============================================

/**
 * Affiliate content output from AI
 */
export interface AffiliateContentOutput {
  /** Rewritten title */
  rewrittenTitle: string;

  /** Review content */
  reviewContent: string;

  /** Social caption */
  socialCaption: string;

  /** Hashtags */
  hashtags: string[];
}

// ============================================
// Quality Gate Types
// ============================================

/**
 * AI content quality result
 */
export interface AiContentQualityResult {
  /** Passed quality check */
  pass: boolean;

  /** Quality score (0-100) */
  score: number;

  /** Severity */
  severity: 'pass' | 'warning' | 'fail';

  /** Warnings */
  warnings: string[];

  /** Reject reasons */
  rejectReasons: string[];

  /** Quality issues */
  qualityIssues: AiContentQualityIssue[];
}

/**
 * Quality issue
 */
export interface AiContentQualityIssue {
  /** Field affected */
  field: string;

  /** Issue type */
  issueType: 'length' | 'format' | 'content' | 'duplication' | 'hallucination' | 'empty';

  /** Description */
  description: string;

  /** Severity */
  severity: 'info' | 'warning' | 'critical';
}

/**
 * Persistence decision
 */
export type AiPersistenceDecision = 'insert' | 'update' | 'skip' | 'reject';

// ============================================
// Persistence Types
// ============================================

/**
 * Affiliate content record input
 */
export interface AffiliateContentRecordInput {
  /** Product ID */
  productId: string;

  /** Content type */
  contentType: AffiliateAiContentType;

  /** Rewritten title */
  rewrittenTitle: string;

  /** Review content */
  reviewContent: string;

  /** Social caption */
  socialCaption: string;

  /** Hashtags */
  hashtags: string[];

  /** AI model used */
  aiModel: string;

  /** Prompt version used */
  promptVersion: string;

  /** Quality score */
  qualityScore: number;

  /** Source type */
  sourceType: string;

  /** Source keyword */
  sourceKeyword?: string;
}

// ============================================
// Configuration Types
// ============================================

/**
 * AI prompt version
 */
export interface AiPromptVersion {
  /** Version identifier */
  version: string;

  /** Content type */
  contentType: AffiliateAiContentType;

  /** Created at */
  createdAt: string;

  /** Description */
  description?: string;
}

/**
 * AI model configuration
 */
export interface AiModelConfig {
  /** Model name */
  model: string;

  /** Display name */
  displayName: string;

  /** Default temperature */
  defaultTemperature: number;

  /** Default max tokens */
  defaultMaxTokens: number;

  /** Supported content types */
  supportedContentTypes: AffiliateAiContentType[];

  /** Enabled */
  enabled: boolean;
}

// ============================================
// Eligibility Types
// ============================================

/**
 * Product eligibility result
 */
export interface AiEnrichmentEligibilityResult {
  /** Eligible */
  eligible: boolean;

  /** Reason */
  reason: string;

  /** Missing fields */
  missingFields: string[];

  /** Warnings */
  warnings: string[];
}

// ============================================
// Logger Interface
// ============================================

/**
 * AI enrichment logger
 */
export interface AiEnrichmentLogger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

// ============================================
// Generation Trace
// ============================================

/**
 * AI generation trace for debugging
 */
export interface AiGenerationTrace {
  /** Product ID */
  productId: string;

  /** Content type */
  contentType: AffiliateAiContentType;

  /** Prompt version */
  promptVersion: string;

  /** Model used */
  modelUsed: string;

  /** Raw input */
  rawInput?: string;

  /** Raw output */
  rawOutput?: string;

  /** Parsed output */
  parsedOutput?: AffiliateContentOutput;

  /** Parse success */
  parseSuccess: boolean;

  /** Validation success */
  validationSuccess: boolean;

  /** Quality score */
  qualityScore?: number;

  /** Duration in ms */
  durationMs: number;

  /** Error if any */
  error?: string;
}
