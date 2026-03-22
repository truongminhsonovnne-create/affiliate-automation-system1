/**
 * Remediation Mutations
 *
 * Production-grade mutation hooks for remediation actions
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productOpsApi } from '../../../lib/productOpsApi/productOpsApiClient';
import { PRODUCT_OPS_QUERY_KEYS } from '../../../lib/productOpsApi/productOpsQueryKeys';
import {
  invalidateRemediationQueries,
  invalidateWorkbenchSummaryQueries,
} from './productOpsInvalidation';
import type {
  ProductOpsRemediationDecisionDraft,
  ProductOpsRemediationDecisionResult,
} from '../types';
import { QUERY_CONFIG } from '../constants';

// ========================================================================
// Approve Remediation
// ========================================================================

export function useApproveRemediationMutation(
  options: {
    onSuccess?: (result: ProductOpsRemediationDecisionResult) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draft: ProductOpsRemediationDecisionDraft) =>
      productOpsApi.approveRemediation(draft),
    onSuccess: (result) => {
      invalidateRemediationQueries(queryClient, result.remediationId);
      invalidateWorkbenchSummaryQueries(queryClient);
      options.onSuccess?.(result);
    },
    onError: (error) => {
      options.onError?.(error as Error);
    },
    retry: QUERY_CONFIG.RETRY_COUNT,
    retryDelay: QUERY_CONFIG.RETRY_DELAY_MS,
  });
}

// ========================================================================
// Reject Remediation
// ========================================================================

export function useRejectRemediationMutation(
  options: {
    onSuccess?: (result: ProductOpsRemediationDecisionResult) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draft: ProductOpsRemediationDecisionDraft) =>
      productOpsApi.rejectRemediation(draft),
    onSuccess: (result) => {
      invalidateRemediationQueries(queryClient, result.remediationId);
      invalidateWorkbenchSummaryQueries(queryClient);
      options.onSuccess?.(result);
    },
    onError: (error) => {
      options.onError?.(error as Error);
    },
    retry: QUERY_CONFIG.RETRY_COUNT,
    retryDelay: QUERY_CONFIG.RETRY_DELAY_MS,
  });
}

// ========================================================================
// Mark Executed
// ========================================================================

export function useMarkRemediationExecutedMutation(
  options: {
    onSuccess?: (result: ProductOpsRemediationDecisionResult) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      remediationId,
      executionNotes,
    }: {
      remediationId: string;
      executionNotes?: string;
    }) => productOpsApi.markRemediationExecuted(remediationId, executionNotes),
    onSuccess: (result) => {
      invalidateRemediationQueries(queryClient, result.remediationId);
      invalidateWorkbenchSummaryQueries(queryClient);
      options.onSuccess?.(result);
    },
    onError: (error) => {
      options.onError?.(error as Error);
    },
    retry: QUERY_CONFIG.RETRY_COUNT,
    retryDelay: QUERY_CONFIG.RETRY_DELAY_MS,
  });
}

// ========================================================================
// Combined Remediation Decision Hook
// ========================================================================

export interface UseRemediationDecisionOptions {
  remediationId: string;
  decisionType: 'approve' | 'reject';
  rationale?: string;
  metadata?: Record<string, unknown>;
  onSuccess?: (result: ProductOpsRemediationDecisionResult) => void;
  onError?: (error: Error) => void;
}

export function useRemediationDecisionMutations() {
  const approveMutation = useApproveRemediationMutation();
  const rejectMutation = useRejectRemediationMutation();
  const executeMutation = useMarkRemediationExecutedMutation();

  const submitRemediationDecision = async (options: UseRemediationDecisionOptions) => {
    const { remediationId, decisionType, rationale, metadata, onSuccess, onError } = options;

    const draft: ProductOpsRemediationDecisionDraft = {
      remediationId,
      decisionType,
      rationale,
      metadata,
    };

    switch (decisionType) {
      case 'approve':
        return approveMutation.mutateAsync(draft, { onSuccess, onError });
      case 'reject':
        return rejectMutation.mutateAsync(draft, { onSuccess, onError });
      default:
        throw new Error(`Unknown decision type: ${decisionType}`);
    }
  };

  const submitExecution = async (
    remediationId: string,
    executionNotes?: string,
    onSuccess?: (result: ProductOpsRemediationDecisionResult) => void,
    onError?: (error: Error) => void
  ) => {
    return executeMutation.mutateAsync(
      { remediationId, executionNotes },
      { onSuccess, onError }
    );
  };

  return {
    submitRemediationDecision,
    submitExecution,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isMarkingExecuted: executeMutation.isPending,
    isLoading: approveMutation.isPending || rejectMutation.isPending || executeMutation.isPending,
    approveError: approveMutation.error,
    rejectError: rejectMutation.error,
    executeError: executeMutation.error,
  };
}
