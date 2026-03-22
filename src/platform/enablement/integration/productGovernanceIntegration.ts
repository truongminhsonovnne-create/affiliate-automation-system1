/**
 * Product Governance Integration
 *
 * Integrates with product governance / Product Ops / founder cockpit.
 */

import type { PlatformProductionCandidateScore, PlatformEnablementBlocker, PlatformEnablementCondition } from '../types/index.js';

/**
 * Build platform governance signals
 */
export async function buildPlatformGovernanceSignals(
  platformKey: string,
  score: PlatformProductionCandidateScore,
  blockers: PlatformEnablementBlocker[],
  conditions: PlatformEnablementCondition[]
): Promise<{
  governanceSignals: Array<{
    signalType: string;
    severity: string;
    message: string;
    actionRequired: boolean;
  }>;
  overallGovernanceStatus: 'green' | 'yellow' | 'red';
}> {
  const governanceSignals = [];

  // Governance safety signal
  if (score.governanceSafety !== null) {
    if (score.governanceSafety >= 80) {
      governanceSignals.push({
        signalType: 'governance_approval',
        severity: 'green',
        message: 'Governance approved',
        actionRequired: false,
      });
    } else if (score.governanceSafety >= 60) {
      governanceSignals.push({
        signalType: 'governance_approval',
        severity: 'yellow',
        message: `Governance pending (score: ${score.governanceSafety}%)`,
        actionRequired: true,
      });
    } else {
      governanceSignals.push({
        signalType: 'governance_approval',
        severity: 'red',
        message: `Governance not approved (score: ${score.governanceSafety}%)`,
        actionRequired: true,
      });
    }
  }

  // Blocker signals
  const criticalBlockers = blockers.filter(b => b.severity === 'critical');
  if (criticalBlockers.length > 0) {
    governanceSignals.push({
      signalType: 'critical_blockers',
      severity: 'red',
      message: `${criticalBlockers.length} critical blocker(s) present`,
      actionRequired: true,
    });
  }

  // Condition signals
  if (conditions.length > 0) {
    governanceSignals.push({
      signalType: 'pending_conditions',
      severity: 'yellow',
      message: `${conditions.length} condition(s) must be satisfied`,
      actionRequired: true,
    });
  }

  // Determine overall status
  const hasRed = governanceSignals.some(s => s.severity === 'red');
  const hasYellow = governanceSignals.some(s => s.severity === 'yellow');
  const overallGovernanceStatus = hasRed ? 'red' : hasYellow ? 'yellow' : 'green';

  return {
    governanceSignals,
    overallGovernanceStatus,
  };
}

/**
 * Build platform ops followups
 */
export function buildPlatformOpsFollowups(
  platformKey: string,
  score: PlatformProductionCandidateScore,
  blockers: PlatformEnablementBlocker[],
  conditions: PlatformEnablementCondition[]
): Array<{
  followupType: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  owner?: string;
  dueIn?: number;
}> {
  const followups = [];

  // Critical blocker followups
  const criticalBlockers = blockers.filter(b => b.severity === 'critical');
  for (const blocker of criticalBlockers) {
    followups.push({
      followupType: 'blocker_resolution',
      priority: 'critical',
      title: `Resolve: ${blocker.title}`,
      description: blocker.description,
      owner: blocker.resolutionAction || undefined,
      dueIn: blocker.estimatedResolutionDays || 7,
    });
  }

  // High blocker followups
  const highBlockers = blockers.filter(b => b.severity === 'high');
  for (const blocker of highBlockers) {
    followups.push({
      followupType: 'blocker_resolution',
      priority: 'high',
      title: `Address: ${blocker.title}`,
      description: blocker.description,
      owner: blocker.resolutionAction || undefined,
      dueIn: blocker.estimatedResolutionDays || 14,
    });
  }

  // Condition followups
  for (const condition of conditions) {
    if (condition.conditionStatus === 'pending') {
      followups.push({
        followupType: 'condition_satisfaction',
        priority: condition.severity === 'critical' ? 'critical' : condition.severity === 'high' ? 'high' : 'medium',
        title: `Satisfy: ${condition.title}`,
        description: condition.description,
        owner: condition.assignedTo || undefined,
        dueIn: condition.estimatedResolutionDays || 14,
      });
    }
  }

  // Operator readiness followup
  if (score.operatorReadiness !== null && score.operatorReadiness < 70) {
    followups.push({
      followupType: 'operator_readiness',
      priority: 'medium',
      title: 'Complete operator onboarding',
      description: `Operator readiness at ${score.operatorReadiness}%`,
      dueIn: 14,
    });
  }

  return followups;
}

/**
 * Build platform founder decision inputs
 */
export function buildPlatformFounderDecisionInputs(
  platformKey: string,
  score: PlatformProductionCandidateScore,
  blockers: PlatformEnablementBlocker[],
  conditions: PlatformEnablementCondition[]
): {
  decisionContext: {
    platform: string;
    currentStatus: string;
    readinessScore: number | null;
    blockerCount: number;
    conditionCount: number;
  };
  recommendation: string;
  keyConsiderations: string[];
  riskAssessment: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    keyRisks: string[];
  };
  requiredActions: Array<{
    action: string;
    owner?: string;
    timeline?: string;
  }>;
} {
  // Determine recommendation
  let recommendation = 'NOT READY';
  if (score.overall !== null) {
    if (score.overall >= 75) recommendation = 'APPROVE PRODUCTION CANDIDATE';
    else if (score.overall >= 55) recommendation = 'APPROVE WITH CONDITIONS';
    else recommendation = 'NOT READY - ADDRESS BLOCKERS';
  }

  // Build key considerations
  const keyConsiderations = [];

  if (score.governanceSafety !== null) {
    keyConsiderations.push(`Governance: ${score.governanceSafety}% (threshold: 80%)`);
  }

  if (score.previewStability !== null) {
    keyConsiderations.push(`Preview Stability: ${score.previewStability}% (threshold: 65%)`);
  }

  if (score.previewUsefulness !== null) {
    keyConsiderations.push(`Preview Usefulness: ${score.previewUsefulness}% (threshold: 65%)`);
  }

  if (score.commercialReadiness !== null) {
    keyConsiderations.push(`Commercial Readiness: ${score.commercialReadiness}%`);
  }

  // Risk assessment
  const criticalBlockers = blockers.filter(b => b.severity === 'critical');
  const highBlockers = blockers.filter(b => b.severity === 'high');

  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  const keyRisks: string[] = [];

  if (criticalBlockers.length > 0) {
    riskLevel = 'critical';
    keyRisks.push(`${criticalBlockers.length} critical blocker(s)`);
  } else if (highBlockers.length > 0) {
    riskLevel = 'high';
    keyRisks.push(`${highBlockers.length} high-severity blocker(s)`);
  }

  if (score.governanceSafety !== null && score.governanceSafety < 80) {
    keyRisks.push('Governance not fully approved');
  }

  if (score.previewStability !== null && score.previewStability < 65) {
    keyRisks.push('Preview stability below threshold');
  }

  // Required actions
  const requiredActions = [];

  for (const blocker of blockers.slice(0, 5)) {
    requiredActions.push({
      action: blocker.title,
      timeline: blocker.estimatedResolutionDays ? `~${blocker.estimatedResolutionDays} days` : undefined,
    });
  }

  for (const condition of conditions.slice(0, 3)) {
    requiredActions.push({
      action: condition.title,
      timeline: condition.estimatedResolutionDays ? `~${condition.estimatedResolutionDays} days` : undefined,
    });
  }

  return {
    decisionContext: {
      platform: platformKey,
      currentStatus: blockers.length > 0 ? 'Has Blockers' : 'Ready for Review',
      readinessScore: score.overall,
      blockerCount: blockers.length,
      conditionCount: conditions.length,
    },
    recommendation,
    keyConsiderations,
    riskAssessment: {
      riskLevel,
      keyRisks,
    },
    requiredActions,
  };
}
