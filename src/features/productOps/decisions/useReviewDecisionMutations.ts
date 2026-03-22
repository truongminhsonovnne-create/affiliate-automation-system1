/**
 * Review Decision Mutations
 *
 * Production-grade mutation hooks for review decisions
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productOpsApi } from '../../../lib/productOpsApi/productOpsApiClient';
import { PRODUCT_OPS_QUERY_KEYS } from '../../../lib/productOpsApi/productOpsQueryKeys';
import { invalidateReviewQueueQueries, invalidateCaseDetailQueries } from './productOpsInvalidation';
import type {
  ProductOpsDecisionDraft,
  ProductOpsDecisionResult,
  ProductOpsCaseStatus,
} from '../types';
import { QUERY_CONFIG } from '../constants';

// ========================================================================
// Base Decision Mutation
// ========================================================================

interface UseDecisionMutationOptions {
  onSuccess?: (result: ProductOpsDecisionResult) => void;
  onError?: (error: Error) => void;
}

function useDecisionMutation(
  mutationFn: (draft: ProductOpsDecisionDraft) => Promise<ProductOpsDecisionResult>,
  options: UseDecisionMutationOptions = {}
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      // Invalidate relevant queries
      invalidateReviewQueueQueries(queryClient);
      invalidateCaseDetailQueries(queryClient, result.caseId);

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
// Assign Case Mutation
// ========================================================================

export function useAssignReviewCaseMutation(
  options: UseDecisionMutationOptions = {}
) {
  return useMutation(
    ({ caseId, assigneeId }: { caseId: string; assigneeId: string }) =>
      productOpsApi.assignReviewCase(caseId, assigneeId),
    {
      onSuccess: (_, variables) => {
        invalidateReviewQueueQueries(queryClient);
        invalidateCaseDetailQueries(queryClient, variables.caseId);
        options.onSuccess?.(undefined as unknown as ProductOpsDecisionResult);
      },
      onError: options.onError,
      retry: QUERY_CONFIG.RETRY_COUNT,
    }
  );
}

// ========================================================================
// Accept Case Mutation
// ========================================================================

export function useAcceptReviewCaseMutation(
  options: UseDecisionMutationOptions = {}
) {
  return useDecisionMutation(
    (draft: ProductOpsDecisionDraft) =>
      productOpsApi.acceptReviewCase({
        ...draft,
        decisionType: 'accept',
      }),
    options
  );
}

// ========================================================================
// Reject Case Mutation
// ========================================================================

export function useRejectReviewCaseMutation(
  options: UseDecisionMutationOptions = {}
) {
  return useDecisionMutation(
    (draft: ProductOpsDecisionDraft) =>
      productOpsApi.rejectReviewCase({
        ...draft,
        decisionType: 'reject',
      }),
    options
  );
}

// ========================================================================
// Defer Case Mutation
// ========================================================================

export function useDeferReviewCaseMutation(
  options: UseDecisionMutationOptions = {}
) {
  return useDecisionMutation(
    (draft: ProductOpsDecisionDraft) =>
      productOpsApi.deferReviewCase({
        ...draft,
        decisionType: 'defer',
      }),
    options
  );
}

// ========================================================================
// Needs More Evidence Mutation
// ========================================================================

export function useNeedsMoreEvidenceMutation(
  options: UseDecisionMutationOptions = {}
) {
  return useDecisionMutation(
    (draft: ProductOpsDecisionDraft) =>
      productOpsApi.markCaseNeedsMoreEvidence({
        ...draft,
        decisionType: 'needs_more_evidence',
      }),
    options
  );
}

// ========================================================================
// Close Case Mutation
// ========================================================================

export function useCloseReviewCaseMutation(
  options: UseDecisionMutationOptions = {}
) {
  return useDecisionMutation(
    (draft: ProductOpsDecisionDraft) =>
      productOpsApi.closeReviewCase({
        ...draft,
        decisionType: 'close',
      }),
    options
  );
}

// ========================================================================
// Combined Decision Hook
// ========================================================================

export interface UseSubmitDecisionOptions {
  caseId: string;
  decisionType: 'accept' | 'reject' | 'defer' | 'needs_more_evidence' | 'close';
  rationale?: string;
  metadata?: Record<string, unknown>;
  onSuccess?: (result: ProductOpsDecisionResult) => void;
  onError?: (error: Error) => void;
}

export function useSubmitReviewDecision() {
  const acceptMutation = useAcceptReviewCaseMutation();
  const rejectMutation = useRejectReviewCaseMutation();
  const deferMutation = useDeferReviewCaseMutation();
  const needsEvidenceMutation = useNeedsMoreEvidenceMutation();
  const closeMutation = useCloseReviewCaseMutation();

  const submitDecision = async (options: UseSubmitDecisionOptions) => {
    const { caseId, decisionType, rationale, metadata, onSuccess, onError } = options;

    const draft: ProductOpsDecisionDraft = {
      caseId,
      decisionType,
      rationale,
      metadata,
    };

    switch (decisionType) {
      case 'accept':
        return acceptMutation.mutateAsync(draft, { onSuccess, onError });
      case 'reject':
        return rejectMutation.mutateAsync(draft, { onSuccess, onError });
      case 'defer':
        return deferMutation.mutateAsync(draft, { onSuccess, onError });
      case 'needs_more_evidence':
        return needsEvidenceMutation.mutateAsync(draft, { onSuccess, onError });
      case 'close':
        return closeMutation.mutateAsync(draft, { onSuccess, onError });
      default:
        throw new Error(`Unknown decision type: ${decisionType}`);
    }
  };

  return {
    submitDecision,
    isLoading:
      acceptMutation.isPending ||
      rejectMutation.isPending ||
      deferMutation.isPending ||
      needsEvidenceMutation.isPending ||
      closeMutation.isPending,
    error:
      acceptMutation.error ||
      rejectMutation.error ||
      deferMutation.error ||
      needsEvidenceMutation.error ||
      closeMutation.error,
  };
}

// Import queryClient for the assign mutation
import { queryClient } from '@tanstack/react-query';
