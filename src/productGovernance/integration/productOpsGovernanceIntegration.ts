/**
 * Product Ops Governance Integration
 *
 * Integrates Product Ops cases with governance signals.
 */

import {
  ProductGovernanceSignal,
  ProductGovernanceSignalType,
  ProductGovernanceSeverity,
} from '../types';
import { buildGovernanceSignalFromProductOpsCase } from '../signals/governanceSignalBuilder';

export interface ProductOpsCaseSummary {
  id: string;
  caseKey: string;
  caseType: string;
  severity: string;
  status: string;
  isStale: boolean;
  daysInQueue: number;
  hasRecommendation: boolean;
}

export interface ProductOpsRemediationSummary {
  id: string;
  remediationKey: string;
  status: string;
  risk: string;
  dueAt?: Date;
  isOverdue: boolean;
}

/**
 * Collect governance signals from Product Ops cases
 */
export async function collectGovernanceSignalsFromProductOps(): Promise<ProductGovernanceSignal[]> {
  const signals: ProductGovernanceSignal[] = [];

  // Fetch open high-severity cases
  const openCases = await fetchOpenHighSeverityCases();

  for (const caseData of openCases) {
    const signal = buildGovernanceSignalFromProductOpsCase(caseData);
    signals.push({
      id: crypto.randomUUID(),
      ...signal,
      createdAt: new Date(),
    });
  }

  return signals;
}

/**
 * Collect blocking issues from Product Ops cases
 */
export async function collectBlockingIssuesFromProductOps(): Promise<ProductGovernanceSignal[]> {
  const signals: ProductGovernanceSignal[] = [];

  // Fetch critical and high severity cases that are open
  const criticalCases = await fetchCriticalAndHighCases();

  for (const caseData of criticalCases) {
    // Only include if blocking (critical severity or stale high)
    if (
      caseData.severity === 'critical' ||
      (caseData.severity === 'high' && caseData.isStale)
    ) {
      const signal = buildGovernanceSignalFromProductOpsCase(caseData);
      signals.push({
        id: crypto.randomUUID(),
        ...signal,
        createdAt: new Date(),
      });
    }
  }

  return signals;
}

/**
 * Collect open remediation risks
 */
export async function collectOpenRemediationRisks(): Promise<ProductGovernanceSignal[]> {
  const signals: ProductGovernanceSignal[] = [];

  // Fetch pending/approved remediations that are overdue
  const overdueRemediations = await fetchOverdueRemediations();

  for (const remediation of overdueRemediations) {
    const signal = buildRemediationSignal(remediation);
    signals.push(signal);
  }

  return signals;
}

/**
 * Build a signal from a remediation
 */
function buildRemediationSignal(remediation: ProductOpsRemediationSummary): ProductGovernanceSignal {
  // Determine severity from risk level
  let severity: ProductGovernanceSeverity;
  switch (remediation.risk) {
    case 'critical':
      severity = ProductGovernanceSeverity.CRITICAL;
      break;
    case 'high':
      severity = ProductGovernanceSeverity.HIGH;
      break;
    case 'medium':
      severity = ProductGovernanceSeverity.MEDIUM;
      break;
    default:
      severity = ProductGovernanceSeverity.LOW;
  }

  return {
    id: crypto.randomUUID(),
    signalType: ProductGovernanceSignalType.PRODUCT_OPS_CASE,
    signalSource: 'product_ops_remediations',
    severity,
    targetEntityType: 'remediation',
    targetEntityId: remediation.id,
    payload: remediation as unknown as Record<string, unknown>,
    isActive: remediation.status !== 'executed' && remediation.status !== 'cancelled',
    createdAt: new Date(),
  };
}

/**
 * Fetch open high-severity cases (simulated)
 */
async function fetchOpenHighSeverityCases(): Promise<ProductOpsCaseSummary[]> {
  // In real implementation, query Product Ops API/database
  // This is a placeholder
  return [];
}

/**
 * Fetch critical and high severity cases (simulated)
 */
async function fetchCriticalAndHighCases(): Promise<ProductOpsCaseSummary[]> {
  // In real implementation, query Product Ops API/database
  return [];
}

/**
 * Fetch overdue remediations (simulated)
 */
async function fetchOverdueRemediations(): Promise<ProductOpsRemediationSummary[]> {
  // In real implementation, query Product Ops API/database
  return [];
}

/**
 * Get Product Ops summary for governance reporting
 */
export async function getProductOpsGovernanceSummary(): Promise<{
  openCases: number;
  criticalCases: number;
  highCases: number;
  staleCases: number;
  overdueRemediations: number;
}> {
  // In real implementation, aggregate from database
  return {
    openCases: 0,
    criticalCases: 0,
    highCases: 0,
    staleCases: 0,
    overdueRemediations: 0,
  };
}
