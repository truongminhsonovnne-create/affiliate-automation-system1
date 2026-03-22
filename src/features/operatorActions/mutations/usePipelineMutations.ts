/**
 * Operator Actions - Pipeline Mutations
 * Typed mutation hooks for manual pipeline operations
 */

import { useCallback } from 'react';
import { useOperatorActionMutation, type UseOperatorActionMutationHookOptions } from './useOperatorActionMutation';
import type {
  OperatorActionMutationResult,
  OperatorActionError,
} from '../types';
import { OPERATOR_ACTION_TYPES } from '../types';
import { invalidatePipelineQueries } from '../queryInvalidation';

// =============================================================================
// TRIGGER FLASH SALE CRAWL
// =============================================================================

/** Options for trigger flash sale crawl mutation */
export interface UseTriggerFlashSaleCrawlMutationOptions
  extends Omit<UseOperatorActionMutationHookOptions, 'actionType'> {
  /** Payload for flash sale crawl */
  payload?: {
    source?: string;
    categoryIds?: string[];
    limit?: number;
  };
}

/**
 * Hook for triggering a manual flash sale crawl
 */
export function useTriggerFlashSaleCrawlMutation(
  options?: UseTriggerFlashSaleCrawlMutationOptions
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
    invalidatePipelineQueries('crawl');
  }, []);

  const mutation = useOperatorActionMutation({
    actionType: OPERATOR_ACTION_TYPES.TRIGGER_FLASH_SALE_CRAWL,
    onSuccess: handleSuccess,
    onError,
    onSettled,
    onInvalidate: handleInvalidate,
    ...restOptions,
  });

  /**
   * Execute trigger
   */
  const trigger = useCallback(
    (customPayload?: typeof payload) => {
      // Manual operations use a placeholder ID
      return mutation.mutate('manual-operation', {
        payload: customPayload ?? payload,
      });
    },
    [mutation, payload]
  );

  return {
    ...mutation,
    trigger,
    triggerAsync: mutation.mutate,
  };
}

// =============================================================================
// TRIGGER SEARCH CRAWL
// =============================================================================

/** Options for trigger search crawl mutation */
export interface UseTriggerSearchCrawlMutationOptions
  extends Omit<UseOperatorActionMutationHookOptions, 'actionType'> {
  /** Payload for search crawl */
  payload?: {
    keywords?: string[];
    categoryIds?: string[];
    limit?: number;
    sources?: string[];
  };
}

/**
 * Hook for triggering a manual search crawl
 */
export function useTriggerSearchCrawlMutation(
  options?: UseTriggerSearchCrawlMutationOptions
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
    invalidatePipelineQueries('crawl');
  }, []);

  const mutation = useOperatorActionMutation({
    actionType: OPERATOR_ACTION_TYPES.TRIGGER_SEARCH_CRAWL,
    onSuccess: handleSuccess,
    onError,
    onSettled,
    onInvalidate: handleInvalidate,
    ...restOptions,
  });

  /**
   * Execute trigger
   */
  const trigger = useCallback(
    (customPayload?: typeof payload) => {
      return mutation.mutate('manual-operation', {
        payload: customPayload ?? payload,
      });
    },
    [mutation, payload]
  );

  return {
    ...mutation,
    trigger,
    triggerAsync: mutation.mutate,
  };
}

// =============================================================================
// TRIGGER AI ENRICHMENT
// =============================================================================

/** Options for trigger AI enrichment mutation */
export interface UseTriggerAiEnrichmentMutationOptions
  extends Omit<UseOperatorActionMutationHookOptions, 'actionType'> {
  /** Payload for AI enrichment */
  payload?: {
    productIds?: string[];
    categoryIds?: string[];
    priority?: 'high' | 'normal' | 'low';
    forceRefresh?: boolean;
  };
}

/**
 * Hook for triggering AI enrichment
 */
export function useTriggerAiEnrichmentMutation(
  options?: UseTriggerAiEnrichmentMutationOptions
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
    invalidatePipelineQueries('enrichment');
  }, []);

  const mutation = useOperatorActionMutation({
    actionType: OPERATOR_ACTION_TYPES.TRIGGER_AI_ENRICHMENT,
    onSuccess: handleSuccess,
    onError,
    onSettled,
    onInvalidate: handleInvalidate,
    ...restOptions,
  });

  /**
   * Execute trigger
   */
  const trigger = useCallback(
    (customPayload?: typeof payload) => {
      return mutation.mutate('manual-operation', {
        payload: customPayload ?? payload,
      });
    },
    [mutation, payload]
  );

  return {
    ...mutation,
    trigger,
    triggerAsync: mutation.mutate,
  };
}

// =============================================================================
// TRIGGER PUBLISH PREPARATION
// =============================================================================

/** Options for trigger publish preparation mutation */
export interface UseTriggerPublishPreparationMutationOptions
  extends Omit<UseOperatorActionMutationHookOptions, 'actionType'> {
  /** Payload for publish preparation */
  payload?: {
    productIds?: string[];
    channels?: string[];
    scheduledTime?: string;
    dryRun?: boolean;
  };
}

/**
 * Hook for triggering publish preparation
 */
export function useTriggerPublishPreparationMutation(
  options?: UseTriggerPublishPreparationMutationOptions
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
    invalidatePipelineQueries('preparation');
  }, []);

  const mutation = useOperatorActionMutation({
    actionType: OPERATOR_ACTION_TYPES.TRIGGER_PUBLISH_PREPARATION,
    onSuccess: handleSuccess,
    onError,
    onSettled,
    onInvalidate: handleInvalidate,
    ...restOptions,
  });

  /**
   * Execute trigger
   */
  const trigger = useCallback(
    (customPayload?: typeof payload) => {
      return mutation.mutate('manual-operation', {
        payload: customPayload ?? payload,
      });
    },
    [mutation, payload]
  );

  return {
    ...mutation,
    trigger,
    triggerAsync: mutation.mutate,
  };
}

// =============================================================================
// TRIGGER PUBLISHER RUN
// =============================================================================

/** Options for trigger publisher run mutation */
export interface UseTriggerPublisherRunMutationOptions
  extends Omit<UseOperatorActionMutationHookOptions, 'actionType'> {
  /** Payload for publisher run */
  payload?: {
    channels?: string[];
    publishType?: 'immediate' | 'scheduled';
    scheduledTime?: string;
    dryRun?: boolean;
  };
}

/**
 * Hook for triggering publisher run
 */
export function useTriggerPublisherRunMutation(
  options?: UseTriggerPublisherRunMutationOptions
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
    invalidatePipelineQueries('publisher');
  }, []);

  const mutation = useOperatorActionMutation({
    actionType: OPERATOR_ACTION_TYPES.TRIGGER_PUBLISHER_RUN,
    onSuccess: handleSuccess,
    onError,
    onSettled,
    onInvalidate: handleInvalidate,
    ...restOptions,
  });

  /**
   * Execute trigger
   */
  const trigger = useCallback(
    (customPayload?: typeof payload) => {
      return mutation.mutate('manual-operation', {
        payload: customPayload ?? payload,
      });
    },
    [mutation, payload]
  );

  return {
    ...mutation,
    trigger,
    triggerAsync: mutation.mutate,
  };
}

// =============================================================================
// COMBINED HOOK
// =============================================================================

/**
 * Combined hook for all pipeline mutations
 */
export function usePipelineMutations(
  options?: {
    flashSaleCrawl?: UseTriggerFlashSaleCrawlMutationOptions;
    searchCrawl?: UseTriggerSearchCrawlMutationOptions;
    aiEnrichment?: UseTriggerAiEnrichmentMutationOptions;
    publishPreparation?: UseTriggerPublishPreparationMutationOptions;
    publisherRun?: UseTriggerPublisherRunMutationOptions;
  }
) {
  const flashSaleCrawlMutation = useTriggerFlashSaleCrawlMutation(options?.flashSaleCrawl);
  const searchCrawlMutation = useTriggerSearchCrawlMutation(options?.searchCrawl);
  const aiEnrichmentMutation = useTriggerAiEnrichmentMutation(options?.aiEnrichment);
  const publishPreparationMutation = useTriggerPublishPreparationMutation(options?.publishPreparation);
  const publisherRunMutation = useTriggerPublisherRunMutation(options?.publisherRun);

  return {
    triggerFlashSaleCrawl: flashSaleCrawlMutation,
    triggerSearchCrawl: searchCrawlMutation,
    triggerAiEnrichment: aiEnrichmentMutation,
    triggerPublishPreparation: publishPreparationMutation,
    triggerPublisherRun: publisherRunMutation,
  };
}
