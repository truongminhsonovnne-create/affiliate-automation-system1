/**
 * Platform Parity Hardening Layer - Public API
 * Multi-platform parity management for Shopee and TikTok Shop
 */

// Types
export * from './types.js';

// Constants
export * from './constants.js';

// Model
export * from './model/platformParityModel.js';

// Gaps
export * from './gaps/platformParityGapDetector.js';
export { getExceptionById } from './gaps/platformExceptionService.js';

// Comparison
export * from './comparison/crossPlatformComparisonService.js';

// Unified Views
export * from './unifiedViews/unifiedOpsViewBuilder.js';
export * from './unifiedViews/unifiedBiSurfaceBuilder.js';
export type { GovernanceInput } from './unifiedViews/unifiedGovernanceSurfaceBuilder.js';

// Decision Support
export * from './decisionSupport/parityDecisionSupportService.js';
export * from './decisionSupport/parityRecommendationScorer.js';

// Integration
export * from './integration/productOpsParityIntegration.js';
export * from './integration/biParityIntegration.js';
export * from './integration/governanceParityIntegration.js';
export * from './integration/publicFlowParityIntegration.js';

// Backlog
export * from './backlog/parityBacklogService.js';

// Repositories
export * from './repositories/platformParitySnapshotRepository.js';
export * from './repositories/platformParityGapRepository.js';
export * from './repositories/unifiedOpsViewRepository.js';
export * from './repositories/platformExceptionRepository.js';
export * from './repositories/unifiedSurfaceAuditRepository.js';

// Service
export * from './service/platformParityHardeningService.js';

// API
export * from './api/types.js';
export * from './api/serializers.js';

// HTTP (for server integration)
export { mountPlatformParityRoutes, getPlatformParityRoutes } from './http/serverIntegration.js';

// Observability
export * from './observability/platformParityMetrics.js';
export * from './observability/platformParityEvents.js';

// Default configuration
export const DEFAULT_CONFIG = {
  snapshotWindowHours: 24,
  snapshotRetentionDays: 90,
  exceptionReviewWindowDays: 90,
  gapEscalationHours: {
    critical: 24,
    high: 72,
    medium: 168,
    low: 336,
  },
  driftThresholds: {
    quality: 0.15,
    commercial: 0.25,
    operational: 0.20,
    governance: 0.30,
  },
} as const;
