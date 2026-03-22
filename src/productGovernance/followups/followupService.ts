/**
 * Follow-up Service
 *
 * Manages governance follow-ups.
 */

import {
  ProductGovernanceFollowup,
  ProductGovernanceFollowupType,
  ProductGovernanceFollowupStatus,
} from '../types';
import { FOLLOWUP_CONFIG } from '../constants';

export interface CreateFollowupInput {
  sourceDecisionId?: string;
  followupType: ProductGovernanceFollowupType;
  targetEntityType?: string;
  targetEntityId?: string;
  payload: Record<string, unknown>;
  assignedTo?: string;
  dueAt?: Date;
}

/**
 * Create a governance follow-up
 */
export async function createGovernanceFollowup(
  input: CreateFollowupInput
): Promise<ProductGovernanceFollowup> {
  const dueAt = input.dueAt || calculateDueDate(input.followupType);

  // In real implementation, insert into database
  return {
    id: crypto.randomUUID(),
    sourceDecisionId: input.sourceDecisionId || null,
    followupType: input.followupType,
    followupStatus: ProductGovernanceFollowupStatus.PENDING,
    targetEntityType: input.targetEntityType || null,
    targetEntityId: input.targetEntityId || null,
    payload: input.payload,
    assignedTo: input.assignedTo || null,
    dueAt,
    createdAt: new Date(),
    completedAt: null,
  };
}

/**
 * Complete a governance follow-up
 */
export async function completeGovernanceFollowup(
  followupId: string,
  completionNotes?: string
): Promise<ProductGovernanceFollowup> {
  // In real implementation, update database
  return {
    id: followupId,
    sourceDecisionId: null,
    followupType: ProductGovernanceFollowupType.MITIGATION,
    followupStatus: ProductGovernanceFollowupStatus.COMPLETED,
    targetEntityType: null,
    targetEntityId: null,
    payload: { completionNotes },
    assignedTo: null,
    dueAt: null,
    createdAt: new Date(),
    completedAt: new Date(),
  };
}

/**
 * Get open governance follow-ups
 */
export async function getOpenGovernanceFollowups(
  filters?: {
    assignedTo?: string;
    type?: ProductGovernanceFollowupType;
    targetEntityType?: string;
  }
): Promise<ProductGovernanceFollowup[]> {
  // In real implementation, query database with filters
  return [];
}

/**
 * Detect stale governance follow-ups
 */
export async function detectStaleGovernanceFollowups(): Promise<ProductGovernanceFollowup[]> {
  const staleThreshold = FOLLOWUP_CONFIG.STALE_THRESHOLD_DAYS;
  const overdueThreshold = FOLLOWUP_CONFIG.OVERDUE_THRESHOLD_DAYS;

  // In real implementation, query for follow-ups that are:
  // - Still pending/in_progress
  // - Past their due date by overdueThreshold days
  // Or haven't been updated in staleThreshold days

  return [];
}

/**
 * Get follow-up backlog summary
 */
export async function getFollowupBacklogSummary(): Promise<{
  total: number;
  byType: Record<string, number>;
  overdue: number;
  dueThisWeek: number;
}> {
  // In real implementation, aggregate from database
  return {
    total: 0,
    byType: {},
    overdue: 0,
    dueThisWeek: 0,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateDueDate(followupType: ProductGovernanceFollowupType): Date {
  const days = getDefaultDueDays(followupType);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + days);
  return dueDate;
}

function getDefaultDueDays(followupType: ProductGovernanceFollowupType): number {
  switch (followupType) {
    case ProductGovernanceFollowupType.ROLLBACK_REVIEW:
      return 1;
    case ProductGovernanceFollowupType.MITIGATION:
      return FOLLOWUP_CONFIG.DEFAULT_MITIGATION_DUE_DAYS;
    case ProductGovernanceFollowupType.QUALITY_INVESTIGATION:
      return FOLLOWUP_CONFIG.DEFAULT_INVESTIGATION_DUE_DAYS;
    case ProductGovernanceFollowupType.REMEDIATION_VERIFICATION:
      return FOLLOWUP_CONFIG.DEFAULT_VERIFICATION_DUE_DAYS;
    case ProductGovernanceFollowupType.EXPERIMENT_MONITORING:
      return FOLLOWUP_CONFIG.DEFAULT_MONITORING_DUE_DAYS;
    default:
      return 7;
  }
}
