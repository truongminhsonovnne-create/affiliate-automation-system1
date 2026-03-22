/**
 * AI Enrichment Pipeline - Public API
 *
 * Exports all AI enrichment components for external consumption.
 */

// ============================================
// Types
// ============================================

export type {
  AffiliateAiContentType,
  AiEnrichmentRunOptions,
  AiEnrichmentRunResult,
  AiEnrichmentItemResult,
  AiEnrichmentGeneratedContent,
  AiEnrichmentBatchResult,
  AiEnrichmentCounters,
  AiEnrichmentMetadata,
  AiEnrichmentWarning,
  AiEnrichmentError,
  AiEnrichmentStage,
  PromptBuildInput,
  AffiliateProductInput,
  PromptBuildResult,
  GeminiGenerationRequest,
  GeminiGenerationResult,
  GeminiParsedResponse,
  AffiliateContentOutput,
  AiContentQualityResult,
  AiPersistenceDecision,
  AffiliateContentRecordInput,
  AiPromptVersion,
  AiModelConfig,
  AiEnrichmentEligibilityResult,
  AiEnrichmentLogger,
  AiGenerationTrace,
  AiContentQualityIssue,
  AiContentValidationResult,
} from './types.js';

// ============================================
// Constants
// ============================================

export {
  GEMINI_CONFIG,
  AI_RETRY,
  JSON_PARSING,
  CONTENT_QUALITY,
  BATCH_CONFIG,
  PROMPT_CONFIG,
  DEDUP_POLICY,
  AI_LOGGING,
  ELIGIBILITY_CONFIG,
  PERSISTENCE_CONFIG,
  AI_TIMEOUT,
  PARTIAL_SUCCESS,
} from './constants.js';

// ============================================
// Prompts
// ============================================

export {
  buildAffiliateReviewPrompt,
  buildGeminiSystemInstruction,
  getPromptVersion,
  isValidPromptVersion,
} from './prompts.js';

// ============================================
// Schemas
// ============================================

export {
  affiliateContentOutputSchema,
  validateAffiliateContentOutput,
  safeParseAffiliateContentOutput,
  validateTitle,
  validateReviewContent,
  validateSocialCaption,
  validateHashtags,
} from './schemas.js';

// ============================================
// Gemini Client
// ============================================

export type { GeminiClientConfig } from './geminiClient.js';

export {
  GeminiClient,
  createGeminiClient,
  buildGeminiContents,
} from './geminiClient.js';

// ============================================
// Parser
// ============================================

export {
  extractJsonFromGeminiText,
  parseGeminiAffiliateResponse,
  repairMinorJsonIssues,
  safeParseAffiliateContent,
} from './parser.js';

// ============================================
// Quality Gate
// ============================================

export {
  evaluateAffiliateAiContentQuality,
  shouldPersistAffiliateAiContent,
  summarizeAiContentQuality,
} from './qualityGate.js';

// ============================================
// Eligibility
// ============================================

export {
  isProductEligibleForAiEnrichment,
  buildAiEnrichmentEligibilityResult,
  filterEligibleProducts,
} from './eligibility.js';

// ============================================
// Product Loader
// ============================================

export type { ProductLoaderOptions } from './productLoader.js';

export {
  loadAffiliateProductForEnrichment,
  loadAffiliateProductsForEnrichment,
  hasExistingAiContent,
} from './productLoader.js';

// ============================================
// Persistence
// ============================================

export {
  persistAffiliateAiContent,
  persistManyAffiliateAiContents,
  mapAiOutputToAffiliateContentRecord,
  resolveAffiliateContentPersistencePolicy,
} from './persistence.js';

// ============================================
// Result Builder
// ============================================

export type { AiResultBuilderOptions } from './resultBuilder.js';

export {
  AiEnrichmentResultBuilder,
  createAiEnrichmentResultBuilder,
  buildAiEnrichmentResult,
  buildAiEnrichmentCounters,
  summarizeAiEnrichmentWarnings,
  summarizeAiEnrichmentErrors,
  buildAiEnrichmentError,
  buildAiEnrichmentWarning,
} from './resultBuilder.js';

// ============================================
// Pipeline Orchestrator
// ============================================

export type { AiEnrichmentPipelineDependencies } from './affiliateAiEnrichmentPipeline.js';

export {
  AffiliateAiEnrichmentPipeline,
  createAffiliateAiEnrichmentPipeline,
  runAffiliateAiEnrichmentForProduct,
  runAffiliateAiEnrichmentBatch,
} from './affiliateAiEnrichmentPipeline.js';
