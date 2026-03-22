/**
 * Operator Actions - Base Mutation Hook
 * Reusable mutation infrastructure for operator actions
 */

import { useState, useCallback, useRef } from 'react';
import type {
  OperatorActionType,
  OperatorActionMutationResult,
  OperatorActionError,
  OperatorActionMutationOptions,
  OperatorActionContext,
} from '../types';
import { OPERATOR_ACTION_EXECUTORS } from '../api/operatorActionsApi';
import {
  CLICK_LOCK_DURATION_MS,
  CLICK_DEBOUNCE_MS,
  MIN_LOADING_DISPLAY_MS,
} from '../constants';

// =============================================================================
// MUTATION STATE
// =============================================================================

/** State for operator action mutation */
export interface UseOperatorActionMutationState {
  /** Whether mutation is currently executing */
  isLoading: boolean;

  /** Whether mutation is being submitted (short-lived state) */
  isSubmitting: boolean;

  /** Result from last successful mutation */
  data?: OperatorActionMutationResult;

  /** Error from last failed mutation */
  error?: OperatorActionError;

  /** Correlation ID of current/last mutation */
  correlationId?: string;
}

// =============================================================================
// OPTIONS
// =============================================================================

/** Options for useOperatorActionMutation */
export interface UseOperatorActionMutationHookOptions {
  /** Action type for this mutation */
  actionType: OperatorActionType;

  /** Callback on success */
  onSuccess?: (result: OperatorActionMutationResult) => void;

  /** Callback on error */
  onError?: (error: OperatorActionError) => void;

  /** Callback when mutation settles (success or error) */
  onSettled?: (result?: OperatorActionMutationResult, error?: OperatorActionError) => void;

  /** Whether to auto-invalidate queries on success (default: true) */
  invalidateQueries?: boolean;

  /** Custom invalidation delay in ms */
  invalidationDelay?: number;

  /** Callback for query invalidation (external) */
  onInvalidate?: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Base hook for operator action mutations
 * Provides loading states, click protection, and callbacks
 */
export function useOperatorActionMutation(
  options: UseOperatorActionMutationHookOptions
) {
  const {
    actionType,
    onSuccess,
    onError,
    onSettled,
    invalidateQueries = true,
    invalidationDelay = 500,
    onInvalidate,
  } = options;

  // Mutation state
  const [state, setState] = useState<UseOperatorActionMutationState>({
    isLoading: false,
    isSubmitting: false,
  });

  // Click protection refs
  const lastClickTime = useRef<number>(0);
  const clickLockUntil = useRef<number>(0);
  const loadingStartTime = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Execute the mutation
   */
  const mutate = useCallback(
    async (
      targetId: string,
      mutationOptions?: {
        payload?: Record<string, unknown>;
        reason?: string;
        correlationId?: string;
        signal?: AbortSignal;
      }
    ) => {
      // Click debounce/lock check
      const now = Date.now();
      if (now < clickLockUntil.current) {
        const remaining = clickLockUntil.current - now;
        console.warn(`Mutation blocked - click locked for ${remaining}ms more`);
        return;
      }

      // Debounce check
      if (now - lastClickTime.current < CLICK_DEBOUNCE_MS) {
        console.warn('Mutation blocked - debounce active');
        return;
      }

      lastClickTime.current = now;
      clickLockUntil.current = now + CLICK_LOCK_DURATION_MS;

      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Merge signals
      const signal = mutationOptions?.signal
        ? mergeAbortSignals(mutationOptions.signal, abortControllerRef.current.signal)
        : abortControllerRef.current.signal;

      // Set loading state
      setState((prev) => ({
        ...prev,
        isSubmitting: true,
        isLoading: true,
        error: undefined,
        data: undefined,
      }));

      loadingStartTime.current = Date.now();

      try {
        // Get executor for action type
        const executor = OPERATOR_ACTION_EXECUTORS[actionType];
        if (!executor) {
          throw new Error(`No executor found for action type: ${actionType}`);
        }

        // Execute mutation
        const result = await executor(targetId, {
          payload: mutationOptions?.payload,
          reason: mutationOptions?.reason,
          correlationId: mutationOptions?.correlationId,
          signal,
        });

        // Calculate minimum loading display time
        const elapsed = Date.now() - loadingStartTime.current;
        const minDelay = Math.max(0, MIN_LOADING_DISPLAY_MS - elapsed);

        if (minDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, minDelay));
        }

        if (result.error) {
          // Handle error
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isSubmitting: false,
            error: result.error,
          }));

          onError?.(result.error);
          onSettled?.(undefined, result.error);

          return { error: result.error };
        }

        // Handle success
        const mutationResult = result.data!;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isSubmitting: false,
          data: mutationResult,
          correlationId: mutationResult.correlationId,
        }));

        onSuccess?.(mutationResult);

        // Invalidate queries after delay
        if (invalidateQueries && onInvalidate) {
          setTimeout(() => {
            onInvalidate();
          }, invalidationDelay);
        }

        onSettled?.(mutationResult, undefined);

        return { data: mutationResult };
      } catch (error) {
        // Handle exception
        const elapsed = Date.now() - loadingStartTime.current;
        const minDelay = Math.max(0, MIN_LOADING_DISPLAY_MS - elapsed);

        if (minDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, minDelay));
        }

        const actionError: OperatorActionError = {
          type: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          retryable: true,
        };

        setState((prev) => ({
          ...prev,
          isLoading: false,
          isSubmitting: false,
          error: actionError,
        }));

        onError?.(actionError);
        onSettled?.(undefined, actionError);

        return { error: actionError };
      }
    },
    [
      actionType,
      onSuccess,
      onError,
      onSettled,
      invalidateQueries,
      invalidationDelay,
      onInvalidate,
    ]
  );

  /**
   * Cancel in-flight mutation
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isSubmitting: false,
      }));
    }
  }, []);

  /**
   * Reset mutation state
   */
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      isSubmitting: false,
    });
  }, []);

  /**
   * Check if can mutate (not loading and not locked)
   */
  const canMutate = useCallback(() => {
    if (state.isLoading) return false;
    if (Date.now() < clickLockUntil.current) return false;
    return true;
  }, [state.isLoading]);

  return {
    ...state,
    mutate,
    cancel,
    reset,
    canMutate,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Merge two abort signals
 */
function mergeAbortSignals(signal1: AbortSignal, signal2: AbortSignal): AbortSignal {
  const controller = new AbortController();

  const abort = () => controller.abort();

  signal1.addEventListener('abort', abort);
  signal2.addEventListener('abort', abort);

  if (signal1.aborted || signal2.aborted) {
    controller.abort();
  }

  return controller.signal;
}

/**
 * Create a typed mutation hook factory
 */
export function createOperatorActionMutation<TOptions extends { reason?: string }>(
  actionType: OperatorActionType,
  defaultOptions?: Partial<UseOperatorActionMutationHookOptions>
) {
  return function useSpecificMutation(
    options?: TOptions & { targetId: string }
  ) {
    return useOperatorActionMutation({
      actionType,
      ...defaultOptions,
    });
  };
}
