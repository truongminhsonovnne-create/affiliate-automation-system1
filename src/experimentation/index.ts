/**
 * Experimentation - Public API
 */

// Types and constants
export * from './types/index.js';
export * from './constants/index.js';

// Assignment
export * from './assignment/assignmentStrategy.js';
export * from './assignment/subjectIdentityResolver.js';

// Targeting
export * from './targeting/targetingRuleEvaluator.js';

// Registry
export { getExperimentByKey, getActiveExperiments, clearRegistry as clearExperimentRegistry, registerExperiment, unregisterExperiment, resolveExperimentsForSurface, validateExperimentRegistry } from './registry/experimentRegistry.js';

// GuardrailViolation is defined in types - handle the re-export conflict
export { GuardrailViolation as ExperimentGuardrailViolation } from './types/index.js';
export { GuardrailViolation } from './rollout/guardrailEvaluator.js';

// Exposure
export * from './exposure/exposureRecorder.js';

// Outcomes
export * from './outcomes/outcomeRecorder.js';

// Controls
export { getTuningControl, resolveTuningControlValue, getAllActiveTuningControls, clearRegistry as clearTuningControlRegistry, registerTuningControl } from './controls/tuningControlRegistry.js';
export * from './controls/tuningControlEvaluator.js';
export * from './controls/tuningControlValidator.js';

// Rollout
export * from './rollout/rolloutPolicy.js';
export * from './rollout/guardrailEvaluator.js';
export * from './rollout/killSwitchService.js';

// Analysis
export * from './analysis/experimentAnalysisService.js';
export * from './analysis/variantComparison.js';
export * from './analysis/experimentDecisionSupport.js';

// Repositories
export * from './repositories/experimentRepository.js';

// Service
export * from './service/experimentationService.js';
