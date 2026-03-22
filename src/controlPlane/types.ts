/**
 * Control Plane Types
 *
 * Shared types/interfaces for the internal admin control plane.
 */

import type { Channel } from '../publishing/types.js';

// =============================================================================
// ADMIN ACTOR & ROLES
// =============================================================================

/** Admin role levels */
export type AdminRole = 'readonly_observer' | 'operator' | 'admin' | 'super_admin';

/** Admin actor performing an action */
export interface AdminActor {
  id: string;
  email?: string;
  role: AdminRole;
  displayName?: string;
  metadata?: Record<string, unknown>;
}

/** Role hierarchy for permission checks */
export const ROLE_HIERARCHY: Record<AdminRole, number> = {
  readonly_observer: 0,
  operator: 1,
  admin: 2,
  super_admin: 3,
};

/** Check if role has required level */
export function hasRoleLevel(actor: AdminActor, requiredRole: AdminRole): boolean {
  return ROLE_HIERARCHY[actor.role] >= ROLE_HIERARCHY[requiredRole];
}

// =============================================================================
// ADMIN ACTION TYPES
// =============================================================================

/** Admin action categories */
export type AdminActionCategory = 'read' | 'write' | 'execute' | 'admin';

/** Action types supported by control plane */
export type AdminActionType =
  // System actions
  | 'system.health.read'
  | 'system.snapshot.read'
  | 'system.metrics.read'
  | 'system.workers.read'

  // Crawl actions
  | 'crawl.flash_sale.trigger'
  | 'crawl.search.trigger'
  | 'crawl.jobs.read'
  | 'crawl.job.detail'

  // AI actions
  | 'ai.enrich.product'
  | 'ai.enrich.batch'
  | 'ai.content.status'

  // Publishing actions
  | 'publishing.prepare'
  | 'publishing.run'
  | 'publishing.jobs.read'
  | 'publishing.job.detail'
  | 'publishing.job.retry'
  | 'publishing.job.cancel'
  | 'publishing.job.unlock'

  // Dead letter actions
  | 'dead_letter.read'
  | 'dead_letter.detail'
  | 'dead_letter.requeue'
  | 'dead_letter.resolve'

  // Admin actions
  | 'admin.actions.read'
  | 'admin.dashboard.read'
  | 'admin.events.read';

/** Target types for audit trail */
export type AdminTargetType =
  | 'system'
  | 'crawl_job'
  | 'product'
  | 'content'
  | 'publish_job'
  | 'dead_letter'
  | 'worker'
  | 'admin_action';

/** Required role for each action */
export const ACTION_ROLE_REQUIREMENTS: Record<AdminActionType, AdminRole> = {
  // System - read actions
  'system.health.read': 'readonly_observer',
  'system.snapshot.read': 'readonly_observer',
  'system.metrics.read': 'readonly_observer',
  'system.workers.read': 'readonly_observer',

  // Crawl actions
  'crawl.flash_sale.trigger': 'operator',
  'crawl.search.trigger': 'operator',
  'crawl.jobs.read': 'readonly_observer',
  'crawl.job.detail': 'readonly_observer',

  // AI actions
  'ai.enrich.product': 'operator',
  'ai.enrich.batch': 'operator',
  'ai.content.status': 'readonly_observer',

  // Publishing actions
  'publishing.prepare': 'operator',
  'publishing.run': 'operator',
  'publishing.jobs.read': 'readonly_observer',
  'publishing.job.detail': 'readonly_observer',
  'publishing.job.retry': 'admin',
  'publishing.job.cancel': 'admin',
  'publishing.job.unlock': 'super_admin',

  // Dead letter actions
  'dead_letter.read': 'readonly_observer',
  'dead_letter.detail': 'readonly_observer',
  'dead_letter.requeue': 'admin',
  'dead_letter.resolve': 'admin',

  // Admin actions
  'admin.actions.read': 'admin',
  'admin.dashboard.read': 'readonly_observer',
  'admin.events.read': 'readonly_observer',
};

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/** API response status */
export type AdminApiStatus = 'success' | 'error' | 'warning';

/** Standard API response wrapper */
export interface AdminApiResponse<T> {
  ok: boolean;
  status: AdminApiStatus;
  data?: T;
  error?: AdminApiError;
  warnings?: string[];
  meta?: AdminResponseMeta;
  correlationId: string;
  timestamp: string;
}

/** API error details */
export interface AdminApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
}

/** Response metadata */
export interface AdminResponseMeta {
  requestId?: string;
  actorId?: string;
  actionType?: string;
  pagination?: PaginationMeta;
  timing?: TimingMeta;
  version?: string;
}

/** Pagination metadata */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems?: number;
  totalPages?: number;
  hasMore: boolean;
}

/** Timing metadata */
export interface TimingMeta {
  requestStartTime: string;
  requestDurationMs: number;
  dbQueryMs?: number;
}

// =============================================================================
// REQUEST CONTEXT
// =============================================================================

/** Request context for control plane */
export interface ControlPlaneRequestContext {
  correlationId: string;
  requestId?: string;
  actor: AdminActor;
  sourceIp?: string;
  userAgent?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// ACTION INPUTS
// =============================================================================

/** Manual crawl flash sale request */
export interface ManualCrawlRequest {
  shopId?: string;
  url?: string;
  priority?: number;
  options?: {
    forceRefresh?: boolean;
    maxItems?: number;
    categoryId?: string;
  };
}

/** Manual crawl search request */
export interface ManualSearchCrawlRequest {
  keyword: string;
  limit?: number;
  categoryId?: string;
  options?: {
    forceRefresh?: boolean;
    minPrice?: number;
    maxPrice?: number;
  };
}

/** Manual AI enrichment request */
export interface ManualAiEnrichmentRequest {
  productId: string;
  forceRefresh?: boolean;
}

/** Batch AI enrichment request */
export interface BatchAiEnrichmentRequest {
  productIds: string[];
  options?: {
    forceRefresh?: boolean;
    priority?: number;
  };
}

/** Manual publish preparation request */
export interface ManualPublishPreparationRequest {
  productIds: string[];
  channels?: Channel[];
  options?: {
    forceReprepare?: boolean;
    priority?: number;
  };
}

/** Manual publisher run request */
export interface ManualPublisherRunRequest {
  channels?: Channel[];
  limit?: number;
  dryRun?: boolean;
  options?: {
    concurrency?: number;
  };
}

/** Retry publish job request */
export interface RetryPublishJobRequest {
  jobId: string;
  reason?: string;
  options?: {
    force?: boolean;
    resetAttempts?: boolean;
  };
}

/** Cancel publish job request */
export interface CancelPublishJobRequest {
  jobId: string;
  reason: string;
  force?: boolean;
}

/** Unlock stale publish job request */
export interface UnlockStalePublishJobRequest {
  jobId: string;
  reason: string;
  force?: boolean;
}

/** Requeue dead letter request */
export interface RequeueDeadLetterRequest {
  deadLetterId: string;
  options?: {
    maxRetries?: number;
    priority?: number;
  };
}

/** Mark dead letter resolved request */
export interface MarkDeadLetterResolvedRequest {
  deadLetterId: string;
  resolution: string;
  resolutionCategory?: string;
}

// =============================================================================
// QUERY FILTERS
// =============================================================================

/** Common operational query filters */
export interface OperationalQueryFilters {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  since?: string;
  until?: string;
  status?: string | string[];
  channel?: Channel | Channel[];
  search?: string;
}

/** Publish job query filters */
export interface PublishJobQueryFilters extends OperationalQueryFilters {
  status?: 'pending' | 'scheduled' | 'ready' | 'publishing' | 'published' | 'failed' | 'retry_scheduled';
  channel?: Channel;
  priority?: number;
  claimedBy?: string;
}

/** Crawl job query filters */
export interface CrawlJobQueryFilters extends OperationalQueryFilters {
  type?: 'flash_sale' | 'search' | 'product';
  shopId?: string;
  status?: 'pending' | 'running' | 'completed' | 'failed';
}

/** Dead letter query filters */
export interface DeadLetterQueryFilters extends OperationalQueryFilters {
  status?: 'quarantined' | 'review' | 'resolved' | 'discarded';
  operation?: string;
  errorCategory?: string;
}

/** Admin action log filters */
export interface AdminActionLogFilters extends OperationalQueryFilters {
  actorId?: string;
  actionType?: AdminActionType;
  targetType?: AdminTargetType;
  targetId?: string;
  resultStatus?: 'success' | 'failure' | 'rejected' | 'skipped';
}

// =============================================================================
// GUARD DECISIONS
// =============================================================================

/** Guard decision result */
export interface ControlPlaneGuardDecision {
  allowed: boolean;
  reason?: string;
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

// =============================================================================
// ACTION RESULTS
// =============================================================================

/** Result of an admin action */
export interface AdminActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: AdminApiError;
  correlationId: string;
  actionType: AdminActionType;
  targetType?: AdminTargetType;
  targetId?: string;
}

// =============================================================================
// AUDIT RECORD
// =============================================================================

/** Input for audit logging */
export interface AdminAuditRecordInput {
  actorId: string;
  actorRole: AdminRole;
  actorEmail?: string;
  actionType: AdminActionType;
  targetType?: AdminTargetType;
  targetId?: string;
  requestPayload?: Record<string, unknown>;
  resultStatus: 'success' | 'failure' | 'rejected' | 'skipped';
  resultSummary?: string;
  resultErrorCode?: string;
  correlationId?: string;
  sourceIp?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}
