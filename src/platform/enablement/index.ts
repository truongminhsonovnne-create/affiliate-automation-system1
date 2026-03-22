/**
 * Platform Production Candidate & Enablement System
 *
 * Production-grade decision system for multi-platform production enablement.
 */

// Types
export * from './types/index.js';

// Constants
export * from './constants.js';

// Evidence Collection
export * from './evidence/platformEvidenceCollector.js';
export * from './evidence/platformEvidenceNormalizer.js';

// Readiness Evaluation
export * from './readiness/productionCandidateEvaluator.js';
export * from './readiness/blockerClassifier.js';
export * from './readiness/conditionBuilder.js';

// Repositories
export * from './repositories/platformCandidateReviewRepository.js';
export * from './repositories/platformEnablementDecisionRepository.js';
export * from './repositories/platformEnablementConditionRepository.js';
export * from './repositories/platformEnablementBlockerRepository.js';
export * from './repositories/platformEnablementAuditRepository.js';

// Service
export * from './service/platformEnablementService.js';

// Review Pack Builder
export * from './review/platformCandidateReviewPackBuilder.js';
export * from './review/platformDecisionExplainability.js';

// Integrations
export * from './integration/tiktokCandidateIntegration.js';
export * from './integration/releaseReadinessIntegration.js';
export * from './integration/productGovernanceIntegration.js';
