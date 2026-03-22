/**
 * Operator Actions - Dead Letter Mutations
 * Typed mutation hooks for dead letter operations
 */

import { useCallback } from 'react';
import { useOperatorActionMutation, type UseOperatorActionMutationHookOptions } from './useOperatorActionMutation';
import type {
  OperatorActionMutationResult,
  OperatorActionError,
} from '../types';
import { OPERATOR_ACTION_TYPES } from '../types';
import { invalidateDeadLetterQueries } from '../queryInvalidation';

// =============================================================================
// REQUEUE DEAD LETTER
// =============================================================================

/** Options for requeue dead letter mutation */
export interface UseRequeueDeadLetterMutationOptions
  extends Omit<UseOperatorActionMutationHookOptions, 'actionType'> {
  /** Optional payload for requeue */
  payload?: {
    priority?: 'high' | 'normal' | 'low';
    delayMs?: number;
  };
}

/**
 * Hook for requeuing a dead letter
 */
export function useRequeueDeadLetterMutation(
  options?: UseRequeueDeadLetterMutationOptions
) {
  const {
    payload,
    onSuccess,
    onError,
    onSettled,
    ...restOptions
  } = options ?? {};

  const handleSuccess = useCallback(
    (result: OperatorActionMutationResult) => {
      options?.onSuccess?.(result);
    },
    [options?.onSuccess]
  );

  const handleInvalidate = useCallback(() => {
    invalidateDeadLetterQueries();
  }, []);

  const mutation = useOperatorActionMutation({
    actionType: OPERATOR_ACTION_TYPES.REQUEUE_DEAD_LETTER,
    onSuccess: handleSuccess,
    onError,
    onSettled,
    onInvalidate: handleInvalidate,
    ...restOptions,
  });

  /**
   * Execute requeue
   */
  const requeue = useCallback(
    (deadLetterId: string, customPayload?: typeof payload) => {
      return mutation.mutate(deadLetterId, {
        payload: customPayload ?? payload,
      });
    },
    [mutation, payload]
  );

  return {
    ...mutation,
    requeue,
    requeueAsync: mutation.mutate,
  };
}

// =============================================================================
// RESOLVE DEAD LETTER
// =============================================================================

/** Options for resolve dead letter mutation */
export interface UseResolveDeadLetterMutationOptions
  extends Omit<UseOperatorActionMutationHookOptions, 'actionType'> {
  /** Optional payload for resolve */
  payload?: {
    resolution?: string;
    skipReprocess?: boolean;
  };
}

/**
 * Hook for resolving a dead letter
 */
export function useResolveDeadLetterMutation(
  options?: UseResolveDeadLetterMutationOptions
) {
  const {
    payload,
    onSuccess,
    onError,
    onSettled,
    ...restOptions
  } = options ?? {};

  const handleSuccess = useCallback(
    (result: OperatorActionMutationResult) => {
      options?.onSuccess?.(result);
    },
    [options?.onSuccess]
  );

  const handleInvalidate = useCallback(() => {
    invalidateDeadLetterQueries();
  }, []);

  const mutation = useOperatorActionMutation({
    actionType: OPERATOR_ACTION_TYPES.RESOLVE_DEAD_LETTER,
    onSuccess: handleSuccess,
    onError,
    onSettled,
    onInvalidate: handleInvalidate,
    ...restOptions,
  });

  /**
   * Execute resolve
   */
  const resolve = useCallback(
    (deadLetterId: string, customPayload?: typeof payload) => {
      return mutation.mutate(deadLetterId, {
        payload: customPayload ?? payload,
      });
    },
    [mutation, payload]
  );

  return {
    ...mutation,
    resolve,
    resolveAsync: mutation.mutate,
  };
}

// =============================================================================
// COMBINED HOOK
// =============================================================================

/**
 * Combined hook for all dead letter mutations
 */
export function useDeadLetterMutations(
  options?: {
    requeue?: UseRequeueDeadLetterMutationOptions;
    resolve?: UseResolveDeadLetterMutationOptions;
  }
) {
  const requeueMutation = useRequeueDeadLetterMutation(options?.requeue);
  const resolveMutation = useResolveDeadLetterMutation(options?.resolve);

  return {
    requeue: requeueMutation,
    resolve: resolveMutation,
  };
}
