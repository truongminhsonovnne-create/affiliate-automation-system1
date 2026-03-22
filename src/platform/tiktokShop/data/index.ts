/**
 * TikTok Shop Data Acquisition Foundation - Public API
 * Exports all public types, services, and utilities
 */

// Types
export * from './types.js';

// Constants
export * from './constants.js';

// Contracts
export * from './contracts/tiktokShopDataSourceContracts.js';

// Sources
export * from './sources/tiktokShopManualSampleSource.js';
export * from './sources/tiktokShopImportFileSource.js';
export * from './sources/tiktokShopPlaceholderApiSource.js';

// Source Registry
export * from './sourceRegistry/tiktokShopSourceRegistry.js';

// Source Health
export * from './sourceHealth/tiktokShopSourceHealthService.js';

// Acquisition
export * from './acquisition/tiktokShopAcquisitionOrchestrator.js';

// Normalization
export * from './normalization/tiktokShopProductNormalizer.js';
export * from './normalization/tiktokShopPromotionSourceNormalizer.js';

// Enrichment
export * from './enrichment/tiktokShopContextEnrichmentService.js';
export * from './enrichment/tiktokShopEnrichmentQualityEvaluator.js';

// Promotions
export * from './promotions/tiktokShopPromotionSourceReadinessService.js';
export * from './promotions/tiktokShopPromotionAcquisitionGapAnalyzer.js';

// Freshness
export * from './freshness/tiktokShopDataFreshnessService.js';

// Readiness
export * from './readiness/tiktokShopDataReadinessEvaluator.js';
export * from './readiness/tiktokShopContextSupportMatrix.js';

// Backlog
export * from './backlog/tiktokShopDataBacklogService.js';

// Repositories
export * from './repositories/tiktokDataSourceRepository.js';
export * from './repositories/tiktokAcquisitionRunRepository.js';
export * from './repositories/tiktokProductSnapshotRepository.js';
export * from './repositories/tiktokContextEnrichmentRepository.js';
export * from './repositories/tiktokPromotionSourceRepository.js';
export * from './repositories/tiktokSourceReadinessRepository.js';
export * from './repositories/tiktokDataBacklogRepository.js';

// Integration
export * from './integration/tiktokShopDomainDataIntegration.js';
export * from './integration/tiktokShopPromotionCompatibilityIntegration.js';
export * from './integration/multiPlatformDataIntegration.js';

// Service
export * from './service/tiktokShopDataFoundationService.js';

// API
export * from './api/types.js';
export * from './api/serializers.js';

// Observability
export * from './observability/tiktokShopDataMetrics.js';
export * from './observability/tiktokShopDataEvents.js';
