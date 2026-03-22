/**
 * Platform Decision Explainability
 *
 * Provides explainable AI-like explanations for enablement decisions.
 */

import type {
  PlatformEnablementDecisionSupport,
  PlatformProductionCandidateScore,
  PlatformEnablementBlocker,
  PlatformEnablementCondition,
} from '../types/index.js';

/**
 * Build platform decision explanation
 */
export function buildPlatformDecisionExplanation(
  platformKey: string,
  decision: string,
  score: PlatformProductionCandidateScore,
  blockers: PlatformEnablementBlocker[],
  conditions: PlatformEnablementCondition[]
): {
  summary: string;
  reasoning: string[];
  evidence: Record<string, unknown>;
  confidence: number;
} {
  const reasoning: string[] = [];

  // Build reasoning based on scores
  if (score.overall !== null) {
    reasoning.push(`Overall readiness score: ${score.overall}%`);
  }

  if (score.governanceSafety !== null) {
    if (score.governanceSafety >= 80) {
      reasoning.push('✓ Governance: Approved');
    } else {
      reasoning.push('✗ Governance: Not approved (score: ' + score.governanceSafety + '%)');
    }
  }

  if (score.previewStability !== null) {
    if (score.previewStability >= 65) {
      reasoning.push('✓ Preview stability: Acceptable');
    } else {
      reasoning.push('✗ Preview stability: Below threshold (score: ' + score.previewStability + '%)');
    }
  }

  if (score.previewUsefulness !== null) {
    if (score.previewUsefulness >= 65) {
      reasoning.push('✓ Preview usefulness: Acceptable');
    } else {
      reasoning.push('✗ Preview usefulness: Below threshold (score: ' + score.previewUsefulness + '%)');
    }
  }

  // Add blocker reasoning
  if (blockers.length > 0) {
    reasoning.push(`Found ${blockers.length} blockers preventing production:`);
    blockers.slice(0, 3).forEach(b => {
      reasoning.push(`  - [${b.severity.toUpperCase()}] ${b.title}`);
    });
  }

  // Add condition reasoning
  if (conditions.length > 0) {
    reasoning.push(`${conditions.length} conditions must be satisfied:`);
    conditions.slice(0, 3).forEach(c => {
      reasoning.push(`  - [${c.severity.toUpperCase()}] ${c.title}`);
    });
  }

  return {
    summary: `Decision for ${platformKey}: ${decision}`,
    reasoning,
    evidence: {
      overallScore: score.overall,
      domainMaturity: score.domainMaturity,
      dataFoundation: score.dataFoundational,
      acquisitionStability: score.acquisitionStability,
      previewStability: score.previewStability,
      previewUsefulness: score.previewUsefulness,
      commercialReadiness: score.commercialReadiness,
      governanceSafety: score.governanceSafety,
      blockerCount: blockers.length,
      conditionCount: conditions.length,
    },
    confidence: calculateExplainabilityConfidence(score, blockers),
  };
}

/**
 * Build platform decision tradeoff summary
 */
export function buildPlatformDecisionTradeoffSummary(
  score: PlatformProductionCandidateScore
): Array<{
  dimension: string;
  status: 'green' | 'yellow' | 'red';
  score: number | null;
  note: string;
}> {
  const summary = [];

  // Domain
  summary.push({
    dimension: 'Domain Knowledge',
    status: getStatus(score.domainMaturity, 70),
    score: score.domainMaturity,
    note: getNote(score.domainMaturity, 70),
  });

  // Data Foundation
  summary.push({
    dimension: 'Data Foundation',
    status: getStatus(score.dataFoundational, 65),
    score: score.dataFoundational,
    note: getNote(score.dataFoundational, 65),
  });

  // Acquisition
  summary.push({
    dimension: 'Acquisition',
    status: getStatus(score.acquisitionStability, 60),
    score: score.acquisitionStability,
    note: getNote(score.acquisitionStability, 60),
  });

  // Preview Stability
  summary.push({
    dimension: 'Preview Stability',
    status: getStatus(score.previewStability, 65),
    score: score.previewStability,
    note: getNote(score.previewStability, 65),
  });

  // Preview Usefulness
  summary.push({
    dimension: 'Preview Usefulness',
    status: getStatus(score.previewUsefulness, 65),
    score: score.previewUsefulness,
    note: getNote(score.previewUsefulness, 65),
  });

  // Commercial
  summary.push({
    dimension: 'Commercial',
    status: getStatus(score.commercialReadiness, 60),
    score: score.commercialReadiness,
    note: getNote(score.commercialReadiness, 60),
  });

  // Governance
  summary.push({
    dimension: 'Governance',
    status: getStatus(score.governanceSafety, 80),
    score: score.governanceSafety,
    note: getNote(score.governanceSafety, 80),
  });

  return summary;
}

/**
 * Build platform decision evidence summary
 */
export function buildPlatformDecisionEvidenceSummary(
  score: PlatformProductionCandidateScore
): Record<string, {
  present: boolean;
  score: number | null;
  meetsThreshold: boolean;
}> {
  return {
    domain: {
      present: score.domainMaturity !== null,
      score: score.domainMaturity,
      meetsThreshold: (score.domainMaturity ?? 0) >= 70,
    },
    dataFoundation: {
      present: score.dataFoundational !== null,
      score: score.dataFoundational,
      meetsThreshold: (score.dataFoundational ?? 0) >= 65,
    },
    acquisition: {
      present: score.acquisitionStability !== null,
      score: score.acquisitionStability,
      meetsThreshold: (score.acquisitionStability ?? 0) >= 60,
    },
    preview: {
      present: score.previewStability !== null && score.previewUsefulness !== null,
      score: score.previewStability,
      meetsThreshold: (score.previewStability ?? 0) >= 65 && (score.previewUsefulness ?? 0) >= 65,
    },
    commercial: {
      present: score.commercialReadiness !== null,
      score: score.commercialReadiness,
      meetsThreshold: (score.commercialReadiness ?? 0) >= 60,
    },
    governance: {
      present: score.governanceSafety !== null,
      score: score.governanceSafety,
      meetsThreshold: (score.governanceSafety ?? 0) >= 80,
    },
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function getStatus(score: number | null, threshold: number): 'green' | 'yellow' | 'red' {
  if (score === null) return 'yellow';
  if (score >= threshold) return 'green';
  if (score >= threshold * 0.8) return 'yellow';
  return 'red';
}

function getNote(score: number | null, threshold: number): string {
  if (score === null) return 'No data available';
  if (score >= threshold) return 'Meets threshold';
  if (score >= threshold * 0.8) return 'Near threshold';
  return 'Below threshold';
}

function calculateExplainabilityConfidence(
  score: PlatformProductionCandidateScore,
  blockers: PlatformEnablementBlocker[]
): number {
  let confidence = 0.7;

  // Count non-null scores
  const scores = [
    score.domainMaturity,
    score.dataFoundational,
    score.acquisitionStability,
    score.previewStability,
    score.previewUsefulness,
    score.commercialReadiness,
    score.governanceSafety,
  ].filter(s => s !== null);

  confidence += scores.length * 0.03;
  confidence -= blockers.length * 0.05;

  return Math.max(0, Math.min(1, confidence));
}
