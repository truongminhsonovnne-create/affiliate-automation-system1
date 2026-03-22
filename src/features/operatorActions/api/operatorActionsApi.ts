/**
 * Operator Actions - Typed API Client
 * Centralized mutation client for all operator actions
 */

import type {
  OperatorActionType,
  OperatorActionMutationResult,
  OperatorActionError,
  OperatorActionApiResponse,
} from '../types';
import { OPERATOR_ACTION_ERRORS } from '../types';
import {
  buildOperatorActionRequest,
  normalizeOperatorActionResponse,
  mapOperatorActionError,
  buildErrorFromApiResponse,
} from '../contracts';
import {
  ACTION_TIMEOUT_MS,
  ACTION_TIMEOUT_BY_TYPE,
} from '../constants';

// =============================================================================
// API CLIENT CONFIGURATION
// =============================================================================

/** API client configuration */
interface ApiClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
}

/** Default API client config - should be overridden by app */
let apiClientConfig: ApiClientConfig = {
  baseUrl: '',
  timeout: ACTION_TIMEOUT_MS,
};

/**
 * Initialize the API client with app configuration
 */
export function initOperatorActionsApi(config: ApiClientConfig): void {
  apiClientConfig = {
    ...apiClientConfig,
    ...config,
  };
}

/** Get current API client config */
export function getApiClientConfig(): ApiClientConfig {
  return { ...apiClientConfig };
}

// =============================================================================
// BASE MUTATION FUNCTION
// =============================================================================

/**
 * Execute an operator action mutation
 */
async function executeOperatorAction<T = OperatorActionMutationResult>(
  actionType: OperatorActionType,
  targetId: string,
  options?: {
    payload?: Record<string, unknown>;
    reason?: string;
    correlationId?: string;
    signal?: AbortSignal;
    timeout?: number;
  }
): Promise<{
  data?: T;
  error?: OperatorActionError;
}> {
  const { baseUrl, timeout: defaultTimeout } = apiClientConfig;

  if (!baseUrl) {
    return {
      error: {
        type: OPERATOR_ACTION_ERRORS.INTERNAL_ERROR,
        message: 'API client not initialized. Call initOperatorActionsApi() first.',
        retryable: false,
      },
    };
  }

  const request = buildOperatorActionRequest(actionType, targetId, {
    payload: options?.payload,
    reason: options?.reason,
    correlationId: options?.correlationId,
    timeout: options?.timeout,
  });

  const timeout = options?.timeout ?? request.timeout;

  // Create abort controller for timeout
  let controller: AbortController | undefined;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  if (!options?.signal) {
    controller = new AbortController();
    timeoutId = setTimeout(() => controller?.abort(), timeout);
  }

  try {
    const response = await fetch(`${baseUrl}${request.url}`, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      signal: options?.signal ?? controller?.signal,
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const normalized = normalizeOperatorActionResponse<OperatorActionMutationResult>(
      response,
      actionType,
      options?.correlationId
    );

    if (normalized.error) {
      return {
        error: buildErrorFromApiResponse(normalized),
      };
    }

    return {
      data: normalized.data as T,
    };
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Handle abort
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        error: {
          type: OPERATOR_ACTION_ERRORS.TIMEOUT,
          message: 'The operation was cancelled or timed out.',
          retryable: true,
        },
      };
    }

    return {
      error: mapOperatorActionError(error, { actionType, targetId }),
    };
  }
}

// =============================================================================
// PUBLISH JOB ACTIONS
// =============================================================================

/**
 * Retry a publish job
 */
export async function retryPublishJob(
  jobId: string,
  options?: {
    payload?: {
      forceRestart?: boolean;
      maxRetries?: number;
    };
    reason?: string;
    correlationId?: string;
    signal?: AbortSignal;
    timeout?: number;
  }
): Promise<{ data?: OperatorActionMutationResult; error?: OperatorActionError }> {
  return executeOperatorAction('RETRY_PUBLISH_JOB', jobId, {
    payload: options?.payload,
    reason: options?.reason,
    correlationId: options?.correlationId,
    signal: options?.signal,
    timeout: options?.timeout ?? ACTION_TIMEOUT_BY_TYPE.RETRY_PUBLISH_JOB,
  });
}

/**
 * Cancel a publish job
 */
export async function cancelPublishJob(
  jobId: string,
  options?: {
    payload?: {
      force?: boolean;
      reason?: string;
    };
    reason?: string;
    correlationId?: string;
    signal?: AbortSignal;
    timeout?: number;
  }
): Promise<{ data?: OperatorActionMutationResult; error?: OperatorActionError }> {
  return executeOperatorAction('CANCEL_PUBLISH_JOB', jobId, {
    payload: options?.payload,
    reason: options?.reason,
    correlationId: options?.correlationId,
    signal: options?.signal,
    timeout: options?.timeout ?? ACTION_TIMEOUT_BY_TYPE.CANCEL_PUBLISH_JOB,
  });
}

/**
 * Unlock a stale publish job
 */
export async function unlockPublishJob(
  jobId: string,
  options?: {
    payload?: {
      unlockReason?: string;
    };
    reason?: string;
    correlationId?: string;
    signal?: AbortSignal;
    timeout?: number;
  }
): Promise<{ data?: OperatorActionMutationResult; error?: OperatorActionError }> {
  return executeOperatorAction('UNLOCK_PUBLISH_JOB', jobId, {
    payload: options?.payload,
    reason: options?.reason,
    correlationId: options?.correlationId,
    signal: options?.signal,
    timeout: options?.timeout ?? ACTION_TIMEOUT_BY_TYPE.UNLOCK_PUBLISH_JOB,
  });
}

// =============================================================================
// DEAD LETTER ACTIONS
// =============================================================================

/**
 * Requeue a dead letter
 */
export async function requeueDeadLetter(
  deadLetterId: string,
  options?: {
    payload?: {
      priority?: 'high' | 'normal' | 'low';
      delayMs?: number;
    };
    reason?: string;
    correlationId?: string;
    signal?: AbortSignal;
    timeout?: number;
  }
): Promise<{ data?: OperatorActionMutationResult; error?: OperatorActionError }> {
  return executeOperatorAction('REQUEUE_DEAD_LETTER', deadLetterId, {
    payload: options?.payload,
    reason: options?.reason,
    correlationId: options?.correlationId,
    signal: options?.signal,
    timeout: options?.timeout ?? ACTION_TIMEOUT_BY_TYPE.REQUEUE_DEAD_LETTER,
  });
}

/**
 * Resolve a dead letter
 */
export async function resolveDeadLetter(
  deadLetterId: string,
  options?: {
    payload?: {
      resolution?: string;
      skipReprocess?: boolean;
    };
    reason?: string;
    correlationId?: string;
    signal?: AbortSignal;
    timeout?: number;
  }
): Promise<{ data?: OperatorActionMutationResult; error?: OperatorActionError }> {
  return executeOperatorAction('RESOLVE_DEAD_LETTER', deadLetterId, {
    payload: options?.payload,
    reason: options?.reason,
    correlationId: options?.correlationId,
    signal: options?.signal,
    timeout: options?.timeout ?? ACTION_TIMEOUT_BY_TYPE.RESOLVE_DEAD_LETTER,
  });
}

// =============================================================================
// MANUAL OPERATIONS - CRAWL
// =============================================================================

/**
 * Trigger a manual flash sale crawl
 */
export async function triggerFlashSaleCrawl(
  payload?: {
    source?: string;
    categoryIds?: string[];
    limit?: number;
  },
  options?: {
    reason?: string;
    correlationId?: string;
    signal?: AbortSignal;
    timeout?: number;
  }
): Promise<{ data?: OperatorActionMutationResult; error?: OperatorActionError }> {
  // Use a placeholder ID for operations that don't target a specific entity
  const targetId = 'manual-operation';
  return executeOperatorAction('TRIGGER_FLASH_SALE_CRAWL', targetId, {
    payload,
    reason: options?.reason,
    correlationId: options?.correlationId,
    signal: options?.signal,
    timeout: options?.timeout ?? ACTION_TIMEOUT_BY_TYPE.TRIGGER_FLASH_SALE_CRAWL,
  });
}

/**
 * Trigger a manual search crawl
 */
export async function triggerSearchCrawl(
  payload?: {
    keywords?: string[];
    categoryIds?: string[];
    limit?: number;
    sources?: string[];
  },
  options?: {
    reason?: string;
    correlationId?: string;
    signal?: AbortSignal;
    timeout?: number;
  }
): Promise<{ data?: OperatorActionMutationResult; error?: OperatorActionError }> {
  const targetId = 'manual-operation';
  return executeOperatorAction('TRIGGER_SEARCH_CRAWL', targetId, {
    payload,
    reason: options?.reason,
    correlationId: options?.correlationId,
    signal: options?.signal,
    timeout: options?.timeout ?? ACTION_TIMEOUT_BY_TYPE.TRIGGER_SEARCH_CRAWL,
  });
}

// =============================================================================
// MANUAL OPERATIONS - ENRICHMENT
// =============================================================================

/**
 * Trigger AI enrichment
 */
export async function triggerAiEnrichment(
  payload?: {
    productIds?: string[];
    categoryIds?: string[];
    priority?: 'high' | 'normal' | 'low';
    forceRefresh?: boolean;
  },
  options?: {
    reason?: string;
    correlationId?: string;
    signal?: AbortSignal;
    timeout?: number;
  }
): Promise<{ data?: OperatorActionMutationResult; error?: OperatorActionError }> {
  const targetId = 'manual-operation';
  return executeOperatorAction('TRIGGER_AI_ENRICHMENT', targetId, {
    payload,
    reason: options?.reason,
    correlationId: options?.correlationId,
    signal: options?.signal,
    timeout: options?.timeout ?? ACTION_TIMEOUT_BY_TYPE.TRIGGER_AI_ENRICHMENT,
  });
}

// =============================================================================
// MANUAL OPERATIONS - PUBLISHING
// =============================================================================

/**
 * Trigger publish preparation
 */
export async function triggerPublishPreparation(
  payload?: {
    productIds?: string[];
    channels?: string[];
    scheduledTime?: string;
    dryRun?: boolean;
  },
  options?: {
    reason?: string;
    correlationId?: string;
    signal?: AbortSignal;
    timeout?: number;
  }
): Promise<{ data?: OperatorActionMutationResult; error?: OperatorActionError }> {
  const targetId = 'manual-operation';
  return executeOperatorAction('TRIGGER_PUBLISH_PREPARATION', targetId, {
    payload,
    reason: options?.reason,
    correlationId: options?.correlationId,
    signal: options?.signal,
    timeout: options?.timeout ?? ACTION_TIMEOUT_BY_TYPE.TRIGGER_PUBLISH_PREPARATION,
  });
}

/**
 * Trigger publisher run
 */
export async function triggerPublisherRun(
  payload?: {
    channels?: string[];
    publishType?: 'immediate' | 'scheduled';
    scheduledTime?: string;
    dryRun?: boolean;
  },
  options?: {
    reason?: string;
    correlationId?: string;
    signal?: AbortSignal;
    timeout?: number;
  }
): Promise<{ data?: OperatorActionMutationResult; error?: OperatorActionError }> {
  const targetId = 'manual-operation';
  return executeOperatorAction('TRIGGER_PUBLISHER_RUN', targetId, {
    payload,
    reason: options?.reason,
    correlationId: options?.correlationId,
    signal: options?.signal,
    timeout: options?.timeout ?? ACTION_TIMEOUT_BY_TYPE.TRIGGER_PUBLISHER_RUN,
  });
}

// =============================================================================
// EXPORT ALL ACTIONS AS A MAP
// =============================================================================

/** Map of all action types to their execute functions */
export const OPERATOR_ACTION_EXECUTORS: Record<
  string,
  (
    targetId: string,
    options?: {
      payload?: Record<string, unknown>;
      reason?: string;
      correlationId?: string;
      signal?: AbortSignal;
      timeout?: number;
    }
  ) => Promise<{ data?: OperatorActionMutationResult; error?: OperatorActionError }>
> = {
  RETRY_PUBLISH_JOB: retryPublishJob,
  CANCEL_PUBLISH_JOB: cancelPublishJob,
  UNLOCK_PUBLISH_JOB: unlockPublishJob,
  REQUEUE_DEAD_LETTER: requeueDeadLetter,
  RESOLVE_DEAD_LETTER: resolveDeadLetter,
  TRIGGER_FLASH_SALE_CRAWL: (id, opts) => triggerFlashSaleCrawl(opts?.payload as never, opts),
  TRIGGER_SEARCH_CRAWL: (id, opts) => triggerSearchCrawl(opts?.payload as never, opts),
  TRIGGER_AI_ENRICHMENT: (id, opts) => triggerAiEnrichment(opts?.payload as never, opts),
  TRIGGER_PUBLISH_PREPARATION: (id, opts) => triggerPublishPreparation(opts?.payload as never, opts),
  TRIGGER_PUBLISHER_RUN: (id, opts) => triggerPublisherRun(opts?.payload as never, opts),
};
