/**
 * Parity Decision Support Service
 * Core decision support for parity hardening
 */

import type {
  PlatformKey,
  PlatformParityGap,
  PlatformParityGapArea,
  PlatformParityGapSeverity,
  PlatformParityScope,
  PlatformParityLevel,
  PlatformExceptionRecord,
  ParityHardeningRecommendation,
  ParityHardeningDecisionSupport,
  CrossPlatformMetricComparison,
} from '../types.js';

import { PlatformParityLevel as Level } from '../types.js';
import {
  CRITICAL_GAP_ESCALATION_MS,
  HIGH_GAP_ESCALATION_MS,
  MEDIUM_GAP_ESCALATION_MS,
  BACKLOG_CRITICAL_THRESHOLD,
  BACKLOG_HIGH_THRESHOLD,
} from '../constants.js';

export interface DecisionSupportInput {
  currentParityLevel: PlatformParityLevel;
  openGaps: PlatformParityGap[];
  activeExceptions: PlatformExceptionRecord[];
  crossPlatformMetrics: CrossPlatformMetricComparison[];
  platformCapabilities: Record<PlatformKey, Record<PlatformParityScope, PlatformParityLevel>>;
  snapshotWindow: { start: Date; end: Date };
}

export interface UnificationVsExceptionDecision {
  area: PlatformParityGapArea;
  recommendation: 'unify' | 'maintain_exception' | 'evaluate_further';
  rationale: string;
  affectedPlatforms: PlatformKey[];
}

/**
 * Build parity decision support report
 */
export async function buildParityDecisionSupport(
  input: DecisionSupportInput
): Promise<ParityHardeningDecisionSupport> {
  const {
    currentParityLevel,
    openGaps,
    activeExceptions,
    crossPlatformMetrics,
    platformCapabilities,
    snapshotWindow,
  } = input;

  // Build recommendations
  const recommendations = await buildParityHardeningRecommendations(
    openGaps,
    activeExceptions,
    crossPlatformMetrics,
    platformCapabilities
  );

  // Build gap priorities
  const gapPriorities = await buildPlatformGapPriorities(openGaps);

  // Build unification vs exception decisions
  const unificationVsExceptionDecisions = await buildUnificationVsExceptionDecision(
    openGaps,
    activeExceptions,
    crossPlatformMetrics
  );

  // Build risk summary
  const riskSummary = {
    criticalGaps: openGaps.filter((g) => g.severity === 'critical').length,
    highGaps: openGaps.filter((g) => g.severity === 'high').length,
    mediumGaps: openGaps.filter((g) => g.severity === 'medium').length,
    lowGaps: openGaps.filter((g) => g.severity === 'low').length,
  };

  return {
    reportId: generateReportId(),
    generatedAt: new Date(),
    snapshotWindow,
    currentParityState: currentParityLevel,
    recommendations,
    gapPriorities,
    unificationVsExceptionDecisions,
    riskSummary,
  };
}

/**
 * Build parity hardening recommendations
 */
export async function buildParityHardeningRecommendations(
  gaps: PlatformParityGap[],
  exceptions: PlatformExceptionRecord[],
  metrics: CrossPlatformMetricComparison[],
  capabilities: Record<PlatformKey, Record<PlatformParityScope, PlatformParityLevel>>
): Promise<ParityHardeningRecommendation[]> {
  const recommendations: ParityHardeningRecommendation[] = [];

  // Analyze gaps and generate gap remediation recommendations
  const gapRecommendations = await generateGapRemediationRecommendations(gaps);
  recommendations.push(...gapRecommendations);

  // Analyze exceptions and generate exception review recommendations
  const exceptionRecommendations = await generateExceptionReviewRecommendations(exceptions);
  recommendations.push(...exceptionRecommendations);

  // Analyze metrics and generate abstraction/unification recommendations
  const metricRecommendations = await generateMetricBasedRecommendations(metrics);
  recommendations.push(...metricRecommendations);

  // Analyze capabilities and generate surface unification recommendations
  const capabilityRecommendations = await generateCapabilityRecommendations(capabilities);
  recommendations.push(...capabilityRecommendations);

  // Sort by priority score (descending)
  return recommendations.sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Generate gap remediation recommendations
 */
async function generateGapRemediationRecommendations(
  gaps: PlatformParityGap[]
): Promise<ParityHardeningRecommendation[]> {
  const recommendations: ParityHardeningRecommendation[] = [];

  // Group gaps by severity
  const criticalGaps = gaps.filter((g) => g.severity === 'critical');
  const highGaps = gaps.filter((g) => g.severity === 'high');
  const mediumGaps = gaps.filter((g) => g.severity === 'medium');

  // Critical gaps require immediate action
  if (criticalGaps.length > 0) {
    recommendations.push({
      id: generateRecommendationId(),
      recommendationType: 'gap_remediation',
      priorityScore: 100,
      title: `Critical: Address ${criticalGaps.length} critical parity gap(s)`,
      description: `Critical gaps detected that require immediate remediation: ${criticalGaps.map((g) => g.gapArea).join(', ')}`,
      affectedScopes: extractScopesFromGaps(criticalGaps),
      affectedPlatforms: extractPlatformsFromGaps(criticalGaps),
      estimatedEffort: 'large',
      riskIfIgnored: 'critical',
      successMetrics: ['critical_gaps_resolved', 'parity_level_improved'],
      createdAt: new Date(),
    });
  }

  // High gaps should be prioritized
  if (highGaps.length > 0) {
    recommendations.push({
      id: generateRecommendationId(),
      recommendationType: 'gap_remediation',
      priorityScore: 85,
      title: `High Priority: Address ${highGaps.length} high-severity parity gap(s)`,
      description: `High-severity gaps should be addressed in the current sprint: ${highGaps.map((g) => g.gapArea).join(', ')}`,
      affectedScopes: extractScopesFromGaps(highGaps),
      affectedPlatforms: extractPlatformsFromGaps(highGaps),
      estimatedEffort: 'medium',
      riskIfIgnored: 'high',
      successMetrics: ['high_gaps_resolved', 'parity_level_maintained'],
      createdAt: new Date(),
    });
  }

  // Medium gaps can be scheduled
  if (mediumGaps.length > 0) {
    recommendations.push({
      id: generateRecommendationId(),
      recommendationType: 'gap_remediation',
      priorityScore: 60,
      title: `Schedule: Address ${mediumGaps.length} medium-severity parity gap(s)`,
      description: `Medium-severity gaps should be scheduled for upcoming sprints: ${mediumGaps.map((g) => g.gapArea).join(', ')}`,
      affectedScopes: extractScopesFromGaps(mediumGaps),
      affectedPlatforms: extractPlatformsFromGaps(mediumGaps),
      estimatedEffort: 'small',
      riskIfIgnored: 'medium',
      successMetrics: ['medium_gaps_resolved'],
      createdAt: new Date(),
    });
  }

  return recommendations;
}

/**
 * Generate exception review recommendations
 */
async function generateExceptionReviewRecommendations(
  exceptions: PlatformExceptionRecord[]
): Promise<ParityHardeningRecommendation[]> {
  const recommendations: ParityHardeningRecommendation[] = [];

  // Check for old exceptions that need review
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const oldExceptions = exceptions.filter(
    (e) => e.createdAt < ninetyDaysAgo && e.exceptionStatus === 'active'
  );

  if (oldExceptions.length > 0) {
    recommendations.push({
      id: generateRecommendationId(),
      recommendationType: 'exception_approval',
      priorityScore: 55,
      title: `Review ${oldExceptions.length} exception(s) older than 90 days`,
      description: `Exceptions that may no longer be valid and need re-evaluation: ${oldExceptions.map((e) => e.exceptionArea).join(', ')}`,
      affectedScopes: extractScopesFromExceptions(oldExceptions),
      affectedPlatforms: extractPlatformsFromExceptions(oldExceptions),
      estimatedEffort: 'small',
      riskIfIgnored: 'medium',
      successMetrics: ['exceptions_reviewed', 'stale_exceptions_resolved'],
      createdAt: new Date(),
    });
  }

  return recommendations;
}

/**
 * Generate metric-based recommendations
 */
async function generateMetricBasedRecommendations(
  metrics: CrossPlatformMetricComparison[]
): Promise<ParityHardeningRecommendation[]> {
  const recommendations: ParityHardeningRecommendation[] = [];

  // Find significant drifts
  const significantDrifts = metrics.filter(
    (m) => m.isDrift && Math.abs(m.differencePercent) > 0.3
  );

  if (significantDrifts.length > 0) {
    recommendations.push({
      id: generateRecommendationId(),
      recommendationType: 'surface_unification',
      priorityScore: 70,
      title: `Address ${significantDrifts.length} significant metric drift(s)`,
      description: `Metrics with significant cross-platform drift: ${significantDrifts.map((m) => m.metricLabel).join(', ')}. Consider unifying the surface or accepting as exception.`,
      affectedScopes: extractScopesFromMetrics(significantDrifts),
      affectedPlatforms: ['shopee', 'tiktok_shop'],
      estimatedEffort: 'medium',
      riskIfIgnored: 'high',
      successMetrics: ['drift_reduced', 'surface_unified'],
      createdAt: new Date(),
    });
  }

  return recommendations;
}

/**
 * Generate capability-based recommendations
 */
async function generateCapabilityRecommendations(
  capabilities: Record<PlatformKey, Record<PlatformParityScope, PlatformParityLevel>>
): Promise<ParityHardeningRecommendation[]> {
  const recommendations: ParityHardeningRecommendation[] = [];

  // Check for capability imbalances
  const tiktokCapabilities = capabilities.tiktok_shop ?? {};
  const shopeeCapabilities = capabilities.shopee ?? {};

  const areasToCheck: PlatformParityScope[] = [
    'operational',
    'commercial',
    'governance',
    'bi_analytics',
  ];

  for (const scope of areasToCheck) {
    const shopeeLevel = shopeeCapabilities[scope] ?? Level.UNKNOWN;
    const tiktokLevel = tiktokCapabilities[scope] ?? Level.UNKNOWN;

    // If there's a significant gap in capability level
    if (shopeeLevel !== tiktokLevel) {
      const gap = calculateLevelGap(shopeeLevel, tiktokLevel);
      if (gap >= 2) {
        recommendations.push({
          id: generateRecommendationId(),
          recommendationType: 'abstraction',
          priorityScore: 50 + gap * 10,
          title: `Address ${scope} capability gap`,
          description: `Shopee has ${shopeeLevel} level while TikTok has ${tiktokLevel} level in ${scope}. Consider abstraction or targeted improvement.`,
          affectedScopes: [scope],
          affectedPlatforms: ['shopee', 'tiktok_shop'],
          estimatedEffort: gap >= 3 ? 'large' : 'medium',
          riskIfIgnored: gap >= 3 ? 'high' : 'medium',
          successMetrics: ['capability_levelled', 'parity_achieved'],
          createdAt: new Date(),
        });
      }
    }
  }

  return recommendations;
}

/**
 * Build platform gap priorities
 */
export async function buildPlatformGapPriorities(
  gaps: PlatformParityGap[]
): Promise<
  Array<{
    gapId: string;
    gapArea: PlatformParityGapArea;
    severity: PlatformParityGapSeverity;
    priorityScore: number;
  }>
> {
  const priorities = gaps.map((gap) => {
    let priorityScore = calculateGapPriorityScore(gap);

    // Apply escalation based on age
    const ageMs = Date.now() - gap.createdAt.getTime();
    if (ageMs > CRITICAL_GAP_ESCALATION_MS && gap.severity === 'critical') {
      priorityScore = Math.min(100, priorityScore + 20);
    } else if (ageMs > HIGH_GAP_ESCALATION_MS && gap.severity === 'high') {
      priorityScore = Math.min(100, priorityScore + 15);
    }

    return {
      gapId: gap.id,
      gapArea: gap.gapArea,
      severity: gap.severity,
      priorityScore,
    };
  });

  // Sort by priority score descending
  return priorities.sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Build unification vs exception decision
 */
export async function buildUnificationVsExceptionDecision(
  gaps: PlatformParityGap[],
  exceptions: PlatformExceptionRecord[],
  metrics: CrossPlatformMetricComparison[]
): Promise<UnificationVsExceptionDecision[]> {
  const decisions: UnificationVsExceptionDecision[] = [];

  // Get all unique areas from gaps
  const gapAreas = new Set(gaps.map((g) => g.gapArea));

  for (const area of gapAreas) {
    const areaGaps = gaps.filter((g) => g.gapArea === area);
    const areaExceptions = exceptions.filter((e) => e.exceptionArea === area);

    // Determine recommendation based on gap count and exception status
    if (areaGaps.length > 3 && areaExceptions.length === 0) {
      // Many gaps, no exception - recommend unify
      decisions.push({
        area,
        recommendation: 'unify',
        rationale: `${areaGaps.length} gaps detected with no existing exception. Consider unifying the surface.`,
        affectedPlatforms: ['shopee', 'tiktok_shop'],
      });
    } else if (areaExceptions.length > 0 && areaGaps.length <= 1) {
      // Few gaps, existing exception - recommend maintain
      decisions.push({
        area,
        recommendation: 'maintain_exception',
        rationale: `Exception exists for ${area} with minimal gaps. Maintain current exception approach.`,
        affectedPlatforms: extractPlatformsFromExceptions(areaExceptions),
      });
    } else {
      // Mixed situation - recommend evaluation
      decisions.push({
        area,
        recommendation: 'evaluate_further',
        rationale: `${areaGaps.length} gaps and ${areaExceptions.length} exceptions. Need deeper analysis to determine best approach.`,
        affectedPlatforms: ['shopee', 'tiktok_shop'],
      });
    }
  }

  return decisions;
}

// Helper functions

function calculateGapPriorityScore(gap: PlatformParityGap): number {
  const severityScores: Record<PlatformParityGapSeverity, number> = {
    critical: 100,
    high: 80,
    medium: 60,
    low: 40,
    info: 20,
  };

  let score = severityScores[gap.severity] ?? 50;

  // Reduce score if already resolved
  if (gap.resolvedAt) {
    score = Math.max(0, score - 30);
  }

  // Reduce score if investigating or in progress
  if (gap.gapStatus === 'investigating') {
    score = Math.max(0, score - 10);
  } else if (gap.gapStatus === 'in_progress') {
    score = Math.max(0, score - 20);
  }

  return score;
}

function calculateLevelGap(shopeeLevel: PlatformParityLevel, tiktokLevel: PlatformParityLevel): number {
  const levelOrder: PlatformParityLevel[] = [
    Level.FULL_PARITY,
    Level.OPERATIONAL_PARITY,
    Level.REPORTING_PARITY,
    Level.GOVERNANCE_PARITY,
    Level.PARTIAL_PARITY,
    Level.PLATFORM_SPECIFIC,
    Level.EXCEPTION_ALLOWED,
    Level.HARDENING_REQUIRED,
    Level.UNKNOWN,
  ];

  const shopeeIndex = levelOrder.indexOf(shopeeLevel);
  const tiktokIndex = levelOrder.indexOf(tiktokLevel);

  return Math.abs(shopeeIndex - tiktokIndex);
}

function extractScopesFromGaps(gaps: PlatformParityGap[]): PlatformParityScope[] {
  // Simplified - would need proper mapping
  return gaps.map((g) => g.gapArea as PlatformParityScope);
}

function extractPlatformsFromGaps(gaps: PlatformParityGap[]): PlatformKey[] {
  return [...new Set(gaps.map((g) => g.platformKey))];
}

function extractScopesFromExceptions(exceptions: PlatformExceptionRecord[]): PlatformParityScope[] {
  return exceptions.map((e) => e.exceptionArea as PlatformParityScope);
}

function extractPlatformsFromExceptions(exceptions: PlatformExceptionRecord[]): PlatformKey[] {
  return [...new Set(exceptions.map((e) => e.platformKey))];
}

function extractScopesFromMetrics(metrics: CrossPlatformMetricComparison[]): PlatformParityScope[] {
  // Simplified - would need proper mapping
  return metrics.map((m) => m.metricKey as PlatformParityScope);
}

function generateReportId(): string {
  return `ds-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateRecommendationId(): string {
  return `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
