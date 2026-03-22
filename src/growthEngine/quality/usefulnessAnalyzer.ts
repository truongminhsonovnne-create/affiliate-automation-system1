/**
 * Usefulness Analyzer
 *
 * Analyzes surface usefulness based on engagement metrics and conversion signals.
 */

import {
  GrowthSurfaceInventoryRecord,
  GrowthSurfaceUsefulnessScore,
  GrowthSurfaceMetricAggregate,
} from '../types';
import { USEFULNESS_SCORE_CONFIG } from '../constants';

export interface UsefulnessAnalysisContext {
  pageViews?: number;
  toolCtaClicks?: number;
  toolEntryConversions?: number;
  bounceRate?: number;
  avgTimeOnPage?: number;
  weakEngagementSignals?: number;
}

export interface UsefulnessAnalysisResult {
  score: GrowthSurfaceUsefulnessScore;
  signals: UsefulnessSignal[];
  assessment: 'high' | 'medium' | 'low' | 'unknown';
}

export interface UsefulnessSignal {
  type: 'positive' | 'negative' | 'neutral';
  metric: string;
  value: number;
  threshold: number;
  message: string;
}

/**
 * Analyze surface usefulness
 */
export function analyzeSurfaceUsefulness(
  surface: GrowthSurfaceInventoryRecord,
  metrics?: GrowthSurfaceMetricAggregate[],
  context?: UsefulnessAnalysisContext
): UsefulnessAnalysisResult {
  const signals: UsefulnessSignal[] = [];

  // Calculate individual scores
  const toolConversion = calculateToolConversionScore(surface, metrics, context);
  const engagementQuality = calculateEngagementQualityScore(surface, metrics, context);
  const bounceRisk = calculateBounceRiskScore(surface, metrics, context);
  const valueDelivery = calculateValueDeliveryScore(surface, metrics, context);

  // Calculate overall score
  const overall = Math.round(
    (toolConversion * 0.35) +
    (engagementQuality * 0.25) +
    (bounceRisk * 0.20) +
    (valueDelivery * 0.20)
  );

  const score: GrowthSurfaceUsefulnessScore = {
    overall,
    toolConversion,
    engagementQuality,
    bounceRisk,
    valueDelivery,
  };

  // Determine assessment level
  let assessment: 'high' | 'medium' | 'low' | 'unknown';
  if (overall >= USEFULNESS_SCORE_CONFIG.HIGH_USE_THRESHOLD) {
    assessment = 'high';
  } else if (overall >= USEFULNESS_SCORE_CONFIG.MEDIUM_USE_THRESHOLD) {
    assessment = 'medium';
  } else if (overall >= USEFULNESS_SCORE_CONFIG.LOW_USE_THRESHOLD) {
    assessment = 'low';
  } else {
    assessment = 'unknown';
  }

  return { score, signals, assessment };
}

/**
 * Calculate tool conversion score (0-100)
 */
export function calculateToolConversionScore(
  surface: GrowthSurfaceInventoryRecord,
  metrics?: GrowthSurfaceMetricAggregate[],
  context?: UsefulnessAnalysisContext
): number {
  let score = 50; // Base

  // Get conversion data
  let conversions = context?.toolEntryConversions ?? 0;
  let clicks = context?.toolCtaClicks ?? 0;
  let views = context?.pageViews ?? 0;

  // Aggregate from metrics if not in context
  if (metrics && metrics.length > 0) {
    conversions = metrics.reduce((sum, m) => sum + m.toolEntryConversions, 0);
    clicks = metrics.reduce((sum, m) => sum + m.toolCtaClicks, 0);
    views = metrics.reduce((sum, m) => sum + m.pageViews, 0);
  }

  // Calculate conversion rate
  if (views > 0) {
    const conversionRate = conversions / views;
    const clickRate = clicks / views;

    // Score based on conversion rate
    if (conversionRate >= USEFULNESS_SCORE_CONFIG.MIN_CONVERSION_RATE) {
      score += 25;
    } else if (conversionRate > 0) {
      score += 10;
    }

    // Bonus for click-through
    if (clickRate > 0.1) {
      score += 15;
    } else if (clickRate > 0.05) {
      score += 10;
    }
  } else if (conversions > 0) {
    // Has conversions but no views tracked
    score += 20;
  }

  // Surface type adjustment
  // Tool entries should have higher conversion expectations
  if (surface.surfaceType === 'tool_entry') {
    if (conversions === 0) {
      score -= 20; // Tool entry without conversions is concerning
    }
  }

  // Penalty for weak signals
  if (context?.weakEngagementSignals && context.weakEngagementSignals > 10) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate engagement quality score (0-100)
 */
export function calculateEngagementQualityScore(
  surface: GrowthSurfaceInventoryRecord,
  metrics?: GrowthSurfaceMetricAggregate[],
  context?: UsefulnessAnalysisContext
): number {
  let score = 50; // Base

  // Get engagement data
  let views = context?.pageViews ?? 0;
  const avgTime = context?.avgTimeOnPage;

  if (metrics && metrics.length > 0) {
    views = metrics.reduce((sum, m) => sum + m.pageViews, 0);
  }

  // Time on page scoring (in seconds)
  if (avgTime !== undefined) {
    if (avgTime >= 120) { // 2+ minutes
      score += 25;
    } else if (avgTime >= 60) { // 1+ minute
      score += 15;
    } else if (avgTime >= 30) { // 30+ seconds
      score += 5;
    } else if (avgTime < 10) {
      score -= 20;
    }
  }

  // Views-based scoring
  if (views > 1000) {
    score += 15;
  } else if (views > 100) {
    score += 10;
  } else if (views > 0) {
    score += 5;
  }

  // Penalize for weak engagement signals
  const weakSignals = context?.weakEngagementSignals ?? 0;
  if (weakSignals > views * 0.5 && views > 0) {
    score -= 20;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate bounce risk score (0-100, higher = less bounce risk)
 */
export function calculateBounceRiskScore(
  surface: GrowthSurfaceInventoryRecord,
  metrics?: GrowthSurfaceMetricAggregate[],
  context?: UsefulnessAnalysisContext
): number {
  let score = 50; // Base

  const bounceRate = context?.bounceRate;

  if (bounceRate !== undefined) {
    // Convert bounce rate to score (lower bounce = higher score)
    if (bounceRate < USEFULNESS_SCORE_CONFIG.MEDIUM_BOUNCE_THRESHOLD) {
      score += 30;
    } else if (bounceRate < USEFULNESS_SCORE_CONFIG.HIGH_BOUNCE_THRESHOLD) {
      score += 10;
    } else {
      score -= 25;
    }
  }

  // Check if surface has tool CTA (tool entry should have lower bounce)
  if (surface.metadata?.hasCta || surface.metadata?.ctaCount > 0) {
    score += 10;
  }

  // Check content depth
  const characterCount = surface.metadata?.characterCount as number ?? 0;
  if (characterCount >= 500) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate value delivery score (0-100)
 */
export function calculateValueDeliveryScore(
  surface: GrowthSurfaceInventoryRecord,
  metrics?: GrowthSurfaceMetricAggregate[],
  context?: UsefulnessAnalysisContext
): number {
  let score = 50; // Base

  // Check if surface has valuable content indicator
  const hasValuableContent = surface.metadata?.hasValuableContent as boolean ?? false;
  if (hasValuableContent) {
    score += 20;
  }

  // Check content character count
  const characterCount = surface.metadata?.characterCount as number ?? 0;
  if (characterCount >= 1000) {
    score += 15;
  } else if (characterCount >= 500) {
    score += 10;
  } else if (characterCount < 300) {
    score -= 15;
  }

  // Check section count
  const sectionCount = surface.metadata?.sectionCount as number ?? 0;
  if (sectionCount >= 3) {
    score += 10;
  } else if (sectionCount < 1) {
    score -= 10;
  }

  // Tool-specific scoring
  if (surface.surfaceType === 'tool_entry') {
    const conversions = context?.toolEntryConversions ?? 0;
    if (conversions > 0) {
      score += 15; // Tool entry delivering conversions
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Identify low usefulness surfaces for governance
 */
export function identifyLowUsefulnessSurfaces(
  surfaces: GrowthSurfaceInventoryRecord[],
  metricsMap?: Map<string, GrowthSurfaceMetricAggregate[]>
): {
  surfaceId: string;
  score: number;
  primaryIssue: string;
}[] {
  const lowUsefulness: {
    surfaceId: string;
    score: number;
    primaryIssue: string;
  }[] = [];

  for (const surface of surfaces) {
    const metrics = metricsMap?.get(surface.id);
    const result = analyzeSurfaceUsefulness(surface, metrics);

    if (result.score.overall < USEFULNESS_SCORE_CONFIG.LOW_USE_THRESHOLD) {
      // Determine primary issue
      let primaryIssue = 'Low overall usefulness';
      if (result.score.toolConversion < 30) {
        primaryIssue = 'Poor tool conversion';
      } else if (result.score.bounceRisk < 30) {
        primaryIssue = 'High bounce risk';
      } else if (result.score.valueDelivery < 30) {
        primaryIssue = 'Poor value delivery';
      }

      lowUsefulness.push({
        surfaceId: surface.id,
        score: result.score.overall,
        primaryIssue,
      });
    }
  }

  return lowUsefulness.sort((a, b) => a.score - b.score);
}
