/**
 * Founder Decision Builder
 */

import type { FounderDecisionItem, FounderDecisionArea, FounderDecisionSeverity } from '../types.js';

export async function buildFounderDecisionQueue(): Promise<FounderDecisionItem[]> {
  return []; // Simplified - would integrate with decision support
}

export async function buildScaleDecisionItem(surface: string, metrics: Record<string, number>): Promise<FounderDecisionItem> {
  return {
    id: '',
    area: 'growth',
    severity: 'high',
    status: 'pending',
    title: `Scale: ${surface}`,
    summary: `Surface showing strong growth`,
    evidence: metrics,
    recommendation: 'SCALE',
    targetEntityType: 'surface',
    targetEntityId: surface,
    createdAt: new Date(),
  };
}

export async function buildPauseOrDeindexDecisionItem(surface: string, reason: string): Promise<FounderDecisionItem> {
  return {
    id: '',
    area: 'growth',
    severity: 'high',
    status: 'pending',
    title: `Pause: ${surface}`,
    summary: reason,
    evidence: {},
    recommendation: 'PAUSE',
    targetEntityType: 'surface',
    targetEntityId: surface,
    createdAt: new Date(),
  };
}

export async function buildReleaseDecisionItem(release: string, blockers: number): Promise<FounderDecisionItem> {
  return {
    id: '',
    area: 'release',
    severity: blockers > 2 ? 'critical' : 'medium',
    status: 'pending',
    title: blockers > 0 ? `Release Blocked: ${release}` : `Release Ready: ${release}`,
    summary: `${blockers} active blockers`,
    evidence: { blockers },
    recommendation: blockers > 0 ? 'BLOCK' : 'APPROVE',
    targetEntityType: 'release',
    targetEntityId: release,
    createdAt: new Date(),
  };
}

export async function buildRemediationPriorityDecisionItem(item: string, priority: string): Promise<FounderDecisionItem> {
  return {
    id: '',
    area: 'product_ops',
    severity: priority as FounderDecisionSeverity,
    status: 'pending',
    title: `Remediation Priority: ${item}`,
    summary: 'Requires immediate attention',
    evidence: {},
    recommendation: 'PRIORITIZE',
    targetEntityType: 'remediation',
    targetEntityId: item,
    createdAt: new Date(),
  };
}
