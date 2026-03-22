/**
 * Signoff Policy
 * Defines signoff policies and requirements
 */

import type { LaunchSignoffArea } from '../types.js';

import { REQUIRED_SIGNOFF_AREAS } from '../constants.js';

export interface SignoffPolicy {
  area: LaunchSignoffArea;
  isRequired: boolean;
  requiresApproval: boolean;
  approvalLevel: string;
  autoTimeout: number; // hours
}

export interface SignoffProgress {
  area: LaunchSignoffArea;
  status: 'pending' | 'approved' | 'rejected' | 'conditional';
  isRequired: boolean;
  isComplete: boolean;
}

/**
 * Build launch signoff policy
 */
export function buildLaunchSignoffPolicy(): SignoffPolicy[] {
  return REQUIRED_SIGNOFF_AREAS.map((area) => ({
    area: area as LaunchSignoffArea,
    isRequired: true,
    requiresApproval: true,
    approvalLevel: getApprovalLevel(area),
    autoTimeout: getAutoTimeout(area),
  }));
}

/**
 * Check if signoff is required for area
 */
export function requiresSignoffForArea(area: LaunchSignoffArea): boolean {
  return REQUIRED_SIGNOFF_AREAS.includes(area as typeof REQUIRED_SIGNOFF_AREAS[number]);
}

/**
 * Validate signoff progress
 */
export function validateSignoffProgress(
  signoffs: Array<{ area: LaunchSignoffArea; status: string }>
): {
  isValid: boolean;
  missingRequired: LaunchSignoffArea[];
  rejectedRequired: LaunchSignoffArea[];
} {
  const missingRequired: LaunchSignoffArea[] = [];
  const rejectedRequired: LaunchSignoffArea[] = [];

  for (const area of REQUIRED_SIGNOFF_AREAS) {
    const signoff = signoffs.find((s) => s.area === area);

    if (!signoff) {
      missingRequired.push(area as LaunchSignoffArea);
    } else if (signoff.status === 'rejected') {
      rejectedRequired.push(area as LaunchSignoffArea);
    }
  }

  return {
    isValid: missingRequired.length === 0 && rejectedRequired.length === 0,
    missingRequired,
    rejectedRequired,
  };
}

/**
 * Get approval level for area
 */
function getApprovalLevel(area: string): string {
  const levels: Record<string, string> = {
    product_quality: 'product-lead',
    release_runtime: 'tech-lead',
    commercial_safety: 'commercial-lead',
    multi_platform_support: 'platform-lead',
    governance_ops: 'governance-lead',
  };

  return levels[area] ?? 'lead';
}

/**
 * Get auto-timeout for area (hours)
 */
function getAutoTimeout(area: string): number {
  const timeouts: Record<string, number> = {
    product_quality: 24,
    release_runtime: 12,
    commercial_safety: 24,
    multi_platform_support: 24,
    governance_ops: 48,
  };

  return timeouts[area] ?? 24;
}
