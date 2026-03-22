/**
 * Go/No-Go Decision Service
 * Manages go/no-go decision process
 */

import type {
  LaunchGoNoGoDecision,
  LaunchReadinessStatus,
  LaunchBlocker,
  LaunchWarning,
  LaunchSignoffRecord,
  LaunchSignoffArea,
  LaunchSignoffStatus,
} from '../types.js';

import {
  MAX_CONDITIONAL_REQUIREMENTS,
} from '../constants.js';

export interface GoNoGoInput {
  readinessStatus: LaunchReadinessStatus;
  readinessScore: number;
  blockers: LaunchBlocker[];
  warnings: LaunchWarning[];
  signoffs: LaunchSignoffRecord[];
  decidedBy?: string;
}

/**
 * Build go/no-go decision
 */
export async function buildGoNoGoDecision(
  input: GoNoGoInput
): Promise<LaunchGoNoGoDecision> {
  const { readinessStatus, readinessScore, blockers, warnings, signoffs, decidedBy } = input;

  let decision: 'go' | 'conditional_go' | 'no_go';
  let rationale: string;

  // Determine decision based on readiness status
  switch (readinessStatus) {
    case 'ready':
      decision = 'go';
      rationale = 'All critical items resolved. Launch ready.';
      break;

    case 'conditional_go':
      decision = 'conditional_go';
      rationale = buildConditionalGoRationale(warnings);
      break;

    case 'no_go':
    case 'blocked':
      decision = 'no_go';
      rationale = buildNoGoRationale(blockers);
      break;

    default:
      decision = 'no_go';
      rationale = 'Stabilization incomplete. Cannot proceed.';
  }

  // Build signoff status map
  const signoffStatus = buildSignoffStatusMap(signoffs);

  return {
    decision,
    readinessStatus,
    readinessScore,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    blockers,
    warnings,
    signoffStatus,
    rationale,
    decidedAt: new Date(),
    decidedBy,
  };
}

/**
 * Approve launch go decision
 */
export async function approveLaunchGoDecision(
  decision: LaunchGoNoGoDecision,
  actorId?: string
): Promise<LaunchGoNoGoDecision> {
  return {
    ...decision,
    decision: 'go',
    decidedBy: actorId,
    decidedAt: new Date(),
  };
}

/**
 * Mark launch no-go
 */
export async function markLaunchNoGo(
  decision: LaunchGoNoGoDecision,
  rationale: string,
  actorId?: string
): Promise<LaunchGoNoGoDecision> {
  return {
    ...decision,
    decision: 'no_go',
    readinessStatus: 'no_go',
    rationale,
    decidedBy: actorId,
    decidedAt: new Date(),
  };
}

/**
 * Mark launch conditional go
 */
export async function markLaunchConditionalGo(
  decision: LaunchGoNoGoDecision,
  conditions: string[],
  actorId?: string
): Promise<LaunchGoNoGoDecision> {
  return {
    ...decision,
    decision: 'conditional_go',
    readinessStatus: 'conditional_go',
    rationale: `Conditional GO with ${conditions.length} conditions: ${conditions.join(', ')}`,
    decidedBy: actorId,
    decidedAt: new Date(),
  };
}

/**
 * Build go/no-go explanation
 */
export function buildGoNoGoExplanation(decision: LaunchGoNoGoDecision): string {
  const { decision: d, readinessScore, blockerCount, warningCount, rationale } = decision;

  const scorePercent = Math.round(readinessScore * 100);

  let explanation = `📋 GO/NO-GO DECISION\n`;
  explanation += `═══════════════════\n`;
  explanation += `Decision: ${d.toUpperCase()}\n`;
  explanation += `Readiness Score: ${scorePercent}%\n`;
  explanation += `Blockers: ${blockerCount}\n`;
  explanation += `Warnings: ${warningCount}\n\n`;
  explanation += `Rationale:\n${rationale}\n`;

  if (decision.blockers.length > 0) {
    explanation += `\n🚫 BLOCKERS:\n`;
    decision.blockers.forEach((b, i) => {
      explanation += `${i + 1}. [${b.severity.toUpperCase()}] ${b.description}\n`;
    });
  }

  if (decision.warnings.length > 0) {
    explanation += `\n⚠️ WARNINGS:\n`;
    decision.warnings.slice(0, 5).forEach((w, i) => {
      explanation += `${i + 1}. [${w.severity.toUpperCase()}] ${w.description}\n`;
    });
    if (decision.warnings.length > 5) {
      explanation += `... and ${decision.warnings.length - 5} more\n`;
    }
  }

  return explanation;
}

// Helper functions

function buildConditionalGoRationale(warnings: LaunchWarning[]): string {
  const conditions = warnings
    .slice(0, MAX_CONDITIONAL_REQUIREMENTS)
    .map((w) => w.description);

  return `Conditional GO with ${conditions.length} conditions to monitor: ${conditions.join(', ')}`;
}

function buildNoGoRationale(blockers: LaunchBlocker[]): string {
  if (blockers.length === 0) {
    return 'Launch blocked due to unresolved critical issues.';
  }

  const blockerDescriptions = blockers.map((b) => b.description).join('; ');
  return `NO-GO. ${blockers.length} critical blocker(s): ${blockerDescriptions}`;
}

function buildSignoffStatusMap(
  signoffs: LaunchSignoffRecord[]
): Record<LaunchSignoffArea, LaunchSignoffStatus> {
  const statusMap = {} as Record<LaunchSignoffArea, LaunchSignoffStatus>;

  const requiredAreas: LaunchSignoffArea[] = [
    'product_quality',
    'release_runtime',
    'commercial_safety',
    'multi_platform_support',
    'governance_ops',
  ];

  for (const area of requiredAreas) {
    const signoff = signoffs.find((s) => s.signoffArea === area);
    statusMap[area] = signoff?.signoffStatus ?? 'pending';
  }

  return statusMap;
}
