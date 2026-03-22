/**
 * Growth Pages - Public API
 *
 * Export all public APIs from growth pages module
 */

// ============================================================================
// Types
// ============================================================================

export * from './types/index.js';

// ============================================================================
// Constants
// ============================================================================

export * from './constants/index.js';

// ============================================================================
// Routing
// ============================================================================

export * from './routing/growthSurfaceRoutes.js';

// ============================================================================
// Content Policy
// ============================================================================

export * from './content/growthSurfaceContentPolicy.js';

// ============================================================================
// SEO
// ============================================================================

export * from './seo/seoModelBuilder.js';
export * from './seo/structuredDataBuilder.js';

// ============================================================================
// Data Services
// ============================================================================

export * from './data/types.js';
export * from './data/shopLandingDataService.js';
export * from './data/categoryLandingDataService.js';
export * from './data/toolExplainerDataService.js';
export * from './data/relatedSurfaceResolver.js';
export * from './data/seoDataIntegration.js';
export * from './data/seoCandidateGenerator.js';

// ============================================================================
// Presentation
// ============================================================================

export * from './presentation/growthSurfacePresentation.js';

// ============================================================================
// Cache
// ============================================================================

export * from './cache/growthSurfaceCache.js';

// ============================================================================
// Analytics & Measurement
// ============================================================================

export * from './analytics/growthSurfaceAnalytics.js';
export * from './analytics/growthAttribution.js';
export * from './analytics/seoMeasurement.js';

// ============================================================================
// Navigation
// ============================================================================

export * from './navigation/growthNavigationModel.js';

// ============================================================================
// Policy
// ============================================================================

export * from './policy/indexabilityPolicy.js';
export * from './policy/contentFreshnessPolicy.js';
export * from './policy/contentQualityGuardrail.js';
export * from './policy/seoScoringPolicy.js';

// ============================================================================
// Observability
// ============================================================================

export * from './observability/growthSurfaceMetrics.js';
export * from './observability/growthSurfaceEvents.js';

// ============================================================================
// Configuration
// ============================================================================

import { GROWTH_PAGES_CONFIG } from './constants/index.js';
export { GROWTH_PAGES_CONFIG };
