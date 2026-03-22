/**
 * Signoff Service
 * Manages launch signoffs
 */

import type {
  LaunchSignoffRecord,
  LaunchSignoffInput,
  LaunchSignoffArea,
  LaunchSignoffStatus,
} from '../types.js';

import { REQUIRED_SIGNOFF_AREAS } from '../constants.js';

export interface SignoffSummary {
  totalRequired: number;
  totalApproved: number;
  totalRejected: number;
  totalPending: number;
  totalConditional: number;
  missingSignoffs: LaunchSignoffArea[];
}

/**
 * Create launch signoff
 */
export async function createLaunchSignoff(
  input: LaunchSignoffInput
): Promise<LaunchSignoffRecord> {
  return {
    id: generateSignoffId(),
    launchReviewId: input.launchReviewId,
    signoffArea: input.signoffArea,
    signoffStatus: 'pending',
    signoffPayload: input.signoffPayload,
    actorId: input.actorId,
    actorRole: input.actorRole,
    createdAt: new Date(),
  };
}

/**
 * Complete launch signoff
 */
export async function completeLaunchSignoff(
  signoff: LaunchSignoffRecord,
  status: 'approved' | 'rejected' | 'conditional',
  actorId?: string
): Promise<LaunchSignoffRecord> {
  return {
    ...signoff,
    signoffStatus: status,
    actorId: actorId ?? signoff.actorId,
    signoffPayload: {
      ...signoff.signoffPayload,
      completedAt: new Date().toISOString(),
    },
  };
}

/**
 * Get launch signoff summary
 */
export async function getLaunchSignoffSummary(
  signoffs: LaunchSignoffRecord[]
): Promise<SignoffSummary> {
  const totalApproved = signoffs.filter((s) => s.signoffStatus === 'approved').length;
  const totalRejected = signoffs.filter((s) => s.signoffStatus === 'rejected').length;
  const totalPending = signoffs.filter((s) => s.signoffStatus === 'pending').length;
  const totalConditional = signoffs.filter((s) => s.signoffStatus === 'conditional').length;

  // Find missing signoffs
  const signedAreas = new Set(signoffs.map((s) => s.signoffArea));
  const missingSignoffs = REQUIRED_SIGNOFF_AREAS.filter(
    (area) => !signedAreas.has(area as LaunchSignoffArea)
  ) as LaunchSignoffArea[];

  return {
    totalRequired: REQUIRED_SIGNOFF_AREAS.length,
    totalApproved,
    totalRejected,
    totalPending,
    totalConditional,
    missingSignoffs,
  };
}

/**
 * Detect missing critical signoffs
 */
export async function detectMissingCriticalSignoffs(
  signoffs: LaunchSignoffRecord[]
): Promise<LaunchSignoffArea[]> {
  const summary = await getLaunchSignoffSummary(signoffs);
  return summary.missingSignoffs;
}

/**
 * Check if all required signoffs are approved
 */
export async function hasAllRequiredSignoffs(signoffs: LaunchSignoffRecord[]): Promise<boolean> {
  const summary = await getLaunchSignoffSummary(signoffs);
  return (
    summary.missingSignoffs.length === 0 &&
    summary.totalApproved === summary.totalRequired
  );
}

function generateSignoffId(): string {
  return `signoff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
