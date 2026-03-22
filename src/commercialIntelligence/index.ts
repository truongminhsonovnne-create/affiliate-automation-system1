/**
 * Commercial Intelligence Layer
 *
 * Production-grade business intelligence, revenue attribution, and commercial performance governance.
 *
 * @package affiliate-automation-system
 * @version 1.0.0
 */

// ============================================================
// Core Types & Constants
// ============================================================

export * from './types.js';
export * from './constants.js';

// ============================================================
// Event Model & Recording
// ============================================================

export * from './events/commercialEventModel.js';
export * from './events/commercialEventRecorder.js';

// ============================================================
// Session Management
// ============================================================

export * from './session/commercialSessionResolver.js';

// ============================================================
// Attribution Services
// ============================================================

export * from './attribution/clickAttributionService.js';
export * from './attribution/conversionAttributionService.js';

// ============================================================
// Funnel & Metrics
// ============================================================

export * from './funnel/funnelAggregationService.js';
export * from './metrics/revenueQualityBalanceService.js';

// ============================================================
// Anomaly Detection
// ============================================================

export * from './anomalies/commercialAnomalyDetector.js';

// ============================================================
// Reports
// ============================================================

export * from './reports/commercialSummaryBuilder.js';
export * from './reports/revenueAttributionReportBuilder.js';

// ============================================================
// Governance
// ============================================================

export * from './governance/commercialGovernanceService.js';
export * from './governance/commercialGuardrailEvaluator.js';

// ============================================================
// Integration
// ============================================================

export * from './integration/experimentationCommercialIntegration.js';
export * from './integration/growthCommercialIntegration.js';
export * from './integration/productGovernanceCommercialIntegration.js';

// ============================================================
// Repositories
// ============================================================

export * from './repositories/commercialSessionRepository.js';
export * from './repositories/commercialEventRepository.js';
export * from './repositories/clickAttributionRepository.js';
export * from './repositories/conversionReportRepository.js';
export * from './repositories/commercialMetricSnapshotRepository.js';
export * from './repositories/commercialGovernanceReviewRepository.js';
export * from './repositories/commercialAnomalyRepository.js';

// ============================================================
// Service
// ============================================================

export * from './service/commercialIntelligenceService.js';

// ============================================================
// API
// ============================================================

export * from './api/types.js';
export * from './api/serializers.js';

// ============================================================
// Observability
// ============================================================

export * from './observability/commercialMetrics.js';
export * from './observability/commercialEvents.js';

// ============================================================
// Main Functions (Convenience Exports)
// ============================================================

// Event recording
export { recordCommercialEvent, recordCommercialFunnelStep, recordAffiliateClickAttribution, recordDownstreamCommercialOutcome } from './events/commercialEventRecorder.js';

// Session management
export { resolveCommercialSession, createCommercialSession, generateSessionKey } from './session/commercialSessionResolver.js';

// Attribution
export { createAffiliateClickAttribution, resolveClickAttribution, buildClickAttributionPayload } from './attribution/clickAttributionService.js';
export { attributeConversionReport, attributeRevenueToVoucherFlow, resolveAttributionConfidence } from './attribution/conversionAttributionService.js';

// Funnel & Metrics
export { aggregateCommercialFunnel, aggregateVoucherCommercialPerformance, aggregateGrowthSurfaceCommercialPerformance } from './funnel/funnelAggregationService.js';
export { evaluateRevenueQualityBalance, buildRevenueQualityBalanceResult, detectCommercialOptimizationRisk } from './metrics/revenueQualityBalanceService.js';

// Anomaly Detection
export { detectCommercialAnomalies } from './anomalies/commercialAnomalyDetector.js';

// Reports
export { buildCommercialPerformanceSummary, buildCommercialTrendSummary } from './reports/commercialSummaryBuilder.js';
export { buildRevenueAttributionReport, buildVoucherAttributionReport, buildSurfaceAttributionReport } from './reports/revenueAttributionReportBuilder.js';

// Governance
export { runCommercialGovernanceReview } from './governance/commercialGovernanceService.js';
export { evaluateCommercialGuardrails, detectCommercialGuardrailBreaches } from './governance/commercialGuardrailEvaluator.js';

// Main Service
export { runCommercialAttributionCycle, buildCommercialPerformanceReport, runCommercialGovernanceCycle } from './service/commercialIntelligenceService.js';
