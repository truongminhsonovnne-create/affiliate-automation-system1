/**
 * TikTok Shop Preview Intelligence Index
 *
 * Main exports for TikTok Shop preview intelligence layer.
 */

// Types
export * from './types.js';

// Constants
export * from './constants.js';

// Event Model
export * from './events/tiktokPreviewEventModel.js';

// Event Recorder
export * from './events/tiktokPreviewEventRecorder.js';

// Funnel Aggregator
export * from './funnel/tiktokPreviewFunnelAggregator.js';

// Quality Evaluators
export * from './quality/tiktokPreviewUsefulnessEvaluator.js';
export * from './quality/tiktokPreviewStabilityEvaluator.js';

// Commercial Services
export * from './commercial/tiktokPreviewClickLineageService.js';
export * from './commercial/tiktokCommercialReadinessEvaluator.js';
export * from './commercial/tiktokMonetizationGuardrailEvaluator.js';

// Governance Services
export * from './governance/tiktokPreviewGovernanceService.js';
export * from './governance/tiktokMonetizationEnablementService.js';

// Integration Services
export * from './integration/publicPreviewIntegration.js';
export * from './integration/commercialIntelligenceIntegration.js';
export * from './integration/productGovernanceIntegration.js';
export * from './integration/founderCockpitIntegration.js';

// Main Service
export * from './service/tiktokPreviewIntelligenceService.js';

// Repositories (for advanced use cases)
export { tiktokPreviewSessionRepository } from './repositories/tiktokPreviewSessionRepository.js';
export { tiktokPreviewQualityReviewRepository, tiktokCommercialReadinessRepository } from './repositories/tiktokPreviewQualityReviewRepository.js';
export { tiktokPreviewClickLineageRepository } from './repositories/tiktokPreviewClickLineageRepository.js';
export { tiktokMonetizationGovernanceRepository, tiktokPreviewBacklogRepository } from './repositories/tiktokMonetizationGovernanceRepository.js';

// Observability
export * from './observability/tiktokPreviewMetrics.js';
export * from './observability/tiktokPreviewEvents.js';
