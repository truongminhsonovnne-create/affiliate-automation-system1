/**
 * Platform Candidate Review Pack Builder
 *
 * Builds human-readable review packs for platform production candidates.
 */

import type {
  PlatformEnablementReviewPack,
  PlatformEnablementDecisionSupport,
  PlatformProductionCandidateScore,
  PlatformEnablementBlocker,
  PlatformEnablementWarning,
  PlatformEnablementCondition,
  PlatformEvidenceBundle,
  PlatformCandidateStatus,
  IssueSection,
  IssueItem,
} from '../types/index.js';
import { buildPlatformBlockerSummary } from '../readiness/blockerClassifier.js';
import { buildCandidateConditionsSummary } from '../readiness/conditionBuilder.js';
import { SCORE_THRESHOLDS } from '../constants.js';

/**
 * Build platform candidate review pack
 */
export function buildPlatformCandidateReviewPack(
  platformKey: string,
  status: PlatformCandidateStatus,
  score: PlatformProductionCandidateScore,
  blockers: PlatformEnablementBlocker[],
  warnings: PlatformEnablementWarning[],
  conditions: PlatformEnablementCondition[],
  evidenceBundle: PlatformEvidenceBundle
): PlatformEnablementReviewPack {
  const blockerSummary = buildPlatformBlockerSummary(blockers);
  const conditionSummary = buildCandidateConditionsSummary(conditions);

  // Build decision support
  const decisionSupport = buildPlatformCandidateDecisionSupport(
    platformKey,
    status,
    score,
    blockers,
    warnings,
    conditions
  );

  // Build issue sections
  const issueSections = buildPlatformCandidateIssueSections(blockers, warnings);

  // Build next steps
  const nextSteps = buildNextSteps(status, score, blockers, conditions);

  return {
    platformKey,
    generatedAt: new Date(),
    review: null,
    score,
    blockers,
    warnings,
    conditions,
    risks: [],
    evidenceBundle,
    decisionSupport,
    issueSections,
    nextSteps,
  };
}

/**
 * Build platform candidate decision support
 */
export function buildPlatformCandidateDecisionSupport(
  platformKey: string,
  status: PlatformCandidateStatus,
  score: PlatformProductionCandidateScore,
  blockers: PlatformEnablementBlocker[],
  warnings: PlatformEnablementWarning[],
  conditions: PlatformEnablementCondition[]
): PlatformEnablementDecisionSupport {
  const blockerSummary = buildPlatformBlockerSummary(blockers);
  const conditionSummary = buildCandidateConditionsSummary(conditions);

  // Build evidence summary
  const evidenceSummary: Record<string, unknown> = {};
  if (score.domainMaturity !== null) evidenceSummary.domainMaturity = score.domainMaturity;
  if (score.dataFoundational !== null) evidenceSummary.dataFoundation = score.dataFoundational;
  if (score.acquisitionStability !== null) evidenceSummary.acquisition = score.acquisitionStability;
  if (score.previewUsefulness !== null) evidenceSummary.previewUsefulness = score.previewUsefulness;
  if (score.previewStability !== null) evidenceSummary.previewStability = score.previewStability;
  if (score.commercialReadiness !== null) evidenceSummary.commercial = score.commercialReadiness;
  if (score.governanceSafety !== null) evidenceSummary.governance = score.governanceSafety;

  // Build blockers summary
  const blockersSummary = blockers.map(b => `${b.severity.toUpperCase()}: ${b.title}`);

  // Build warnings summary
  const warningsSummary = warnings.map(w => `${w.severity.toUpperCase()}: ${w.title}`);

  // Build conditions summary
  const conditionsSummary = conditions.map(c => `${c.severity.toUpperCase()}: ${c.title}`);

  // Build tradeoffs
  const tradeoffs = buildTradeoffs(score);

  // Calculate confidence
  const confidence = calculateConfidence(score, blockers, evidenceBundle);

  return {
    recommendation: status,
    summary: buildSummaryText(status, score, blockers),
    confidence,
    evidenceSummary,
    tradeoffs,
    nextSteps: buildNextSteps(status, score, blockers, conditions),
    blockersSummary,
    warningsSummary,
    conditionsSummary,
  };
}

/**
 * Build platform candidate issue sections
 */
export function buildPlatformCandidateIssueSections(
  blockers: PlatformEnablementBlocker[],
  warnings: PlatformEnablementWarning[]
): IssueSection[] {
  const sections: IssueSection[] = [];

  // Critical issues section
  const criticalBlockers = blockers.filter(b => b.severity === 'critical');
  if (criticalBlockers.length > 0) {
    sections.push({
      sectionTitle: 'Critical Issues',
      severity: 'critical',
      issues: criticalBlockers.map(b => ({
        issueId: b.id,
        title: b.title,
        description: b.description,
        severity: 'critical',
        category: b.category,
        evidence: b.evidenceRef,
        suggestedResolution: b.resolutionAction,
      })),
      actionRequired: 'Must resolve before proceeding',
    });
  }

  // High priority issues section
  const highBlockers = blockers.filter(b => b.severity === 'high');
  if (highBlockers.length > 0) {
    sections.push({
      sectionTitle: 'High Priority Issues',
      severity: 'high',
      issues: highBlockers.map(b => ({
        issueId: b.id,
        title: b.title,
        description: b.description,
        severity: 'high',
        category: b.category,
        evidence: b.evidenceRef,
        suggestedResolution: b.resolutionAction,
      })),
      actionRequired: 'Should resolve before production candidate',
    });
  }

  // Warnings section
  if (warnings.length > 0) {
    sections.push({
      sectionTitle: 'Warnings',
      severity: 'medium',
      issues: warnings.map(w => ({
        issueId: w.id,
        title: w.title,
        description: w.description,
        severity: w.severity,
        category: w.category,
        evidence: w.evidenceRef,
      })),
      actionRequired: 'Consider addressing before proceeding',
    });
  }

  return sections;
}

// =============================================================================
// Helper Functions
// =============================================================================

function buildSummaryText(
  status: PlatformCandidateStatus,
  score: PlatformProductionCandidateScore,
  blockers: PlatformEnablementBlocker[]
): string {
  const scoreText = score.overall !== null ? `${score.overall}%` : 'N/A';
  const blockerText = blockers.length === 1 ? '1 blocker' : `${blockers.length} blockers`;

  switch (status) {
    case 'not_ready':
      return `Platform is NOT READY for production. Overall score: ${scoreText}. ${blockerText} must be resolved.`;
    case 'hold':
      return `Platform should HOLD. Overall score: ${scoreText}. ${blockerText} need resolution.`;
    case 'proceed_cautiously':
      return `Platform can PROCEED CAUTIOUSLY. Overall score: ${scoreText}. Review conditions and warnings.`;
    case 'production_candidate':
      return `Platform is ready for PRODUCTION CANDIDATE. Overall score: ${scoreText}. No critical blockers.`;
    case 'production_candidate_with_conditions':
      return `Platform is ready with CONDITIONS. Overall score: ${scoreText}. Review required conditions.`;
    case 'rollback_to_preview_only':
      return `Platform should ROLLBACK to preview only. Critical stability or quality issues detected.`;
    default:
      return `Status: ${status}, Score: ${scoreText}`;
  }
}

function buildTradeoffs(score: PlatformProductionCandidateScore): Array<{
  dimension: string;
  pros: string[];
  cons: string[];
  recommendation: string;
}> {
  const tradeoffs: Array<{
    dimension: string;
    pros: string[];
    cons: string[];
    recommendation: string;
  }> = [];

  // Domain tradeoffs
  if (score.domainMaturity !== null) {
    tradeoffs.push({
      dimension: 'Domain Knowledge',
      pros: score.domainMaturity >= 70 ? ['Platform understood'] : [],
      cons: score.domainMaturity < 70 ? ['Limited domain knowledge'] : [],
      recommendation: score.domainMaturity >= 70 ? 'Proceed' : 'Invest in domain knowledge',
    });
  }

  // Data tradeoffs
  if (score.dataFoundational !== null) {
    tradeoffs.push({
      dimension: 'Data Foundation',
      pros: score.dataFoundational >= 65 ? ['Data models ready'] : [],
      cons: score.dataFoundational < 65 ? ['Data foundation incomplete'] : [],
      recommendation: score.dataFoundational >= 65 ? 'Proceed' : 'Complete data foundation',
    });
  }

  // Preview tradeoffs
  if (score.previewUsefulness !== null || score.previewStability !== null) {
    const usefulness = score.previewUsefulness ?? 0;
    const stability = score.previewStability ?? 0;

    tradeoffs.push({
      dimension: 'Preview Quality',
      pros: usefulness >= 65 && stability >= 65 ? ['Good preview experience'] : [],
      cons: usefulness < 65 || stability < 65 ? ['Preview needs improvement'] : [],
      recommendation: usefulness >= 65 && stability >= 65 ? 'Proceed' : 'Improve preview quality',
    });
  }

  // Commercial tradeoffs
  if (score.commercialReadiness !== null) {
    tradeoffs.push({
      dimension: 'Commercial',
      pros: score.commercialReadiness >= 60 ? ['Commercial ready'] : [],
      cons: score.commercialReadiness < 60 ? ['Commercial not ready'] : [],
      recommendation: score.commercialReadiness >= 60 ? 'Can monetize' : 'Complete commercial work',
    });
  }

  // Governance tradeoffs
  if (score.governanceSafety !== null) {
    tradeoffs.push({
      dimension: 'Governance',
      pros: score.governanceSafety >= 80 ? ['Governance approved'] : [],
      cons: score.governanceSafety < 80 ? ['Governance approval pending'] : [],
      recommendation: score.governanceSafety >= 80 ? 'Approved' : 'Obtain governance approval',
    });
  }

  return tradeoffs;
}

function calculateConfidence(
  score: PlatformProductionCandidateScore,
  blockers: PlatformEnablementBlocker[],
  _evidenceBundle: PlatformEvidenceBundle
): number {
  let confidence = 0.5; // Base confidence

  // Reduce confidence based on missing scores
  const missingScores = [
    score.domainMaturity,
    score.dataFoundational,
    score.acquisitionStability,
    score.previewUsefulness,
    score.previewStability,
    score.commercialReadiness,
    score.governanceSafety,
  ].filter(s => s === null).length;

  confidence -= missingScores * 0.05;

  // Reduce confidence based on blockers
  const criticalBlockers = blockers.filter(b => b.severity === 'critical').length;
  confidence -= criticalBlockers * 0.1;

  const highBlockers = blockers.filter(b => b.severity === 'high').length;
  confidence -= highBlockers * 0.05;

  return Math.max(0, Math.min(1, confidence));
}

function buildNextSteps(
  status: PlatformCandidateStatus,
  score: PlatformProductionCandidateScore,
  blockers: PlatformEnablementBlocker[],
  conditions: PlatformEnablementCondition[]
): string[] {
  const nextSteps: string[] = [];

  switch (status) {
    case 'not_ready':
      nextSteps.push('Address all critical blockers');
      nextSteps.push('Complete domain and data foundation work');
      nextSteps.push('Obtain governance approval');
      nextSteps.push('Re-run production candidate review');
      break;

    case 'hold':
      nextSteps.push('Resolve high-severity blockers');
      nextSteps.push('Improve preview quality');
      nextSteps.push('Re-evaluate in next review cycle');
      break;

    case 'proceed_cautiously':
      nextSteps.push('Enable enhanced monitoring');
      nextSteps.push('Set up limited rollout');
      nextSteps.push('Plan for production candidate transition');
      nextSteps.push('Monitor key metrics closely');
      break;

    case 'production_candidate':
      nextSteps.push('Prepare production rollout plan');
      nextSteps.push('Configure production monitoring');
      nextSteps.push('Notify stakeholders');
      nextSteps.push('Plan production enablement');
      break;

    case 'production_candidate_with_conditions':
      nextSteps.push('Satisfy all required conditions');
      nextSteps.push('Complete condition remediation');
      nextSteps.push('Get condition sign-offs');
      nextSteps.push('Plan conditional production rollout');
      break;

    case 'rollback_to_preview_only':
      nextSteps.push('Rollback to preview-only mode');
      nextSteps.push('Address critical stability issues');
      nextSteps.push('Re-evaluate after fixes');
      break;
  }

  return nextSteps;
}

// Reference evidenceBundle for type checking
const evidenceBundle = null;
