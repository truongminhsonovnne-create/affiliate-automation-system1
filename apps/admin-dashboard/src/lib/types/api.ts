/**
 * Frontend API Types
 *
 * Type definitions matching the backend dashboard API contracts.
 * These types ensure type-safe integration with the internal dashboard APIs.
 */

// =============================================================================
// Base API Types
// =============================================================================

/** Base API response wrapper */
export interface ApiResponse<T> {
  ok: boolean;
  status: 'success' | 'error';
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
  timestamp: string;
  correlationId: string;
}

/** API error details */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
}

/** API response metadata */
export interface ApiMeta {
  queryTimeMs?: number;
  cacheHit?: boolean;
  version?: string;
  requestId?: string;
}

/** Pagination metadata from API */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore?: boolean;
}

/** Paginated result wrapper */
export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

// =============================================================================
// Dashboard Overview Types
// =============================================================================

/** Dashboard overview data */
export interface DashboardOverviewData {
  totalProducts: number;
  publishJobsToday: number;
  activeWorkers: number;
  successRate: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalJobs: number;
  shopeeProducts: number;
  lazadaProducts: number;
  tiktokProducts: number;
  tikiProducts: number;
  totalActivities: number;
  totalWorkers: number;
  idleWorkers: number;
  errorWorkers: number;
  newFailures24h: number;
  maxCount: number;
  /** Current dead letter queue depth */
  deadLetters?: number;
  /** ISO timestamp of last crawl job */
  lastCrawlAt?: string;
  /** ISO timestamp of last product added */
  lastProductAt?: string;
  trends?: {
    crawl: { count: number };
    publish: { count: number };
    ai_content: { count: number };
    worker: { count: number };
  };
}

/** Full dashboard overview */
export interface DashboardOverview {
  data: DashboardOverviewData;
}

// =============================================================================
// Activity Feed Types
// =============================================================================

/** Activity item */
export interface ActivityRecord {
  id: string;
  type: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  created_at: string;
}

/** Activity feed */
export interface DashboardActivityFeed {
  data: ActivityRecord[];
  meta: PaginationMeta;
}

// =============================================================================
// Product Types
// =============================================================================

/** Product status */
export type ProductStatus = 'active' | 'inactive' | 'pending' | 'error';

/** Product record from API */
export interface ProductRecord {
  id: string;
  external_product_id: string;
  name: string;
  platform: string;
  price: number;
  status: ProductStatus;
  source_type?: string;
  created_at: string;
  updated_at?: string;
}

// =============================================================================
// Crawl Job Types
// =============================================================================

/** Crawl job status */
export type CrawlJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/** Crawl job record from API */
export interface CrawlJobRecord {
  id: string;
  platform: string;
  keyword?: string;
  status: CrawlJobStatus;
  total_products?: number;
  new_products?: number;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

// =============================================================================
// Publish Job Types
// =============================================================================

/** Publish job status */
export type PublishJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/** Publish job record from API */
export interface PublishJobRecord {
  id: string;
  platform: string;
  content_type?: string;
  status: PublishJobStatus;
  total_items?: number;
  successful_items?: number;
  failed_items?: number;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

// =============================================================================
// AI Content Types
// =============================================================================

/** AI content status */
export type AiContentStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** AI content record from API */
export interface AiContentRecord {
  id: string;
  product_name?: string;
  content_type?: string;
  ai_model?: string;
  status: AiContentStatus;
  confidence_score?: number;
  created_at: string;
  completed_at?: string;
}

// =============================================================================
// Dead Letter Types
// =============================================================================

/** Dead letter status */
export type DeadLetterStatus = 'pending' | 'processing' | 'processed' | 'failed';

/** Dead letter record from API */
export interface DeadLetterRecord {
  id: string;
  source_type?: string;
  entity_id?: string;
  error_message?: string;
  retry_count?: number;
  status: DeadLetterStatus;
  created_at: string;
  processed_at?: string;
}

// =============================================================================
// Worker Types
// =============================================================================

/** Worker status */
export type WorkerStatus = 'active' | 'idle' | 'paused' | 'error';

/** Worker record from API */
export interface WorkerRecord {
  id: string;
  worker_id: string;
  worker_type?: string;
  status: WorkerStatus;
  current_job_id?: string;
  jobs_completed?: number;
  jobs_failed?: number;
  cpu_usage?: number;
  memory_usage?: number;
  last_heartbeat?: string;
  created_at?: string;
}

// =============================================================================
// Failure Insights Types
// =============================================================================

/** Failure insight record */
export interface FailureInsightRecord {
  error_type: string;
  error_message: string;
  count: number;
  percentage?: number;
  last_occurrence: string;
  affected_entities?: string[];
}

/** Failure summary */
export interface DashboardFailureSummary {
  data: {
    insights: FailureInsightRecord[];
    newFailures24h: number;
    maxCount: number;
    trends?: {
      crawl: { count: number };
      publish: { count: number };
      ai_content: { count: number };
      worker: { count: number };
    };
  };
}

// =============================================================================
// Trend Types
// =============================================================================

/** Dashboard trends */
export interface DashboardTrends {
  data: {
    newFailures24h: number;
    maxCount: number;
    trends?: {
      crawl: { count: number };
      publish: { count: number };
      ai_content: { count: number };
      worker: { count: number };
    };
  };
}

// =============================================================================
// Query Filter Types
// =============================================================================

/** Dashboard time range */
export type DashboardTimeRange = '1h' | '6h' | '24h' | '7d' | '30d' | 'custom';

/** Sort direction */
export type SortDirection = 'asc' | 'desc';

/** List query filters */
export interface ListQueryFilters {
  timeRange?: DashboardTimeRange;
  status?: string;
  platform?: string;
  sourceType?: string;
  contentType?: string;
  aiModel?: string;
  [key: string]: unknown;
  workerType?: string;
  entityType?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: SortDirection;
}
