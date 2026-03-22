/**
 * Dashboard Module
 *
 * Production-grade dashboard backend layer for the Affiliate Automation System.
 * Provides read-optimized models, query services, and HTTP routes for admin dashboard.
 */

// =============================================================================
// TYPES
// =============================================================================

export * from './types.js';

// =============================================================================
// CONSTANTS
// =============================================================================

export * from './constants.js';

// =============================================================================
// CONTRACTS
// =============================================================================

export * from './contracts.js';

// =============================================================================
// FILTERS
// =============================================================================

export * from './filters/schemas.js';

// =============================================================================
// QUERY
// =============================================================================

export * from './query/queryBuilder.js';
export * from './query/cache.js';

// =============================================================================
// READ MODELS
// =============================================================================

export * from './readModels/overviewReadModel.js';
export * from './readModels/activityFeedReadModel.js';
export * from './readModels/productsReadModel.js';
export * from './readModels/crawlJobsReadModel.js';
export * from './readModels/publishJobsReadModel.js';
export * from './readModels/aiContentReadModel.js';
export * from './readModels/deadLetterReadModel.js';
export * from './readModels/workersReadModel.js';
export * from './readModels/failureInsightsReadModel.js';
export * from './readModels/trendsReadModel.js';

// =============================================================================
// SERVICES
// =============================================================================

export * from './services/dashboardOverviewService.js';
export * from './services/dashboardProductsService.js';
export * from './services/dashboardCrawlJobsService.js';
export * from './services/dashboardPublishJobsService.js';
export * from './services/dashboardAiContentService.js';
export { getDashboardActivityFeed } from './services/dashboardOperationsService.js';

// =============================================================================
// HTTP
// =============================================================================

export { default as dashboardRouter } from './http/router.js';
export * from './http/serverIntegration.js';
export * from './http/middleware/queryValidation.js';
export * from './http/middleware/dashboardErrorHandler.js';
