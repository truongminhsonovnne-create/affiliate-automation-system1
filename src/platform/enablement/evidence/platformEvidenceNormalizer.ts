/**
 * Platform Evidence Normalizer
 *
 * Normalizes evidence from multiple sources into reviewable model.
 */

import type {
  PlatformEvidenceBundle,
  PlatformProductionCandidateScore,
  PlatformReadinessDimension,
  EvidenceConfidenceSummary,
} from '../types/index.js';
import {
  DIMENSION_WEIGHTS,
  SCORE_THRESHOLDS,
} from '../constants.js';

/**
 * Normalize platform evidence into readiness score
 */
export function normalizePlatformEvidence(
  bundle: PlatformEvidenceBundle
): PlatformProductionCandidateScore {
  // Build individual dimensions
  const dimensions: PlatformReadinessDimension[] = [
    buildDimension(
      'domain_maturity',
      'Domain Maturity',
      bundle.domainEvidence.score,
      DIMENSION_WEIGHTS.DOMAIN_MATURITY,
      bundle.domainEvidence
    ),
    buildDimension(
      'data_foundational',
      'Data Foundation',
      bundle.dataFoundationEvidence.score,
      DIMENSION_WEIGHTS.DATA_FOUNDATIONAL,
      bundle.dataFoundationEvidence
    ),
    buildDimension(
      'acquisition_stability',
      'Acquisition Stability',
      bundle.acquisitionEvidence.score,
      DIMENSION_WEIGHTS.ACQUISITION_STABILITY,
      bundle.acquisitionEvidence
    ),
    buildDimension(
      'sandbox_quality',
      'Sandbox Quality',
      bundle.previewEvidence.score,
      DIMENSION_WEIGHTS.SANDBOX_QUALITY,
      { ...bundle.previewEvidence, type: 'sandbox' }
    ),
    buildDimension(
      'preview_usefulness',
      'Preview Usefulness',
      bundle.previewEvidence.usefulnessScore,
      DIMENSION_WEIGHTS.PREVIEW_USEFULNESS,
      { ...bundle.previewEvidence, metric: 'usefulness' }
    ),
    buildDimension(
      'preview_stability',
      'Preview Stability',
      bundle.previewEvidence.stabilityScore,
      DIMENSION_WEIGHTS.PREVIEW_STABILITY,
      { ...bundle.previewEvidence, metric: 'stability' }
    ),
    buildDimension(
      'commercial_readiness',
      'Commercial Readiness',
      bundle.commercialEvidence.score,
      DIMENSION_WEIGHTS.COMMERCIAL_READINESS,
      bundle.commercialEvidence
    ),
    buildDimension(
      'governance_safety',
      'Governance Safety',
      bundle.governanceEvidence.score,
      DIMENSION_WEIGHTS.GOVERNANCE_SAFETY,
      bundle.governanceEvidence
    ),
    buildDimension(
      'remediation_load',
      'Remediation Load',
      bundle.remediationEvidence.score,
      DIMENSION_WEIGHTS.REMEDIATION_LOAD,
      bundle.remediationEvidence,
      true // Inverted: lower is better
    ),
    buildDimension(
      'operator_readiness',
      'Operator Readiness',
      bundle.operatorEvidence.score,
      DIMENSION_WEIGHTS.OPERATOR_READINESS,
      bundle.operatorEvidence
    ),
  ];

  // Calculate weighted overall score
  let overallScore: number | null = null;
  let totalWeight = 0;
  let weightedSum = 0;

  for (const dim of dimensions) {
    if (dim.score !== null) {
      weightedSum += dim.score * dim.weight;
      totalWeight += dim.weight;
    }
  }

  if (totalWeight > 0) {
    overallScore = Math.round(weightedSum / totalWeight);
  }

  return {
    overall: overallScore,
    domainMaturity: bundle.domainEvidence.score,
    dataFoundational: bundle.dataFoundationEvidence.score,
    acquisitionStability: bundle.acquisitionEvidence.score,
    sandboxQuality: bundle.previewEvidence.score,
    previewUsefulness: bundle.previewEvidence.usefulnessScore,
    previewStability: bundle.previewEvidence.stabilityScore,
    commercialReadiness: bundle.commercialEvidence.score,
    governanceSafety: bundle.governanceEvidence.score,
    remediationLoad: bundle.remediationEvidence.score,
    operatorReadiness: bundle.operatorEvidence.score,
    dimensions,
  };
}

/**
 * Build a single readiness dimension
 */
function buildDimension(
  dimension: string,
  label: string,
  score: number | null,
  weight: number,
  evidence: Record<string, unknown>,
  inverted: boolean = false
): PlatformReadinessDimension {
  let status: 'pass' | 'warning' | 'fail' | 'unknown' = 'unknown';

  if (score !== null) {
    const threshold = inverted
      ? SCORE_THRESHOLDS.HOLD_THRESHOLD
      : SCORE_THRESHOLDS.PROCEED_CAUTIOUSLY_MIN;

    if (score >= threshold) {
      status = inverted ? 'fail' : 'pass';
    } else if (score >= threshold * 0.8) {
      status = 'warning';
    } else {
      status = inverted ? 'pass' : 'fail';
    }
  }

  return {
    dimension,
    score,
    weight,
    status,
    evidence,
    details: `${label}: ${score !== null ? `${score}%` : 'No data'} - ${status}`,
  };
}

/**
 * Build platform evidence bundle with all normalized data
 */
export function buildPlatformEvidenceBundle(
  platformKey: string,
  evidence: {
    domainEvidence: Record<string, unknown>;
    dataFoundationEvidence: Record<string, unknown>;
    acquisitionEvidence: Record<string, unknown>;
    previewEvidence: Record<string, unknown>;
    commercialEvidence: Record<string, unknown>;
    governanceEvidence: Record<string, unknown>;
    remediationEvidence: Record<string, unknown>;
    operatorEvidence: Record<string, unknown>;
  }
): Record<string, unknown> {
  return {
    platformKey,
    collectedAt: new Date().toISOString(),
    ...evidence,
    normalizedAt: new Date().toISOString(),
  };
}

/**
 * Build evidence confidence summary
 */
export function buildEvidenceConfidenceSummary(
  bundle: PlatformEvidenceBundle
): EvidenceConfidenceSummary {
  const scores = [
    bundle.domainEvidence.score,
    bundle.dataFoundationEvidence.score,
    bundle.acquisitionEvidence.score,
    bundle.previewEvidence.score,
    bundle.commercialEvidence.score,
    bundle.governanceEvidence.score,
    bundle.remediationEvidence.score,
    bundle.operatorEvidence.score,
  ].filter((s): s is number => s !== null);

  const dataCompleteness = scores.length / 8;
  const sourceReliability = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length / 100
    : 0;

  const overallConfidence = dataCompleteness * sourceReliability;

  const gaps: string[] = [];
  if (bundle.domainEvidence.score === null) gaps.push('domain');
  if (bundle.dataFoundationEvidence.score === null) gaps.push('data_foundation');
  if (bundle.acquisitionEvidence.score === null) gaps.push('acquisition');
  if (bundle.previewEvidence.score === null) gaps.push('preview');
  if (bundle.commercialEvidence.score === null) gaps.push('commercial');
  if (bundle.governanceEvidence.score === null) gaps.push('governance');
  if (bundle.remediationEvidence.score === null) gaps.push('remediation');
  if (bundle.operatorEvidence.score === null) gaps.push('operator');

  const stalenessDays = Math.floor(
    (Date.now() - new Date(bundle.collectedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    overallConfidence: Math.round(overallConfidence * 100) / 100,
    dataCompleteness: Math.round(dataCompleteness * 100) / 100,
    sourceReliability: Math.round(sourceReliability * 100) / 100,
    stalenessDays,
    gaps,
  };
}

/**
 * Check if evidence is stale
 */
export function isEvidenceStale(bundle: PlatformEvidenceBundle, staleThresholdDays: number = 14): boolean {
  const stalenessDays = Math.floor(
    (Date.now() - new Date(bundle.collectedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  return stalenessDays > staleThresholdDays;
}

/**
 * Get evidence gaps as human-readable list
 */
export function getEvidenceGaps(bundle: PlatformEvidenceBundle): string[] {
  const gaps: string[] = [];

  if (bundle.domainEvidence.score === null) {
    gaps.push('Domain/platform knowledge evidence missing');
  }
  if (bundle.dataFoundationEvidence.score === null) {
    gaps.push('Data foundation evidence missing');
  }
  if (bundle.acquisitionEvidence.score === null) {
    gaps.push('Acquisition/runtime evidence missing');
  }
  if (bundle.previewEvidence.score === null) {
    gaps.push('Preview/sandbox evidence missing');
  }
  if (bundle.commercialEvidence.score === null) {
    gaps.push('Commercial readiness evidence missing');
  }
  if (bundle.governanceEvidence.score === null) {
    gaps.push('Governance/compliance evidence missing');
  }
  if (bundle.remediationEvidence.score === null) {
    gaps.push('Remediation/backlog evidence missing');
  }
  if (bundle.operatorEvidence.score === null) {
    gaps.push('Operator readiness evidence missing');
  }

  return gaps;
}
