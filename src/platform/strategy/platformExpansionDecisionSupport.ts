/**
 * Platform Expansion Decision Support
 *
 * Strategic recommendations for multi-platform expansion.
 */

import type { PlatformExpansionRecommendation, PlatformPrerequisiteItem } from '../types.js';
import { READINESS_THRESHOLDS } from '../constants.js';
import { evaluateTikTokShopReadiness } from '../readiness/platformReadinessEvaluator.js';
import { getTikTokShopReadinessDecision } from '../readiness/tiktokShopReadinessFramework.js';

/**
 * Build platform expansion decision support
 */
export async function buildPlatformExpansionDecisionSupport(
  platformKey: string
): Promise<PlatformExpansionRecommendation> {
  if (platformKey === 'tiktok_shop') {
    return buildTikTokShopDecisionSupport();
  }

  // Generic platform support
  return {
    recommendation: 'not_ready',
    confidence: 0,
    readinessScore: {
      overall: 0,
      domainModel: 0,
      parserReference: 0,
      productContext: 0,
      promotionRules: 0,
      publicFlow: 0,
      commercialAttribution: 0,
      governance: 0,
    },
    summary: `Platform ${platformKey} has not been evaluated.`,
    blockers: [],
    warnings: [],
    prerequisites: [],
    risks: ['No readiness evaluation performed'],
    nextSteps: ['Run platform readiness review'],
  };
}

/**
 * Build TikTok Shop decision support
 */
export async function buildTikTokShopDecisionSupport(): Promise<PlatformExpansionRecommendation> {
  const readiness = await evaluateTikTokShopReadiness();
  const decision = getTikTokShopReadinessDecision();

  const prerequisites = buildPrerequisitesList(readiness.blockers);
  const risks = buildRiskList(readiness.warnings);
  const nextSteps = buildNextStepsList(readiness.blockers, readiness.warnings);

  return {
    recommendation: decision.recommendation,
    confidence: readiness.score.overall,
    readinessScore: readiness.score,
    summary: readiness.summary,
    blockers: readiness.blockers,
    warnings: readiness.warnings,
    prerequisites,
    risks,
    nextSteps,
  };
}

/**
 * Build platform prerequisite summary
 */
export function buildPlatformPrerequisiteSummary(
  blockers: Array<{ category: string; title: string }>
): PlatformPrerequisiteItem[] {
  return blockers.map(blocker => ({
    capabilityArea: blocker.category as any,
    description: blocker.title,
    priority: 'critical' as const,
    estimatedEffort: '2-3 weeks',
  }));
}

/**
 * Build proceed/hold/not-ready recommendation
 */
export function buildProceedHoldNotReadyRecommendation(
  readinessScore: number,
  blockers: number,
  warnings: number
): 'proceed' | 'hold' | 'not_ready' {
  // If there are critical blockers, don't proceed
  if (blockers > 0) {
    return 'not_ready';
  }

  // If readiness score is below threshold, hold
  if (readinessScore < READINESS_THRESHOLDS.PROCEED_CAUTIOUSLY_MIN) {
    return 'hold';
  }

  // If there are warnings, proceed with caution
  if (warnings > 5) {
    return 'hold';
  }

  // Otherwise, proceed
  return 'proceed';
}

// ============================================================
// Helper Functions
// ============================================================

function buildPrerequisitesList(blockers: Array<{ category: string; title: string }>): string[] {
  const prerequisites: string[] = [];

  if (blockers.some(b => b.category === 'product_reference_parsing')) {
    prerequisites.push('Implement product reference parsing for TikTok Shop');
  }

  if (blockers.some(b => b.category === 'product_context_resolution')) {
    prerequisites.push('Build product context resolution for TikTok Shop');
  }

  if (blockers.some(b => b.category === 'promotion_rule_modeling')) {
    prerequisites.push('Develop promotion rule modeling for TikTok Shop');
  }

  if (blockers.some(b => b.category === 'public_flow_support')) {
    prerequisites.push('Implement public flow support for TikTok Shop');
  }

  if (blockers.some(b => b.category === 'commercial_attribution')) {
    prerequisites.push('Set up commercial attribution for TikTok Shop');
  }

  return prerequisites;
}

function buildRiskList(warnings: Array<{ title: string }>): string[] {
  return warnings.slice(0, 5).map(w => w.title);
}

function buildNextStepsList(
  blockers: Array<{ category: string; title: string }>,
  warnings: Array<{ title: string }>
): string[] {
  const steps: string[] = [];

  // Priority steps based on blockers
  if (blockers.some(b => b.category === 'product_reference_parsing')) {
    steps.push('1. Build TikTok Shop product reference parser');
  }

  if (blockers.some(b => b.category === 'product_context_resolution')) {
    steps.push('2. Build TikTok Shop product context resolver');
  }

  if (blockers.some(b => b.category === 'promotion_rule_modeling')) {
    steps.push('3. Build TikTok Shop promotion rule modeler');
  }

  if (blockers.some(b => b.category === 'public_flow_support')) {
    steps.push('4. Implement TikTok Shop public flow UI');
  }

  if (blockers.some(b => b.category === 'commercial_attribution')) {
    steps.push('5. Set up TikTok Shop attribution tracking');
  }

  // Add general steps
  if (steps.length === 0) {
    steps.push('1. Run readiness review to identify gaps');
  }

  steps.push(`${steps.length + 1}. Re-evaluate readiness after implementation`);

  return steps;
}
