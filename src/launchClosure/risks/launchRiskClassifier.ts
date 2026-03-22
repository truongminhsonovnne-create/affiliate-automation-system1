/**
 * Launch Risk Classifier
 * Classifies launch risks
 */

import type {
  LaunchRiskRecord,
  LaunchRiskSeverity,
  LaunchRiskStatus,
  LaunchRiskType,
  LaunchBlocker,
  LaunchWarning,
  RiskSummary as TypesRiskSummary,
} from '../types.js';

import {
  CRITICAL_RISK_IS_BLOCKER,
  HIGH_RISK_BLOCKER_THRESHOLD,
} from '../constants.js';

// Re-export from types to avoid naming conflicts
export type RiskSummary = TypesRiskSummary;

export interface RiskClassificationResult {
  blockers: LaunchBlocker[];
  warnings: LaunchWarning[];
  summary: RiskSummary;
}

/**
 * Classify launch risks
 */
export async function classifyLaunchRisks(
  risks: LaunchRiskRecord[]
): Promise<RiskClassificationResult> {
  const blockers = await detectLaunchBlockers(risks);
  const warnings = detectLaunchWarnings(risks, blockers);
  const summary = buildLaunchRiskSummary(risks);

  return {
    blockers,
    warnings,
    summary,
  };
}

/**
 * Detect launch blockers
 */
export async function detectLaunchBlockers(
  risks: LaunchRiskRecord[]
): Promise<LaunchBlocker[]> {
  const blockers: LaunchBlocker[] = [];

  for (const risk of risks) {
    if (risk.riskStatus !== 'open') continue;

    const isBlocker = isRiskABlocker(risk, risks);

    if (isBlocker) {
      blockers.push({
        riskId: risk.id,
        riskType: risk.riskType,
        severity: risk.severity,
        description: extractRiskDescription(risk),
        ownerId: risk.ownerId,
        ownerRole: risk.ownerRole,
        dueAt: risk.dueAt,
      });
    }
  }

  return blockers;
}

/**
 * Detect launch warnings
 */
export function detectLaunchWarnings(
  risks: LaunchRiskRecord[],
  blockers: LaunchBlocker[]
): LaunchWarning[] {
  const warnings: LaunchWarning[] = [];

  const blockerIds = new Set(blockers.map((b) => b.riskId));

  for (const risk of risks) {
    // Skip if already a blocker
    if (blockerIds.has(risk.id)) continue;

    // Skip resolved risks
    if (risk.riskStatus === 'resolved') continue;

    warnings.push({
      riskId: risk.id,
      riskType: risk.riskType,
      severity: risk.severity,
      description: extractRiskDescription(risk),
      isWatchItem: risk.severity === 'medium' || risk.severity === 'low',
    });
  }

  return warnings;
}

/**
 * Build launch risk summary
 */
export function buildLaunchRiskSummary(
  risks: LaunchRiskRecord[]
): RiskSummary {
  return {
    totalRisks: risks.length,
    criticalRisks: risks.filter((r) => r.severity === 'critical').length,
    highRisks: risks.filter((r) => r.severity === 'high').length,
    mediumRisks: risks.filter((r) => r.severity === 'medium').length,
    lowRisks: risks.filter((r) => r.severity === 'low').length,
    openRisks: risks.filter((r) => r.riskStatus === 'open').length,
    mitigatedRisks: risks.filter((r) => r.riskStatus === 'mitigated').length,
    resolvedRisks: risks.filter((r) => r.riskStatus === 'resolved').length,
    launchBlockers: [],
  };
}

/**
 * Check if launch is blocked by risks
 */
export async function isLaunchBlockedByRisks(risks: LaunchRiskRecord[]): Promise<boolean> {
  const blockers = await detectLaunchBlockers(risks);
  return blockers.length > 0;
}

/**
 * Determine if a risk is a blocker
 */
function isRiskABlocker(risk: LaunchRiskRecord, allRisks: LaunchRiskRecord[]): boolean {
  // Critical risks are always blockers
  if (risk.severity === 'critical' && CRITICAL_RISK_IS_BLOCKER) {
    return true;
  }

  // High risks may be blockers depending on count
  if (risk.severity === 'high') {
    const highRiskCount = allRisks.filter(
      (r) => r.severity === 'high' && r.riskStatus === 'open'
    ).length;

    return highRiskCount >= HIGH_RISK_BLOCKER_THRESHOLD;
  }

  return false;
}

/**
 * Extract human-readable risk description
 */
function extractRiskDescription(risk: LaunchRiskRecord): string {
  const payload = risk.riskPayload;
  const description = payload.description as string | undefined;

  if (description) return description;

  return `${risk.riskType} risk - ${risk.severity} severity`;
}

/**
 * Get launch readiness impact from risks
 */
export async function getLaunchReadinessImpact(
  risks: LaunchRiskRecord[]
): Promise<{
  canGo: boolean;
  mustFix: string[];
  shouldWatch: string[];
}> {
  const blockers = await detectLaunchBlockers(risks);
  const warnings = detectLaunchWarnings(risks, blockers);

  const canGo = blockers.length === 0;

  const mustFix = blockers.map((b) => b.description);
  const shouldWatch = warnings.filter((w) => w.isWatchItem).map((w) => w.description);

  return {
    canGo,
    mustFix,
    shouldWatch,
  };
}
