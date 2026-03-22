/**
 * Product Ops Invalidation Strategy
 *
 * Handles query invalidation and refetch strategy for Product Ops
 */

import { QueryClient } from '@tanstack/react-query';
import { PRODUCT_OPS_QUERY_KEYS } from '../../../lib/productOpsApi/productOpsQueryKeys';
import { QUERY_CONFIG } from '../constants';

// ========================================================================
// Review Queue Invalidation
// ========================================================================

/**
 * Invalidate all review queue queries
 */
export function invalidateReviewQueueQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({
    queryKey: PRODUCT_OPS_QUERY_KEYS.reviewQueue,
  });
}

/**
 * Invalidate review queue with specific filters
 */
export function invalidateReviewQueueWithFilters(
  queryClient: QueryClient,
  filters: Record<string, unknown>
): void {
  queryClient.invalidateQueries({
    queryKey: PRODUCT_OPS_QUERY_KEYS.reviewQueueFilters(filters),
  });
}

// ========================================================================
// Case Detail Invalidation
// ========================================================================

/**
 * Invalidate specific case detail query
 */
export function invalidateCaseDetailQueries(
  queryClient: QueryClient,
  caseId: string
): void {
  queryClient.invalidateQueries({
    queryKey: PRODUCT_OPS_QUERY_KEYS.caseDetail(caseId),
  });
  queryClient.invalidateQueries({
    queryKey: PRODUCT_OPS_QUERY_KEYS.caseHistory(caseId),
  });
}

// ========================================================================
// Remediation Invalidation
// ========================================================================

/**
 * Invalidate all remediation queries
 */
export function invalidateRemediationQueries(
  queryClient: QueryClient,
  remediationId?: string
): void {
  queryClient.invalidateQueries({
    queryKey: PRODUCT_OPS_QUERY_KEYS.remediationQueue,
  });

  if (remediationId) {
    queryClient.invalidateQueries({
      queryKey: PRODUCT_OPS_QUERY_KEYS.remediationDetail(remediationId),
    });
  }
}

/**
 * Invalidate remediation queue with filters
 */
export function invalidateRemediationWithFilters(
  queryClient: QueryClient,
  filters: Record<string, unknown>
): void {
  queryClient.invalidateQueries({
    queryKey: PRODUCT_OPS_QUERY_KEYS.remediationQueueFilters(filters),
  });
}

// ========================================================================
// Workbench Invalidation
// ========================================================================

/**
 * Invalidate all workbench summary queries
 */
export function invalidateWorkbenchSummaryQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({
    queryKey: PRODUCT_OPS_QUERY_KEYS.workbenchSummary,
  });
}

/**
 * Invalidate trend queries
 */
export function invalidateTrendQueries(
  queryClient: QueryClient,
  period?: string
): void {
  if (period) {
    queryClient.invalidateQueries({
      queryKey: PRODUCT_OPS_QUERY_KEYS.workbenchTrends(period),
    });
  } else {
    // Invalidate all trend queries
    queryClient.invalidateQueries({
      queryKey: ['productOps', 'workbench', 'trends'],
    });
  }
}

/**
 * Invalidate impact queries
 */
export function invalidateImpactQueries(
  queryClient: QueryClient,
  period?: string
): void {
  if (period) {
    queryClient.invalidateQueries({
      queryKey: PRODUCT_OPS_QUERY_KEYS.workbenchImpact(period),
    });
  } else {
    queryClient.invalidateQueries({
      queryKey: ['productOps', 'workbench', 'impact'],
    });
  }
}

// ========================================================================
// Combined Invalidation Plans
// ========================================================================

/**
 * Build invalidation plan for decision actions
 */
export function buildDecisionInvalidationPlan(
  queryClient: QueryClient,
  caseId: string
): void {
  // Invalidate the specific case
  invalidateCaseDetailQueries(queryClient, caseId);

  // Invalidate the queue (any decision affects queue state)
  invalidateReviewQueueQueries(queryClient);

  // Invalidate workbench summary (decision counts change)
  invalidateWorkbenchSummaryQueries(queryClient);

  // Add a small delay to ensure backend has processed
  setTimeout(() => {
    queryClient.refetchQueries({
      queryKey: PRODUCT_OPS_QUERY_KEYS.reviewQueue,
    });
  }, QUERY_CONFIG.INVALIDATION_DELAY_MS);
}

/**
 * Build invalidation plan for assignment actions
 */
export function buildAssignmentInvalidationPlan(
  queryClient: QueryClient,
  caseId: string
): void {
  invalidateCaseDetailQueries(queryClient, caseId);
  invalidateReviewQueueQueries(queryClient);
}

/**
 * Build invalidation plan for remediation actions
 */
export function buildRemediationInvalidationPlan(
  queryClient: QueryClient,
  remediationId: string,
  includeSummary: boolean = true
): void {
  invalidateRemediationQueries(queryClient, remediationId);

  if (includeSummary) {
    invalidateWorkbenchSummaryQueries(queryClient);
  }

  setTimeout(() => {
    queryClient.refetchQueries({
      queryKey: PRODUCT_OPS_QUERY_KEYS.remediationQueue,
    });
  }, QUERY_CONFIG.INVALIDATION_DELAY_MS);
}

// ========================================================================
// Refetch Strategies
// ========================================================================

/**
 * Refetch queue after mutation
 */
export async function refetchQueueAfterMutation(
  queryClient: QueryClient
): Promise<void> {
  await queryClient.refetchQueries({
    queryKey: PRODUCT_OPS_QUERY_KEYS.reviewQueue,
    type: 'active',
  });
}

/**
 * Refetch case detail after mutation
 */
export async function refetchCaseAfterMutation(
  queryClient: QueryClient,
  caseId: string
): Promise<void> {
  await queryClient.refetchQueries({
    queryKey: PRODUCT_OPS_QUERY_KEYS.caseDetail(caseId),
    type: 'active',
  });
}

/**
 * Refetch remediation after mutation
 */
export async function refetchRemediationAfterMutation(
  queryClient: QueryClient,
  remediationId: string
): Promise<void> {
  await queryClient.refetchQueries({
    queryKey: PRODUCT_OPS_QUERY_KEYS.remediationDetail(remediationId),
    type: 'active',
  });
}

// ========================================================================
// Optimistic Updates (Future Enhancement)
// ========================================================================

/**
 * Placeholder for optimistic update strategy
 * Can be implemented when real-time updates are needed
 */
export function setupOptimisticUpdates(_queryClient: QueryClient): void {
  // TODO: Implement optimistic updates for better UX
  // This would involve:
  // 1. Update cache immediately on mutation
  // 2. Rollback on error
  // 3. Sync with server response
}
