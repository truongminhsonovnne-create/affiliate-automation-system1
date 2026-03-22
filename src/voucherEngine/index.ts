/**
 * Voucher Engine
 *
 * Production-grade voucher resolution engine for Affiliate Automation System.
 */

// Types & Constants
export * from './types';
export * from './constants';

// URL Parsing
export * from './url/urlParser';

// Product Reference
export * from './productReference/productReferenceResolver';

// Product Context
export * from './productContext/productContextLoader';

// Voucher Catalog
export * from './catalog/voucherCatalogLoader';

// Eligibility
export * from './eligibility/voucherEligibilityEvaluator';

// Ranking
export * from './ranking/voucherRankingEngine';

// Explainability
export * from './explainability/voucherExplanationBuilder';

// Caching
export * from './cache/voucherResolutionCache';

// Persistence
export * from './persistence/voucherResolutionPersistence';

// Repositories
export * from './repositories/voucherCatalogRepository';
export * from './repositories/voucherResolutionRequestRepository';
export * from './repositories/voucherResolutionResultRepository';
export * from './repositories/voucherCacheRepository';

// Service
export * from './service/voucherResolutionService';

// API
export * from './api/types';
export * from './api/serializers';

// HTTP Routes
export * from './http/routes/voucherResolutionRoutes';

// HTTP Middleware
export * from './http/middleware/voucherRequestValidation';
export * from './http/middleware/voucherErrorHandler';

// Server Integration
export * from './http/serverIntegration';

// Observability
export * from './observability/voucherEngineMetrics';
export * from './observability/voucherEngineEvents';
