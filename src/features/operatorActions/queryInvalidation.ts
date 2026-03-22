/**
 * Operator Actions - Query Invalidation Strategy
 * Centralized query invalidation after mutations
 */

import type { OperatorActionType } from './types';
import { INVALIDATION_SCOPES, INVALIDATION_DELAY_MS } from './constants';

// =============================================================================
// INVALIDATION SCOPES
// =============================================================================

/** Query key constants - should match your query client keys */
export const QUERY_KEYS = {
  // Publish Jobs
  PUBLISH_JOBS: 'publish-jobs',
  PUBLISH_JOB: 'publish-job',
  PUBLISH_JOB_DETAIL: 'publish-job-detail',

  // Dead Letters
  DEAD_LETTERS: 'dead-letters',
  DEAD_LETTER: 'dead-letter',
  DEAD_LETTER_DETAIL: 'dead-letter-detail',

  // Dashboard
  DASHBOARD_OVERVIEW: 'dashboard-overview',
  DASHBOARD_STATS: 'dashboard-stats',

  // Activity
  ACTIVITY: 'activity',
  ACTIVITY_LOG: 'activity-log',

  // Products
  PRODUCTS: 'products',
  PRODUCT: 'product',

  // Pipeline
  CRAWL_JOBS: 'crawl-jobs',
  ENRICHMENT_JOBS: 'enrichment-jobs',
  PREPARATION_JOBS: 'preparation-jobs',
  PUBLISHER_RUNS: 'publisher-runs',
} as const;

// =============================================================================
// INVALIDATION FUNCTIONS
// =============================================================================

/**
 * Invalidate all publish job related queries
 * Call this after publish job mutations
 */
export function invalidatePublishJobQueries(): void {
  // In production, this would call your query client's invalidateQueries
  // Example with React Query:
  // queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PUBLISH_JOBS] });
  // queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PUBLISH_JOB] });

  console.log('[QueryInvalidation] Invalidating publish job queries');

  // Dispatch custom event for external listeners
  dispatchInvalidationEvent('publish-job');
}

/**
 * Invalidate all dead letter related queries
 * Call this after dead letter mutations
 */
export function invalidateDeadLetterQueries(): void {
  console.log('[QueryInvalidation] Invalidating dead letter queries');

  dispatchInvalidationEvent('dead-letter');
}

/**
 * Invalidate dashboard overview queries
 * Call this after any significant mutation
 */
export function invalidateDashboardOverviewQueries(): void {
  console.log('[QueryInvalidation] Invalidating dashboard overview queries');

  dispatchInvalidationEvent('dashboard-overview');
}

/**
 * Invalidate activity queries
 * Call this after any action that should appear in activity log
 */
export function invalidateActivityQueries(): void {
  console.log('[QueryInvalidation] Invalidating activity queries');

  dispatchInvalidationEvent('activity');
}

/**
 * Invalidate product-related queries
 * Call this after enrichment or publish preparation
 */
export function invalidateProductRelatedQueries(): void {
  console.log('[QueryInvalidation] Invalidating product queries');

  dispatchInvalidationEvent('product');
}

/**
 * Invalidate pipeline-related queries
 * Call this after pipeline operations
 */
export function invalidatePipelineQueries(scope?: 'crawl' | 'enrichment' | 'preparation' | 'publisher'): void {
  console.log(`[QueryInvalidation] Invalidating pipeline queries (scope: ${scope ?? 'all'})`);

  dispatchInvalidationEvent('pipeline', scope);
}

/**
 * Invalidate all queries (full refresh)
 * Use sparingly - only for critical operations
 */
export function invalidateAllQueries(): void {
  console.log('[QueryInvalidation] Invalidating all queries');

  dispatchInvalidationEvent('all');
}

// =============================================================================
// INVALIDATION PLAN BUILDER
// =============================================================================

/**
 * Build invalidation plan based on action type
 */
export function buildMutationInvalidationPlan(
  actionType: OperatorActionType,
  context?: {
    targetId?: string;
    targetState?: Record<string, unknown>;
  }
): string[] {
  // Get predefined scopes for action type
  const scopes = INVALIDATION_SCOPES[actionType] ?? [];

  // Map scopes to query keys
  return scopes.map((scope) => {
    switch (scope) {
      case 'publish-jobs':
        return QUERY_KEYS.PUBLISH_JOBS;
      case 'publish-job':
        return context?.targetId
          ? `${QUERY_KEYS.PUBLISH_JOB}:${context.targetId}`
          : QUERY_KEYS.PUBLISH_JOB;
      case 'dead-letters':
        return QUERY_KEYS.DEAD_LETTERS;
      case 'dead-letter':
        return context?.targetId
          ? `${QUERY_KEYS.DEAD_LETTER}:${context.targetId}`
          : QUERY_KEYS.DEAD_LETTER;
      case 'dashboard-overview':
        return QUERY_KEYS.DASHBOARD_OVERVIEW;
      case 'activity':
        return QUERY_KEYS.ACTIVITY;
      case 'products':
        return QUERY_KEYS.PRODUCTS;
      case 'crawl-jobs':
        return QUERY_KEYS.CRAWL_JOBS;
      case 'enrichment-jobs':
        return QUERY_KEYS.ENRICHMENT_JOBS;
      case 'preparation-jobs':
        return QUERY_KEYS.PREPARATION_JOBS;
      case 'publisher-runs':
        return QUERY_KEYS.PUBLISHER_RUNS;
      default:
        return scope;
    }
  });
}

/**
 * Execute invalidation plan
 */
export function executeInvalidationPlan(plan: string[]): void {
  plan.forEach((queryKey) => {
    console.log(`[QueryInvalidation] Invalidating: ${queryKey}`);
  });

  dispatchInvalidationEvent('batch', plan);
}

// =============================================================================
// EVENT DISPATCH (for external integration)
// =============================================================================

/**
 * Custom event for query invalidation
 */
export interface QueryInvalidationEvent extends CustomEvent {
  detail: {
    type: 'publish-job' | 'dead-letter' | 'dashboard-overview' | 'activity' | 'product' | 'pipeline' | 'all' | 'batch';
    scope?: string | string[];
    timestamp: number;
  };
}

/**
 * Dispatch invalidation event
 */
function dispatchInvalidationEvent(
  type: QueryInvalidationEvent['detail']['type'],
  scope?: string | string[]
): void {
  if (typeof window === 'undefined') return;

  const event = new CustomEvent('operator-action-invalidation', {
    detail: {
      type,
      scope,
      timestamp: Date.now(),
    },
  });

  window.dispatchEvent(event);
}

/**
 * Subscribe to invalidation events (for manual refresh)
 */
export function subscribeToInvalidation(
  callback: (event: QueryInvalidationEvent['detail']) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (event: Event) => {
    callback((event as QueryInvalidationEvent).detail);
  };

  window.addEventListener('operator-action-invalidation', handler);

  return () => {
    window.removeEventListener('operator-action-invalidation', handler);
  };
}

// =============================================================================
// REACT QUERY INTEGRATION (Example)
// =============================================================================

/**
 * Example React Query invalidation helper
 * In production, import and use these in your mutation hooks
 */
export const reactQueryInvalidation = {
  /**
   * Create an invalidation function for React Query
   * Usage: const invalidate = createReactQueryInvalidation(queryClient);
   */
  create: (queryClient: {
    invalidateQueries: (options?: {
      queryKey?: unknown[];
      exact?: boolean;
    }) => Promise<void>;
  }) => {
    return (actionType: OperatorActionType, context?: { targetId?: string }) => {
      const plan = buildMutationInvalidationPlan(actionType, context);

      plan.forEach((queryKey) => {
        queryClient.invalidateQueries({
          queryKey: [queryKey],
        });
      });
    };
  },
};

// =============================================================================
// OPTIONS
// =============================================================================

/** Options for query invalidation */
export interface QueryInvalidationOptions {
  /** Delay before invalidating */
  delay?: number;

  /** Whether to invalidate dashboard */
  includeDashboard?: boolean;

  /** Whether to invalidate activity */
  includeActivity?: boolean;
}

/**
 * Get default invalidation options
 */
export function getDefaultInvalidationOptions(): QueryInvalidationOptions {
  return {
    delay: INVALIDATION_DELAY_MS,
    includeDashboard: true,
    includeActivity: true,
  };
}
