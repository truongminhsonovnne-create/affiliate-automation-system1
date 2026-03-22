/**
 * Surface Quality Evaluator
 *
 * Evaluates surface quality across multiple dimensions with governance guardrails.
 */

import {
  GrowthSurfaceInventoryRecord,
  GrowthSurfaceQualityScore,
  GrowthSurfaceQualityReview,
  GrowthQualityReviewStatus,
} from '../types';
import { QUALITY_SCORE_CONFIG } from '../constants';
import { assessThinContentRisk, assessClutterRisk } from '../governance/contentDensityPolicy';
import { evaluateToolAlignment } from '../governance/toolAlignmentPolicy';

export interface QualityEvaluationContext {
  characterCount?: number;
  wordCount?: number;
  sectionCount?: number;
  hasValuableContent?: boolean;
  ctaCount?: number;
  hasCta?: boolean;
  navigationLinks?: number;
  outboundLinks?: number;
  hasStructuredData?: boolean;
}

export interface QualityEvaluationResult {
  score: GrowthSurfaceQualityScore;
  review: GrowthSurfaceQualityReview;
  issues: QualityIssue[];
  recommendations: string[];
}

export interface QualityIssue {
  dimension: keyof GrowthSurfaceQualityScore;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  scoreImpact: number;
}

/**
 * Evaluate surface quality
 */
export function evaluateSurfaceQuality(
  surface: GrowthSurfaceInventoryRecord,
  context?: QualityEvaluationContext
): QualityEvaluationResult {
  // Calculate individual dimension scores
  const usefulness = calculateUsefulnessScore(surface, context);
  const clarity = calculateClarityScore(surface, context);
  const ctaDiscipline = calculateCtaDisciplineScore(surface, context);
  const freshness = calculateFreshnessScore(surface);
  const seoCleanliness = calculateSeoCleanlinessScore(surface, context);
  const conversionRelevance = calculateConversionRelevanceScore(surface, context);

  // Calculate overall score (weighted average)
  const weights = QUALITY_SCORE_CONFIG.COMPONENT_WEIGHTS;
  const overall = Math.round(
    usefulness * weights.usefulness +
    clarity * weights.clarity +
    ctaDiscipline * weights.ctaDiscipline +
    freshness * weights.freshness +
    seoCleanliness * weights.seoCleanliness +
    conversionRelevance * weights.conversionRelevance
  );

  const score: GrowthSurfaceQualityScore = {
    overall,
    usefulness,
    clarity,
    ctaDiscipline,
    freshness,
    seoCleanliness,
    conversionRelevance,
  };

  // Identify issues
  const issues = identifyQualityIssues(surface, score, context);

  // Generate recommendations
  const recommendations = generateQualityRecommendations(score, issues);

  // Build review record
  const review: GrowthSurfaceQualityReview = {
    id: crypto.randomUUID(),
    surfaceInventoryId: surface.id,
    reviewStatus: determineReviewStatus(overall),
    qualityScore: overall,
    usefulnessScore: usefulness,
    thinContentRisk: context ? assessThinContentRisk(surface, context).score : null,
    duplicationRisk: null,
    clutterRisk: context ? assessClutterRisk(surface, context).score : null,
    reviewPayload: {
      dimensions: score,
      issues: issues.map(i => i.message),
    },
    createdAt: new Date(),
  };

  return { score, review, issues, recommendations };
}

/**
 * Calculate usefulness score (0-100)
 */
export function calculateUsefulnessScore(
  surface: GrowthSurfaceInventoryRecord,
  context?: QualityEvaluationContext
): number {
  let score = 50; // Base

  // Content depth contribution
  if (context?.characterCount && context?.wordCount) {
    if (context.characterCount >= 1000 && context.wordCount >= 200) {
      score += 20;
    } else if (context.characterCount >= 500 && context.wordCount >= 100) {
      score += 10;
    } else if (context.characterCount < 300) {
      score -= 15;
    }
  }

  // Valuable content bonus
  if (context?.hasValuableContent) {
    score += 15;
  }

  // Section structure
  if (context?.sectionCount) {
    if (context.sectionCount >= 3) score += 10;
    else if (context.sectionCount < 1) score -= 10;
  }

  // Existing quality score influence
  if (surface.qualityScore !== null) {
    score = Math.round((score + surface.qualityScore) / 2);
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate clarity score (0-100)
 */
export function calculateClarityScore(
  surface: GrowthSurfaceInventoryRecord,
  context?: QualityEvaluationContext
): number {
  let score = 60; // Base

  // Would analyze headings, structure, readability in real implementation
  // Using metadata as proxy

  if (surface.metadata?.hasHeadings) {
    score += 15;
  }

  if (surface.metadata?.hasLists) {
    score += 10;
  }

  if (surface.metadata?.readabilityScore) {
    score += Math.min(15, surface.metadata.readabilityScore as number);
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate CTA discipline score (0-100)
 */
export function calculateCtaDisciplineScore(
  surface: GrowthSurfaceInventoryRecord,
  context?: QualityEvaluationContext
): number {
  const ctaCount = context?.ctaCount ?? surface.metadata?.ctaCount as number ?? 0;

  // Optimal CTA count: 1-2
  if (ctaCount === 0) {
    return 30; // No CTA is poor
  } else if (ctaCount === 1 || ctaCount === 2) {
    return 80 + (context?.hasCta ? 20 : 0);
  } else if (ctaCount <= 3) {
    return 70;
  } else {
    return Math.max(30, 80 - (ctaCount - 3) * 10); // Too many CTAs
  }
}

/**
 * Calculate freshness score (0-100)
 */
export function calculateFreshnessScore(surface: GrowthSurfaceInventoryRecord): number {
  // Base on freshness status
  switch (surface.freshnessStatus) {
    case 'fresh':
      return 100;
    case 'needs_refresh':
      return 60;
    case 'stale':
      return 30;
    default:
      return 50;
  }
}

/**
 * Calculate SEO cleanliness score (0-100)
 */
export function calculateSeoCleanlinessScore(
  surface: GrowthSurfaceInventoryRecord,
  context?: QualityEvaluationContext
): number {
  let score = 70; // Base

  // Check indexability
  if (surface.indexabilityStatus === 'indexable') {
    score += 15;
  } else if (surface.indexabilityStatus === 'noindex') {
    return 20; // Noindex pages have poor SEO
  }

  // Structured data bonus
  if (context?.hasStructuredData) {
    score += 10;
  }

  // Check quality score
  if (surface.qualityScore !== null) {
    score = Math.round((score + surface.qualityScore) / 2);
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate conversion relevance score (0-100)
 */
export function calculateConversionRelevanceScore(
  surface: GrowthSurfaceInventoryRecord,
  context?: QualityEvaluationContext
): number {
  let score = 50; // Base

  // Tool alignment contribution
  const toolAlignment = evaluateToolAlignment(surface, context);
  score = Math.round((score + toolAlignment.toolEmphasis * 100) / 2);

  // CTA presence matters for conversion
  if (context?.hasCta) {
    score += 20;
  }

  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// Helper Functions
// ============================================================================

function identifyQualityIssues(
  surface: GrowthSurfaceInventoryRecord,
  score: GrowthSurfaceQualityScore,
  context?: QualityEvaluationContext
): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // Check each dimension
  if (score.usefulness < QUALITY_SCORE_CONFIG.ACCEPTABLE_THRESHOLD) {
    issues.push({
      dimension: 'usefulness',
      severity: score.usefulness < QUALITY_SCORE_CONFIG.POOR_THRESHOLD ? 'critical' : 'high',
      message: `Usefulness score ${score.usefulness} below acceptable threshold`,
      scoreImpact: 100 - score.usefulness,
    });
  }

  if (score.clarity < QUALITY_SCORE_CONFIG.GOOD_THRESHOLD) {
    issues.push({
      dimension: 'clarity',
      severity: 'medium',
      message: 'Content clarity could be improved with better structure',
      scoreImpact: QUALITY_SCORE_CONFIG.GOOD_THRESHOLD - score.clarity,
    });
  }

  if (score.ctaDiscipline < 50) {
    issues.push({
      dimension: 'ctaDiscipline',
      severity: 'high',
      message: 'CTA discipline issues detected',
      scoreImpact: 50 - score.ctaDiscipline,
    });
  }

  if (score.freshness < QUALITY_SCORE_CONFIG.ACCEPTABLE_THRESHOLD) {
    issues.push({
      dimension: 'freshness',
      severity: 'medium',
      message: 'Content freshness needs attention',
      scoreImpact: QUALITY_SCORE_CONFIG.ACCEPTABLE_THRESHOLD - score.freshness,
    });
  }

  if (score.seoCleanliness < QUALITY_SCORE_CONFIG.ACCEPTABLE_THRESHOLD) {
    issues.push({
      dimension: 'seoCleanliness',
      severity: 'high',
      message: 'SEO cleanliness below acceptable threshold',
      scoreImpact: QUALITY_SCORE_CONFIG.ACCEPTABLE_THRESHOLD - score.seoCleanliness,
    });
  }

  return issues;
}

function generateQualityRecommendations(
  score: GrowthSurfaceQualityScore,
  issues: QualityIssue[]
): string[] {
  const recommendations: string[] = [];

  // Based on issues
  for (const issue of issues) {
    switch (issue.dimension) {
      case 'usefulness':
        recommendations.push('Add more substantive, valuable content');
        break;
      case 'clarity':
        recommendations.push('Improve content structure with headings and lists');
        break;
      case 'ctaDiscipline':
        recommendations.push('Review CTA placement and count');
        break;
      case 'freshness':
        recommendations.push('Refresh content to improve freshness');
        break;
      case 'seoCleanliness':
        recommendations.push('Review SEO elements and structured data');
        break;
      case 'conversionRelevance':
        recommendations.push('Improve tool alignment and CTA presence');
        break;
    }
  }

  // General recommendations based on overall score
  if (score.overall >= QUALITY_SCORE_CONFIG.EXCELLENT_THRESHOLD) {
    recommendations.push('Quality is excellent - maintain standards');
  } else if (score.overall >= QUALITY_SCORE_CONFIG.GOOD_THRESHOLD) {
    recommendations.push('Quality is good - minor improvements possible');
  } else if (score.overall >= QUALITY_SCORE_CONFIG.ACCEPTABLE_THRESHOLD) {
    recommendations.push('Quality is acceptable but could be improved');
  } else {
    recommendations.push('Quality needs significant improvement');
  }

  return [...new Set(recommendations)]; // Remove duplicates
}

function determineReviewStatus(overallScore: number): GrowthQualityReviewStatus {
  if (overallScore >= QUALITY_SCORE_CONFIG.GOOD_THRESHOLD) {
    return GrowthQualityReviewStatus.APPROVED;
  } else if (overallScore >= QUALITY_SCORE_CONFIG.ACCEPTABLE_THRESHOLD) {
    return GrowthQualityReviewStatus.PENDING;
  } else if (overallScore >= QUALITY_SCORE_CONFIG.POOR_THRESHOLD) {
    return GrowthQualityReviewStatus.NEEDS_IMPROVEMENT;
  }
  return GrowthQualityReviewStatus.REJECTED;
}
