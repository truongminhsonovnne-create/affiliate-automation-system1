/**
 * Business Intelligence Layer
 *
 * Production-grade BI layer for executive scorecards, operator surfaces, and strategic decision support.
 */

// Core Types & Constants
export * from './types.js';
export * from './constants.js';

// Registry
export * from './registry/metricDefinitionRegistry.js';

// Scorecards
export * from './scorecards/executiveScorecardBuilder.js';
export * from './scorecards/scorecardScoringService.js';

// Operator BI
export * from './operator/operatorBiViewBuilder.js';
export * from './operator/operatorBiFilters.js';

// Trends
export * from './trends/trendAnalysisService.js';

// Insights
export * from './insights/insightAggregationService.js';

// Alerts
export * from './alerts/biAlertService.js';

// Decision Support
export * from './decisionSupport/strategicDecisionSupportService.js';
export * from './decisionSupport/recommendationScorer.js';
export * from './decisionSupport/recommendationExplainability.js';

// Integration
export * from './integration/growthBiIntegration.js';
export * from './integration/commercialBiIntegration.js';
export * from './integration/productGovernanceBiIntegration.js';
export * from './integration/productOpsBiIntegration.js';

// Repositories
export * from './repositories/scorecardSnapshotRepository.js';
export * from './repositories/operatorBiViewRepository.js';
export * from './repositories/strategicDecisionSupportRepository.js';
export * from './repositories/metricDefinitionRepository.js';
export * from './repositories/biAlertSignalRepository.js';

// Service
export * from './service/businessIntelligenceService.js';

// API
export * from './api/types.js';
export * from './api/serializers.js';

// Observability
export * from './observability/biMetrics.js';
export * from './observability/biEvents.js';
