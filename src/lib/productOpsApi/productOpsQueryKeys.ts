/**
 * Product Ops Query Keys
 *
 * Centralized query key definitions for React Query
 */

export const PRODUCT_OPS_QUERY_KEYS = {
  // Queue
  reviewQueue: ['productOps', 'reviewQueue'] as const,
  reviewQueueFilters: (filters: Record<string, unknown>) =>
    ['productOps', 'reviewQueue', 'filters', filters] as const,

  // Cases
  caseDetail: (caseId: string) =>
    ['productOps', 'case', caseId] as const,
  caseHistory: (caseId: string) =>
    ['productOps', 'case', caseId, 'history'] as const,

  // Remediations
  remediationQueue: ['productOps', 'remediationQueue'] as const,
  remediationQueueFilters: (filters: Record<string, unknown>) =>
    ['productOps', 'remediationQueue', 'filters', filters] as const,
  remediationDetail: (remediationId: string) =>
    ['productOps', 'remediation', remediationId] as const,

  // Workbench
  workbenchSummary: ['productOps', 'workbench', 'summary'] as const,
  workbenchTrends: (period: string) =>
    ['productOps', 'workbench', 'trends', period] as const,
  workbenchImpact: (period: string) =>
    ['productOps', 'workbench', 'impact', period] as const,

  // Users/Assignments
  assignees: ['productOps', 'assignees'] as const,
  currentUser: ['productOps', 'currentUser'] as const,
} as const;

export type ProductOpsQueryKey = typeof PRODUCT_OPS_QUERY_KEYS;
