/**
 * Platform Capability Evaluator
 *
 * Evaluates capability maturity and detects gaps.
 */

import type { PlatformCapabilityArea, PlatformCapabilityDescriptor, PlatformCapabilityStatus, PlatformCapabilitySnapshot } from '../types.js';
import { CAPABILITY_SCORE_THRESHOLDS, CAPABILITY_STATUS_PRIORITY } from '../constants.js';
import { buildPlatformCapabilityModel, detectCapabilityGaps } from './platformCapabilityModel.js';
import { getPlatformCapabilitySnapshotRepository } from '../repositories/platformCapabilitySnapshotRepository.js';

/**
 * Evaluate a single platform capability
 */
export function evaluatePlatformCapability(
  capabilityArea: PlatformCapabilityArea,
  evidence: Record<string, unknown>
): PlatformCapabilityDescriptor {
  const status = determineCapabilityStatus(evidence);
  const score = calculateCapabilityScore(evidence, status);
  const blockers = identifyBlockers(evidence);
  const warnings = identifyWarnings(evidence);
  const dependencies = getCapabilityDependencies(capabilityArea);

  return {
    area: capabilityArea,
    status,
    score,
    description: getCapabilityDescription(capabilityArea),
    blockers,
    warnings,
    dependencies,
  };
}

/**
 * Evaluate a set of platform capabilities
 */
export function evaluatePlatformCapabilitySet(
  platformKey: string,
  evidenceByArea: Partial<Record<PlatformCapabilityArea, Record<string, unknown>>>
): PlatformCapabilityDescriptor[] {
  const capabilities = buildPlatformCapabilityModel(platformKey, {});

  return capabilities.map(cap => {
    const evidence = evidenceByArea[cap.area] || {};
    return evaluatePlatformCapability(cap.area, evidence);
  });
}

/**
 * Build a platform capability snapshot
 */
export async function buildPlatformCapabilitySnapshot(
  platformKey: string,
  capabilities: PlatformCapabilityDescriptor[]
): Promise<PlatformCapabilitySnapshot[]> {
  const repo = getPlatformCapabilitySnapshotRepository();
  const snapshots: PlatformCapabilitySnapshot[] = [];

  for (const cap of capabilities) {
    const snapshot = await repo.create({
      platformKey,
      capabilityArea: cap.area,
      capabilityStatus: cap.status,
      capabilityScore: cap.score,
      capabilityPayload: {
        description: cap.description,
        blockers: cap.blockers,
        warnings: cap.warnings,
        dependencies: cap.dependencies,
      },
    });
    snapshots.push(snapshot);
  }

  return snapshots;
}

/**
 * Detect capability gaps for a platform
 */
export function detectGaps(
  capabilities: PlatformCapabilityDescriptor[]
): Array<{ area: PlatformCapabilityArea; missingDependencies: PlatformCapabilityArea[] }> {
  return detectCapabilityGaps(capabilities);
}

/**
 * Determine capability status from evidence
 */
function determineCapabilityStatus(evidence: Record<string, unknown>): PlatformCapabilityStatus {
  // Check for explicit status
  if (evidence.status) {
    const status = String(evidence.status).toLowerCase();
    if (['not_started', 'in_progress', 'partial', 'complete', 'verified', 'unsupported'].includes(status)) {
      return status as PlatformCapabilityStatus;
    }
  }

  // Determine status from progress indicators
  const hasImplementation = Boolean(evidence.hasImplementation || evidence.implemented);
  const hasTests = Boolean(evidence.hasTests || evidence.tested);
  const hasDocumentation = Boolean(evidence.hasDocumentation || evidence.documented);
  const isInProduction = Boolean(evidence.inProduction || evidence.productionReady);
  const completionPercent = Number(evidence.completionPercent || evidence.progress || 0);

  if (isInProduction && hasTests && hasDocumentation) {
    return 'verified';
  }
  if (hasImplementation && completionPercent >= 90) {
    return 'complete';
  }
  if (completionPercent >= 50 || hasImplementation) {
    return 'partial';
  }
  if (completionPercent > 0) {
    return 'in_progress';
  }

  return 'not_started';
}

/**
 * Calculate capability score
 */
function calculateCapabilityScore(
  evidence: Record<string, unknown>,
  status: PlatformCapabilityStatus
): number {
  // If explicitly set, use that
  if (typeof evidence.score === 'number') {
    return Math.min(Math.max(evidence.score, 0), 1);
  }

  // Calculate based on status
  switch (status) {
    case 'verified':
      return 1.0;
    case 'complete':
      return 0.95;
    case 'partial':
      return 0.6;
    case 'in_progress':
      return 0.3;
    case 'not_started':
      return 0;
    case 'unsupported':
      return 0;
    default:
      return 0;
  }
}

/**
 * Identify blockers
 */
function identifyBlockers(evidence: Record<string, unknown>): string[] {
  const blockers: string[] = [];

  if (evidence.criticalBlocker) {
    blockers.push(String(evidence.criticalBlocker));
  }

  if (evidence.blockers && Array.isArray(evidence.blockers)) {
    blockers.push(...evidence.blockers.map(String));
  }

  // Auto-detect from evidence
  if (evidence.missingCoreComponents) {
    blockers.push('Missing core components');
  }

  if (evidence.unresolvedDependencies) {
    blockers.push('Unresolved dependencies');
  }

  if (evidence.integrationBlocked) {
    blockers.push('Integration blocked by external factors');
  }

  return blockers;
}

/**
 * Identify warnings
 */
function identifyWarnings(evidence: Record<string, unknown>): string[] {
  const warnings: string[] = [];

  if (evidence.warnings && Array.isArray(evidence.warnings)) {
    warnings.push(...evidence.warnings.map(String));
  }

  // Auto-detect from evidence
  if (evidence.partialCoverage) {
    warnings.push('Partial coverage of use cases');
  }

  if (evidence.knownIssues) {
    warnings.push('Known issues present');
  }

  if (!evidence.hasTests && evidence.hasImplementation) {
    warnings.push('No tests implemented');
  }

  if (!evidence.hasDocumentation && evidence.hasImplementation) {
    warnings.push('No documentation');
  }

  return warnings;
}

/**
 * Get capability description
 */
function getCapabilityDescription(area: PlatformCapabilityArea): string {
  const descriptions: Record<PlatformCapabilityArea, string> = {
    product_reference_parsing: 'Product reference parsing capability',
    product_context_resolution: 'Product context resolution capability',
    promotion_rule_modeling: 'Promotion rule modeling capability',
    public_flow_support: 'Public flow support capability',
    commercial_attribution: 'Commercial attribution capability',
    growth_surface_support: 'Growth surface support capability',
    ops_governance_support: 'Operations & governance support capability',
    bi_readiness_support: 'BI & reporting support capability',
  };
  return descriptions[area] || 'Unknown capability';
}

/**
 * Get capability dependencies
 */
function getCapabilityDependencies(area: PlatformCapabilityArea): PlatformCapabilityArea[] {
  const deps: Record<PlatformCapabilityArea, PlatformCapabilityArea[]> = {
    product_reference_parsing: [],
    product_context_resolution: ['product_reference_parsing'],
    promotion_rule_modeling: ['product_context_resolution'],
    public_flow_support: ['product_reference_parsing', 'product_context_resolution'],
    commercial_attribution: ['public_flow_support', 'promotion_rule_modeling'],
    growth_surface_support: ['public_flow_support'],
    ops_governance_support: ['commercial_attribution'],
    bi_readiness_support: ['commercial_attribution', 'growth_surface_support'],
  };
  return deps[area] || [];
}
