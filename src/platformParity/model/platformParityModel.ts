/**
 * Platform Parity Model
 * Core domain logic for modeling parity between platforms
 */

import type {
  PlatformKey,
  PlatformParityGap,
  PlatformParityGapArea,
  PlatformParityGapSeverity,
  PlatformParityLevel,
  PlatformParityScope,
  PlatformExceptionRecord,
  ParitySummary,
  PlatformCapabilityMatrix,
  CrossPlatformMetricComparison,
} from '../types.js';

import {
  PlatformParityLevel as Level,
  PlatformParityGapSeverity as Severity,
} from '../types.js';

import {
  FULL_PARITY_THRESHOLD,
  OPERATIONAL_PARITY_THRESHOLD,
  REPORTING_PARITY_THRESHOLD,
  GOVERNANCE_PARITY_THRESHOLD,
  PARTIAL_PARITY_THRESHOLD,
  SEVERITY_TO_PRIORITY_SCORE,
} from '../constants.js';

/**
 * Platform Parity Model Input
 */
export interface PlatformParityModelInput {
  shopeeCapabilities: Record<PlatformParityScope, PlatformParityLevel>;
  tiktokCapabilities: Record<PlatformParityScope, PlatformParityLevel>;
  openGaps: PlatformParityGap[];
  activeExceptions: PlatformExceptionRecord[];
  crossPlatformMetrics: CrossPlatformMetricComparison[];
}

/**
 * Platform Parity Model Result
 */
export interface PlatformParityModelResult {
  modelId: string;
  overallParityLevel: PlatformParityLevel;
  scopeModels: Record<PlatformParityScope, ScopeParityModel>;
  gapAnalysis: GapAnalysis;
  exceptionAnalysis: ExceptionAnalysis;
  driftAnalysis: DriftAnalysis;
  generatedAt: Date;
}

/**
 * Scope-level parity model
 */
export interface ScopeParityModel {
  scope: PlatformParityScope;
  shopeeLevel: PlatformParityLevel;
  tiktokLevel: PlatformParityLevel;
  calculatedLevel: PlatformParityLevel;
  isAcceptable: boolean;
  gapCount: number;
  exceptionCount: number;
  driftCount: number;
  factors: ParityFactor[];
}

/**
 * Factor contributing to parity calculation
 */
export interface ParityFactor {
  factorType: 'capability' | 'gap' | 'exception' | 'drift';
  contribution: number; // -1 to 1
  description: string;
}

/**
 * Gap analysis result
 */
export interface GapAnalysis {
  totalGaps: number;
  criticalGaps: number;
  highGaps: number;
  mediumGaps: number;
  lowGaps: number;
  gapsByArea: Record<PlatformParityGapArea, number>;
  gapsByPlatform: Record<PlatformKey, number>;
  unresolvedGapsOlderThan7Days: PlatformParityGap[];
}

/**
 * Exception analysis result
 */
export interface ExceptionAnalysis {
  totalExceptions: number;
  activeExceptions: number;
  exceptionsByArea: Record<PlatformParityGapArea, number>;
  exceptionsByPlatform: Record<PlatformKey, number>;
  exceptionsNeedingReview: PlatformExceptionRecord[];
}

/**
 * Drift analysis result
 */
export interface DriftAnalysis {
  totalMetrics: number;
  driftingMetrics: number;
  driftPercentage: number;
  significantDrifts: CrossPlatformMetricComparison[];
  driftsByScope: Record<PlatformParityScope, number>;
}

/**
 * Build platform parity model from inputs
 */
export function buildPlatformParityModel(input: PlatformParityModelInput): PlatformParityModelResult {
  const {
    shopeeCapabilities,
    tiktokCapabilities,
    openGaps,
    activeExceptions,
    crossPlatformMetrics,
  } = input;

  // Build scope-level models
  const scopeModels = buildScopeModels(
    shopeeCapabilities,
    tiktokCapabilities,
    openGaps,
    activeExceptions,
    crossPlatformMetrics
  );

  // Analyze gaps
  const gapAnalysis = analyzeGaps(openGaps);

  // Analyze exceptions
  const exceptionAnalysis = analyzeExceptions(activeExceptions);

  // Analyze drift
  const driftAnalysis = analyzeDrift(crossPlatformMetrics);

  // Calculate overall parity level
  const overallParityLevel = calculateOverallParityLevel(scopeModels, gapAnalysis, driftAnalysis);

  return {
    modelId: generateModelId(),
    overallParityLevel,
    scopeModels,
    gapAnalysis,
    exceptionAnalysis,
    driftAnalysis,
    generatedAt: new Date(),
  };
}

/**
 * Build scope-level models for each parity scope
 */
function buildScopeModels(
  shopeeCapabilities: Record<PlatformParityScope, PlatformParityLevel>,
  tiktokCapabilities: Record<PlatformParityScope, PlatformParityLevel>,
  gaps: PlatformParityGap[],
  exceptions: PlatformExceptionRecord[],
  metrics: CrossPlatformMetricComparison[]
): Record<PlatformParityScope, ScopeParityModel> {
  const scopes = Object.values(shopeeCapabilities).map((_, key) => key as PlatformParityScope);

  const result: Partial<Record<PlatformParityScope, ScopeParityModel>> = {};

  for (const scope of scopes) {
    const shopeeLevel = shopeeCapabilities[scope] ?? Level.UNKNOWN;
    const tiktokLevel = tiktokCapabilities[scope] ?? Level.UNKNOWN;

    // Calculate factors
    const factors: ParityFactor[] = [];

    // Capability factor
    const capabilityFactor = calculateCapabilityFactor(shopeeLevel, tiktokLevel);
    factors.push({
      factorType: 'capability',
      contribution: capabilityFactor,
      description: `Shopee: ${shopeeLevel}, TikTok: ${tiktokLevel}`,
    });

    // Gap factor
    const scopeGaps = gaps.filter((g) => g.gapArea === scope || isGapAreaInScope(g.gapArea, scope));
    const gapFactor = calculateGapFactor(scopeGaps);
    if (scopeGaps.length > 0) {
      factors.push({
        factorType: 'gap',
        contribution: gapFactor,
        description: `${scopeGaps.length} open gaps in scope`,
      });
    }

    // Exception factor
    const scopeExceptions = exceptions.filter(
      (e) => e.exceptionArea === scope || isExceptionAreaInScope(e.exceptionArea, scope)
    );
    const exceptionFactor = calculateExceptionFactor(scopeExceptions);
    if (scopeExceptions.length > 0) {
      factors.push({
        factorType: 'exception',
        contribution: exceptionFactor,
        description: `${scopeExceptions.length} active exceptions in scope`,
      });
    }

    // Drift factor
    const scopeMetrics = metrics.filter((m) => isMetricInScope(m.metricKey, scope));
    const driftFactor = calculateDriftFactor(scopeMetrics);
    if (scopeMetrics.some((m) => m.isDrift)) {
      factors.push({
        factorType: 'drift',
        contribution: driftFactor,
        description: `${scopeMetrics.filter((m) => m.isDrift).length} drifting metrics`,
      });
    }

    // Calculate level
    const calculatedLevel = classifyPlatformParityLevel(
      shopeeLevel,
      tiktokLevel,
      scopeGaps.length,
      scopeExceptions.length,
      scopeMetrics.filter((m) => m.isDrift).length
    );

    // Determine if acceptable
    const isAcceptable = isParityAcceptableForScope(calculatedLevel, scope);

    result[scope] = {
      scope,
      shopeeLevel,
      tiktokLevel,
      calculatedLevel,
      isAcceptable,
      gapCount: scopeGaps.length,
      exceptionCount: scopeExceptions.length,
      driftCount: scopeMetrics.filter((m) => m.isDrift).length,
      factors,
    };
  }

  return result as Record<PlatformParityScope, ScopeParityModel>;
}

/**
 * Analyze gaps
 */
function analyzeGaps(gaps: PlatformParityGap[]): GapAnalysis {
  const gapsByArea = {} as Record<PlatformParityGapArea, number>;
  const gapsByPlatform = {} as Record<PlatformKey, number>;
  const unresolvedGapsOlderThan7Days: PlatformParityGap[] = [];

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  for (const gap of gaps) {
    // Count by area
    gapsByArea[gap.gapArea] = (gapsByArea[gap.gapArea] ?? 0) + 1;

    // Count by platform
    gapsByPlatform[gap.platformKey] = (gapsByPlatform[gap.platformKey] ?? 0) + 1;

    // Check for unresolved gaps older than 7 days
    if (gap.createdAt < sevenDaysAgo && !gap.resolvedAt) {
      unresolvedGapsOlderThan7Days.push(gap);
    }
  }

  return {
    totalGaps: gaps.length,
    criticalGaps: gaps.filter((g) => g.severity === Severity.CRITICAL).length,
    highGaps: gaps.filter((g) => g.severity === Severity.HIGH).length,
    mediumGaps: gaps.filter((g) => g.severity === Severity.MEDIUM).length,
    lowGaps: gaps.filter((g) => g.severity === Severity.LOW).length,
    gapsByArea,
    gapsByPlatform,
    unresolvedGapsOlderThan7Days,
  };
}

/**
 * Analyze exceptions
 */
function analyzeExceptions(exceptions: PlatformExceptionRecord[]): ExceptionAnalysis {
  const exceptionsByArea = {} as Record<PlatformParityGapArea, number>;
  const exceptionsByPlatform = {} as Record<PlatformKey, number>;
  const exceptionsNeedingReview: PlatformExceptionRecord[] = [];

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  for (const exception of exceptions) {
    // Count by area
    exceptionsByArea[exception.exceptionArea] = (exceptionsByArea[exception.exceptionArea] ?? 0) + 1;

    // Count by platform
    exceptionsByPlatform[exception.platformKey] = (exceptionsByPlatform[exception.platformKey] ?? 0) + 1;

    // Check for exceptions needing review
    if (exception.createdAt < ninetyDaysAgo && exception.exceptionStatus === 'active') {
      exceptionsNeedingReview.push(exception);
    }
  }

  return {
    totalExceptions: exceptions.length,
    activeExceptions: exceptions.filter((e) => e.exceptionStatus === 'active').length,
    exceptionsByArea,
    exceptionsByPlatform,
    exceptionsNeedingReview,
  };
}

/**
 * Analyze drift
 */
function analyzeDrift(metrics: CrossPlatformMetricComparison[]): DriftAnalysis {
  const driftsByScope = {} as Record<PlatformParityScope, number>;
  const significantDrifts: CrossPlatformMetricComparison[] = [];

  for (const metric of metrics) {
    if (metric.isDrift) {
      significantDrifts.push(metric);

      // Determine scope (simplified - would need proper mapping in production)
      const scope = inferScopeFromMetric(metric.metricKey);
      driftsByScope[scope] = (driftsByScope[scope] ?? 0) + 1;
    }
  }

  return {
    totalMetrics: metrics.length,
    driftingMetrics: significantDrifts.length,
    driftPercentage: metrics.length > 0 ? significantDrifts.length / metrics.length : 0,
    significantDrifts,
    driftsByScope,
  };
}

/**
 * Calculate overall parity level from scope models
 */
function calculateOverallParityLevel(
  scopeModels: Record<PlatformParityScope, ScopeParityModel>,
  gapAnalysis: GapAnalysis,
  driftAnalysis: DriftAnalysis
): PlatformParityLevel {
  // Count non-acceptable scopes
  const nonAcceptableCount = Object.values(scopeModels).filter((m) => !m.isAcceptable).length;
  const totalScopes = Object.keys(scopeModels).length;
  const acceptableRatio = 1 - nonAcceptableCount / totalScopes;

  // Check for critical issues
  const hasCriticalGaps = gapAnalysis.criticalGaps > 0;
  const hasHighDrift = driftAnalysis.driftPercentage > 0.3;

  // Determine level based on analysis
  if (hasCriticalGaps) {
    return Level.HARDENING_REQUIRED;
  }

  if (hasHighDrift && acceptableRatio < 0.5) {
    return Level.HARDENING_REQUIRED;
  }

  if (acceptableRatio >= FULL_PARITY_THRESHOLD && gapAnalysis.totalGaps === 0) {
    return Level.FULL_PARITY;
  }

  if (acceptableRatio >= OPERATIONAL_PARITY_THRESHOLD && gapAnalysis.highGaps === 0) {
    return Level.OPERATIONAL_PARITY;
  }

  if (acceptableRatio >= REPORTING_PARITY_THRESHOLD) {
    return Level.REPORTING_PARITY;
  }

  if (acceptableRatio >= GOVERNANCE_PARITY_THRESHOLD) {
    return Level.GOVERNANCE_PARITY;
  }

  return Level.PARTIAL_PARITY;
}

/**
 * Classify platform parity level based on inputs
 */
export function classifyPlatformParityLevel(
  shopeeLevel: PlatformParityLevel,
  tiktokLevel: PlatformParityLevel,
  gapCount: number,
  exceptionCount: number,
  driftCount: number
): PlatformParityLevel {
  // If both are full parity and no issues
  if (
    shopeeLevel === Level.FULL_PARITY &&
    tiktokLevel === Level.FULL_PARITY &&
    gapCount === 0 &&
    driftCount === 0
  ) {
    return Level.FULL_PARITY;
  }

  // If both are at least operational and limited issues
  if (
    isAtLeastOperational(shopeeLevel) &&
    isAtLeastOperational(tiktokLevel) &&
    gapCount <= 2 &&
    driftCount <= 1
  ) {
    return Level.OPERATIONAL_PARITY;
  }

  // If both are at least reporting and moderate issues
  if (
    isAtLeastReporting(shopeeLevel) &&
    isAtLeastReporting(tiktokLevel) &&
    gapCount <= 5
  ) {
    return Level.REPORTING_PARITY;
  }

  // If governance level achievable
  if (isAtLeastGovernance(shopeeLevel) && isAtLeastGovernance(tiktokLevel)) {
    return Level.GOVERNANCE_PARITY;
  }

  // If there are many exceptions, might be allowed
  if (exceptionCount > 3 && gapCount <= 3) {
    return Level.EXCEPTION_ALLOWED;
  }

  // Otherwise partial
  return Level.PARTIAL_PARITY;
}

/**
 * Check if parity level is at least operational
 */
function isAtLeastOperational(level: PlatformParityLevel): boolean {
  return (
    level === Level.FULL_PARITY ||
    level === Level.OPERATIONAL_PARITY ||
    level === Level.REPORTING_PARITY ||
    level === Level.GOVERNANCE_PARITY ||
    level === Level.PARTIAL_PARITY
  );
}

/**
 * Check if parity level is at least reporting
 */
function isAtLeastReporting(level: PlatformParityLevel): boolean {
  return (
    level === Level.FULL_PARITY ||
    level === Level.OPERATIONAL_PARITY ||
    level === Level.REPORTING_PARITY ||
    level === Level.GOVERNANCE_PARITY ||
    level === Level.PARTIAL_PARITY
  );
}

/**
 * Check if parity level is at least governance
 */
function isAtLeastGovernance(level: PlatformParityLevel): boolean {
  return (
    level === Level.FULL_PARITY ||
    level === Level.OPERATIONAL_PARITY ||
    level === Level.REPORTING_PARITY ||
    level === Level.GOVERNANCE_PARITY ||
    level === Level.PARTIAL_PARITY
  );
}

/**
 * Calculate capability factor (-1 to 1)
 */
function calculateCapabilityFactor(
  shopeeLevel: PlatformParityLevel,
  tiktokLevel: PlatformParityLevel
): number {
  const levelValues: Record<PlatformParityLevel, number> = {
    [Level.FULL_PARITY]: 1,
    [Level.OPERATIONAL_PARITY]: 0.75,
    [Level.REPORTING_PARITY]: 0.5,
    [Level.GOVERNANCE_PARITY]: 0.4,
    [Level.PARTIAL_PARITY]: 0.25,
    [Level.PLATFORM_SPECIFIC]: 0,
    [Level.EXCEPTION_ALLOWED]: 0.1,
    [Level.HARDENING_REQUIRED]: -0.5,
    [Level.UNKNOWN]: -0.25,
  };

  const shopeeValue = levelValues[shopeeLevel] ?? 0;
  const tiktokValue = levelValues[tiktokLevel] ?? 0;

  return (shopeeValue + tiktokValue) / 2;
}

/**
 * Calculate gap factor (-1 to 0)
 */
function calculateGapFactor(gaps: PlatformParityGap[]): number {
  if (gaps.length === 0) return 0;

  const severityScores = gaps.map((g) => SEVERITY_TO_PRIORITY_SCORE[g.severity] ?? 0);
  const avgScore = severityScores.reduce((a, b) => a + b, 0) / severityScores.length;

  return -Math.min(avgScore / 100, 1);
}

/**
 * Calculate exception factor (0 to 0.5)
 */
function calculateExceptionFactor(exceptions: PlatformExceptionRecord[]): number {
  if (exceptions.length === 0) return 0;

  // Active exceptions reduce parity but are intentional
  const activeRatio = exceptions.filter((e) => e.exceptionStatus === 'active').length / exceptions.length;

  return Math.min(activeRatio * 0.5, 0.5);
}

/**
 * Calculate drift factor (-1 to 0)
 */
function calculateDriftFactor(metrics: CrossPlatformMetricComparison[]): number {
  if (metrics.length === 0) return 0;

  const driftingCount = metrics.filter((m) => m.isDrift).length;
  const driftRatio = driftingCount / metrics.length;

  return -Math.min(driftRatio, 1);
}

/**
 * Check if parity is acceptable for a given scope
 */
export function isPlatformParityAcceptable(
  level: PlatformParityLevel,
  scope: PlatformParityScope
): boolean {
  const minAcceptableLevel = getMinimumAcceptableLevel(scope);
  return isAtLeast(level, minAcceptableLevel);
}

/**
 * Check if parity is acceptable for scope (internal)
 */
function isParityAcceptableForScope(level: PlatformParityLevel, scope: PlatformParityScope): boolean {
  return isPlatformParityAcceptable(level, scope);
}

/**
 * Get minimum acceptable level for a scope
 */
function getMinimumAcceptableLevel(scope: PlatformParityScope): PlatformParityLevel {
  switch (scope) {
    case 'operational':
    case 'technical':
      return Level.OPERATIONAL_PARITY;
    case 'commercial':
    case 'product_ops':
      return Level.OPERATIONAL_PARITY;
    case 'bi_analytics':
    case 'governance':
    case 'discovery':
    case 'detail':
    case 'enrichment':
      return Level.REPORTING_PARITY;
    case 'consumer_experience':
    case 'publishing':
      return Level.GOVERNANCE_PARITY;
    default:
      return Level.REPORTING_PARITY;
  }
}

/**
 * Check if level1 is at least level2
 */
function isAtLeast(level1: PlatformParityLevel, level2: PlatformParityLevel): boolean {
  const levelOrder: PlatformParityLevel[] = [
    Level.FULL_PARITY,
    Level.OPERATIONAL_PARITY,
    Level.REPORTING_PARITY,
    Level.GOVERNANCE_PARITY,
    Level.EXCEPTION_ALLOWED,
    Level.PARTIAL_PARITY,
    Level.PLATFORM_SPECIFIC,
    Level.HARDENING_REQUIRED,
    Level.UNKNOWN,
  ];

  return levelOrder.indexOf(level1) <= levelOrder.indexOf(level2);
}

/**
 * Build platform parity summary
 */
export function buildPlatformParitySummary(model: PlatformParityModelResult): ParitySummary {
  const scopeSummaries: ParitySummary['scopeSummaries'] = {} as ParitySummary['scopeSummaries'];

  for (const [scope, scopeModel] of Object.entries(model.scopeModels)) {
    scopeSummaries[scope as PlatformParityScope] = {
      level: scopeModel.calculatedLevel,
      isAcceptable: scopeModel.isAcceptable,
      gapCount: scopeModel.gapCount,
      exceptionCount: scopeModel.exceptionCount,
    };
  }

  return {
    overallLevel: model.overallParityLevel,
    scopeSummaries,
    totalGaps: model.gapAnalysis.totalGaps,
    totalExceptions: model.exceptionAnalysis.totalExceptions,
    criticalGaps: model.gapAnalysis.criticalGaps,
  };
}

/**
 * Build platform capability matrix
 */
export function buildPlatformCapabilityMatrix(
  shopeeCapabilities: Record<PlatformParityScope, PlatformParityLevel>,
  tiktokCapabilities: Record<PlatformParityScope, PlatformParityLevel>
): PlatformCapabilityMatrix[] {
  return [
    {
      platform: 'shopee' as PlatformKey,
      capabilities: shopeeCapabilities,
      lastUpdated: new Date(),
    },
    {
      platform: 'tiktok_shop' as PlatformKey,
      capabilities: tiktokCapabilities,
      lastUpdated: new Date(),
    },
  ];
}

// Helper functions
function generateModelId(): string {
  return `ppm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function isGapAreaInScope(gapArea: PlatformParityGapArea, scope: PlatformParityScope): boolean {
  const areaToScopeMap: Partial<Record<PlatformParityGapArea, PlatformParityScope[]>> = {
    product_discovery: ['discovery', 'product_ops'],
    product_detail_extraction: ['detail', 'product_ops'],
    ai_enrichment: ['enrichment', 'product_ops'],
    data_quality: ['operational', 'technical'],
    publishing_workflow: ['publishing'],
    consumer_flow: ['consumer_experience'],
    public_link_resolution: ['consumer_experience'],
    conversion_tracking: ['commercial'],
    platform_policies: ['governance'],
    governance_process: ['governance'],
    release_readiness: ['governance'],
    enablement_decision: ['governance'],
    commercial_attribution: ['commercial', 'bi_analytics'],
    growth_analytics: ['bi_analytics', 'growth'],
    founder_cockpit: ['bi_analytics'],
    executive_reporting: ['bi_analytics'],
    operator_dashboard: ['bi_analytics', 'operational'],
    backlog_management: ['governance'],
    quality_gate: ['operational'],
    error_handling: ['operational', 'technical'],
    observability: ['technical'],
    security: ['technical'],
    crawler_infrastructure: ['operational', 'technical'],
  };

  const scopes = areaToScopeMap[gapArea] ?? [];
  return scopes.includes(scope);
}

function isExceptionAreaInScope(exceptionArea: PlatformParityGapArea, scope: PlatformParityScope): boolean {
  return isGapAreaInScope(exceptionArea, scope);
}

function isMetricInScope(metricKey: string, scope: PlatformParityScope): boolean {
  // Simplified - would need proper mapping
  const operationalMetrics = ['totalProducts', 'activeProducts', 'errorRate', 'crawlSuccessRate'];
  const commercialMetrics = ['totalRevenue', 'conversionRate', 'avgOrderValue', 'attributedSales'];
  const discoveryMetrics = ['discoveredProducts', 'discoverySuccessRate', 'uniqueProductsFound'];
  const detailMetrics = ['detailExtractionSuccess', 'mediaQualityScore', 'attributeCompleteness'];
  const enrichmentMetrics = ['enrichmentSuccessRate', 'aiProcessingTime', 'enrichmentQualityScore'];
  const governanceMetrics = ['releaseReadinessScore', 'enablementRiskScore', 'backlogCount', 'governanceCompliance'];

  if (operationalMetrics.includes(metricKey)) return scope === 'operational' || scope === 'product_ops';
  if (commercialMetrics.includes(metricKey)) return scope === 'commercial' || scope === 'bi_analytics';
  if (discoveryMetrics.includes(metricKey)) return scope === 'discovery' || scope === 'product_ops';
  if (detailMetrics.includes(metricKey)) return scope === 'detail' || scope === 'product_ops';
  if (enrichmentMetrics.includes(metricKey)) return scope === 'enrichment' || scope === 'product_ops';
  if (governanceMetrics.includes(metricKey)) return scope === 'governance' || scope === 'bi_analytics';

  return false;
}

function inferScopeFromMetric(metricKey: string): PlatformParityScope {
  if (isMetricInScope(metricKey, 'operational')) return 'operational';
  if (isMetricInScope(metricKey, 'commercial')) return 'commercial';
  if (isMetricInScope(metricKey, 'discovery')) return 'discovery';
  if (isMetricInScope(metricKey, 'detail')) return 'detail';
  if (isMetricInScope(metricKey, 'enrichment')) return 'enrichment';
  if (isMetricInScope(metricKey, 'governance')) return 'governance';
  return 'technical';
}
