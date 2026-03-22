/**
 * Platform Resolution Index
 *
 * Main exports for platform resolution system.
 */

// Types
export * from './types.js';

// Constants
export * from './constants.js';

// Repository
export { PlatformResolutionGateRepository, platformResolutionGateRepository } from './repository/platformResolutionGateRepository.js';

// Services
export { PlatformGateEvaluationService, platformGateEvaluationService } from './service/platformGateEvaluationService.js';
export { MultiPlatformPublicFlowService, multiPlatformPublicFlowService } from './service/multiPlatformPublicFlowService.js';
export { PlatformEnablementGovernanceService, platformEnablementGovernanceService } from './service/platformEnablementGovernanceService.js';
