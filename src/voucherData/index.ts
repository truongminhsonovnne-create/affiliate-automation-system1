// =============================================================================
// Voucher Data Layer - Public API
// Production-grade exports for voucher data, rules, and evaluation
// =============================================================================

// Types
export * from './types.js';

// Constants
export * from './constants.js';

// Catalog
export * from './catalog/voucherCatalogNormalizer.js';
export * from './catalog/voucherIngestionService.js';
export * from './catalog/voucherFreshnessService.js';

// Rules
export * from './rules/voucherRuleSchema.js';
export * from './rules/voucherRuleAuthoringService.js';
export * from './rules/voucherRuleValidator.js';
export * from './rules/voucherRuleCompiler.js';

// Overrides
export * from './overrides/voucherOverrideService.js';

// Evaluation
export * from './evaluation/voucherMatchExpectationModel.js';
export * from './evaluation/voucherMatchingEvaluator.js';
export * from './evaluation/voucherRankingQualityService.js';
export * from './evaluation/voucherQualityFeedbackLoop.js';

// Service
export * from './service/voucherCatalogService.js';

// API
export * from './api/types.js';
export * from './api/serializers.js';

// Source Adapters
export * from './catalog/sourceAdapters/voucherSourceAdapters.js';
export * from './catalog/sourceAdapters/manualCatalogAdapter.js';
export * from './catalog/sourceAdapters/importFileAdapter.js';

// Observability
export * from './observability/voucherDataMetrics.js';
export * from './observability/voucherDataEvents.js';
