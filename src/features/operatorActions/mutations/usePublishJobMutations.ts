/**
 * Operator Actions - Publish Job Mutations
 * Typed mutation hooks for publish job operations
 */

import { useCallback } from 'react';
import { useOperatorActionMutation, type UseOperatorActionMutationHookOptions } from './useOperatorActionMutation';
import type {
  OperatorActionMutationResult,
  OperatorActionError,
} from '../types';
import { OPERATOR_ACTION_TYPES } from '../types';
import {
  invalidatePublishJobQueries,
  type QueryInvalidationOptions,
} from '../queryInvalidation';

// =============================================================================
// RETRY PUBLISH JOB
// =============================================================================

/** Options for retry publish job mutation */
export interface UseRetryPublishJobMutationOptions
  extends Omit<UseOperatorActionMutationHookOptions, 'actionType'> {
  /** Optional payload for retry */
  payload?: {
    forceRestart?: boolean;
    maxRetries?: number;
  };
}

/**
 * Hook for retrying a publish job
 */
export function useRetryPublishJobMutation(
  options?: UseRetryPublishJobMutationOptions
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
      // Custom success handling
      options?.onSuccess?.(result);
    },
    [options?.onSuccess]
  );

  const handleInvalidate = useCallback(() => {
    invalidatePublishJobQueries();
  }, []);

  const mutation = useOperatorActionMutation({
    actionType: OPERATOR_ACTION_TYPES.RETRY_PUBLISH_JOB,
    onSuccess: handleSuccess,
    onError,
    onSettled,
    onInvalidate: handleInvalidate,
    ...restOptions,
  });

  /**
   * Execute retry with payload
   */
  const retry = useCallback(
    (jobId: string, customPayload?: typeof payload) => {
      return mutation.mutate(jobId, {
        payload: customPayload ?? payload,
      });
    },
    [mutation, payload]
  );

  return {
    ...mutation,
    retry,
    retryAsync: mutation.mutate,
  };
}

// =============================================================================
// CANCEL PUBLISH JOB
// =============================================================================

/** Options for cancel publish job mutation */
export interface UseCancelPublishJobMutationOptions
  extends Omit<UseOperatorActionMutationHookOptions, 'actionType'> {
  /** Optional payload for cancel */
  payload?: {
    force?: boolean;
    reason?: string;
  };
}

/**
 * Hook for cancelling a publish job
 */
export function useCancelPublishJobMutation(
  options?: UseCancelPublishJobMutationOptions
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
    invalidatePublishJobQueries();
  }, []);

  const mutation = useOperatorActionMutation({
    actionType: OPERATOR_ACTION_TYPES.CANCEL_PUBLISH_JOB,
    onSuccess: handleSuccess,
    onError,
    onSettled,
    onInvalidate: handleInvalidate,
    ...restOptions,
  });

  /**
   * Execute cancel
   */
  const cancel = useCallback(
    (jobId: string, customPayload?: typeof payload) => {
      return mutation.mutate(jobId, {
        payload: customPayload ?? payload,
      });
    },
    [mutation, payload]
  );

  return {
    ...mutation,
    cancel,
    cancelAsync: mutation.mutate,
  };
}

// =============================================================================
// UNLOCK PUBLISH JOB
// =============================================================================

/** Options for unlock publish job mutation */
export interface UseUnlockPublishJobMutationOptions
  extends Omit<UseOperatorActionMutationHookOptions, 'actionType'> {
  /** Optional payload for unlock */
  payload?: {
    unlockReason?: string;
  };
}

/**
 * Hook for unlocking a stale publish job
 */
export function useUnlockPublishJobMutation(
  options?: UseUnlockPublishJobMutationOptions
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
    invalidatePublishJobQueries();
  }, []);

  const mutation = useOperatorActionMutation({
    actionType: OPERATOR_ACTION_TYPES.UNLOCK_PUBLISH_JOB,
    onSuccess: handleSuccess,
    onError,
    onSettled,
    onInvalidate: handleInvalidate,
    ...restOptions,
  });

  /**
   * Execute unlock
   */
  const unlock = useCallback(
    (jobId: string, customPayload?: typeof payload) => {
      return mutation.mutate(jobId, {
        payload: customPayload ?? payload,
      });
    },
    [mutation, payload]
  );

  return {
    ...mutation,
    unlock,
    unlockAsync: mutation.mutate,
  };
}

// =============================================================================
// COMBINED HOOK
// =============================================================================

/**
 * Combined hook for all publish job mutations
 */
export function usePublishJobMutations(
  options?: {
    retry?: UseRetryPublishJobMutationOptions;
    cancel?: UseCancelPublishJobMutationOptions;
    unlock?: UseUnlockPublishJobMutationOptions;
  }
) {
  const retryMutation = useRetryPublishJobMutation(options?.retry);
  const cancelMutation = useCancelPublishJobMutation(options?.cancel);
  const unlockMutation = useUnlockPublishJobMutation(options?.unlock);

  return {
    retry: retryMutation,
    cancel: cancelMutation,
    unlock: unlockMutation,
  };
}
