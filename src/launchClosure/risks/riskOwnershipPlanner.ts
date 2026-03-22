/**
 * Risk Ownership Planner
 * Assigns ownership to launch risks
 */

import type {
  LaunchRiskRecord,
  LaunchRiskSeverity,
} from '../types.js';

export interface OwnershipAssignment {
  ownerId: string;
  ownerRole: string;
  assignedAt: Date;
}

export interface OwnershipSummary {
  totalRisks: number;
  ownedRisks: number;
  unownedRisks: number;
  criticalUnownedRisks: number;
}

/**
 * Assign launch risk ownership
 */
export async function assignLaunchRiskOwnership(
  risks: LaunchRiskRecord[],
  ownershipMap: Record<string, { ownerId: string; ownerRole: string }>
): Promise<LaunchRiskRecord[]> {
  return risks.map((risk) => {
    const ownership = ownershipMap[risk.riskType];

    if (ownership) {
      return {
        ...risk,
        ownerId: ownership.ownerId,
        ownerRole: ownership.ownerRole,
      };
    }

    // Default ownership based on risk type
    const defaultOwnership = getDefaultOwnership(risk.riskType);
    return {
      ...risk,
      ownerId: risk.ownerId ?? defaultOwnership.ownerId,
      ownerRole: risk.ownerRole ?? defaultOwnership.ownerRole,
    };
  });
}

/**
 * Build risk ownership summary
 */
export function buildRiskOwnershipSummary(risks: LaunchRiskRecord[]): OwnershipSummary {
  const ownedRisks = risks.filter((r) => r.ownerId);
  const unownedRisks = risks.filter((r) => !r.ownerId);
  const criticalUnownedRisks = unownedRisks.filter(
    (r) => r.severity === 'critical'
  );

  return {
    totalRisks: risks.length,
    ownedRisks: ownedRisks.length,
    unownedRisks: unownedRisks.length,
    criticalUnownedRisks: criticalUnownedRisks.length,
  };
}

/**
 * Detect unowned critical risks
 */
export function detectUnownedCriticalRisks(
  risks: LaunchRiskRecord[]
): LaunchRiskRecord[] {
  return risks.filter(
    (r) => r.severity === 'critical' && !r.ownerId
  );
}

/**
 * Get default ownership for risk type
 */
function getDefaultOwnership(
  riskType: string
): { ownerId: string; ownerRole: string } {
  const ownershipMap: Record<string, { ownerId: string; ownerRole: string }> = {
    runtime: { ownerId: 'platform-team', ownerRole: 'tech-lead' },
    public_flow: { ownerId: 'product-team', ownerRole: 'product-manager' },
    commercial: { ownerId: 'commercial-team', ownerRole: 'commercial-lead' },
    governance: { ownerId: 'governance-team', ownerRole: 'governance-lead' },
    multi_platform: { ownerId: 'platform-team', ownerRole: 'tech-lead' },
    ops: { ownerId: 'ops-team', ownerRole: 'ops-lead' },
    security: { ownerId: 'security-team', ownerRole: 'security-lead' },
    compliance: { ownerId: 'compliance-team', ownerRole: 'compliance-lead' },
  };

  return ownershipMap[riskType] ?? { ownerId: 'unknown', ownerRole: 'unknown' };
}
