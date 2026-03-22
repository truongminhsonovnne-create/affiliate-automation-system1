/**
 * Multi-Platform Foundation Module Exports
 */

// Types
export * from './types.js';

// Constants
export * from './constants.js';

// Contracts
export * from './contracts/index.js';

// Registry
export * from './registry/platformRegistryService.js';

// Capabilities
export * from './capabilities/platformCapabilityModel.js';
export * from './capabilities/platformCapabilityEvaluator.js';

// Readiness
export * from './readiness/platformReadinessEvaluator.js';
export * from './readiness/tiktokShopReadinessFramework.js';

// Backlog
export * from './backlog/platformExpansionBacklogService.js';

// Abstraction
export * from './abstraction/platformAdapterContracts.js';
export * from './abstraction/platformAdapterRegistry.js';
export * from './abstraction/shopeePlatformAdapters.js';
export * from './abstraction/tiktokShopPlaceholderAdapters.js';

// Mapping
export * from './mapping/platformDomainMapper.js';

// Integration
export * from './integration/voucherEnginePlatformIntegration.js';
export * from './integration/publicFlowPlatformIntegration.js';
export * from './integration/commercialPlatformIntegration.js';
export * from './integration/growthPlatformIntegration.js';

// Strategy
export * from './strategy/platformExpansionDecisionSupport.js';

// Repositories
export * from './repositories/platformRegistryRepository.js';
export * from './repositories/platformCapabilitySnapshotRepository.js';
export * from './repositories/platformReadinessReviewRepository.js';
export * from './repositories/platformExpansionBacklogRepository.js';
export * from './repositories/platformGovernanceAuditRepository.js';

// Service
export * from './service/multiPlatformFoundationService.js';

// API
export * from './api/types.js';
export * from './api/serializers.js';

// HTTP
export * from './http/routes/platformRegistryRoutes.js';
export * from './http/routes/platformReadinessRoutes.js';
export * from './http/routes/platformBacklogRoutes.js';
export * from './http/middleware/platformValidation.js';
export * from './http/middleware/platformErrorHandler.js';
export * from './http/serverIntegration.js';

// Observability
export * from './observability/platformMetrics.js';
export * from './observability/platformEvents.js';
