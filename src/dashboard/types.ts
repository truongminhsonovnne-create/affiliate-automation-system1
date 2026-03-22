/**
 * Dashboard Types
 *
 * Shared types/interfaces for the dashboard backend layer.
 * Production-grade types optimized for admin dashboard consumption.
 */

// =============================================================================
// TIME RANGES & PAGINATION
// =============================================================================

/** Dashboard time range options */
export type DashboardTimeRange = '1h' | '6h' | '24h' | '7d' | '30d' | 'custom';

/** Custom time range */
export interface DashboardCustomTimeRange {
  start: string;
  end: string;
}

/** Sort direction */
export type DashboardSortDirection = 'asc' | 'desc';

/** Pagination input */
export interface DashboardPaginationInput {
  page?: number;
  pageSize?: number;
}

/** Pagination result */
export interface DashboardPaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasMore: boolean;
}

/** Sort input */
export interface DashboardSortInput {
  field: string;
  direction: DashboardSortDirection;
}

/** Search input */
export interface DashboardSearchInput {
  query: string;
  fields?: string[];
}

// =============================================================================
// QUERY FILTERS
// =============================================================================

/** Base dashboard query filters */
export interface DashboardQueryFilters {
  timeRange?: DashboardTimeRange;
  customTimeRange?: DashboardCustomTimeRange;
  status?: string | string[];
  channel?: string | string[];
  source?: string | string[];
  priority?: number | number[];
  search?: string;
}

/** Pagination & sorting */
export interface DashboardQueryOptions extends DashboardPaginationInput {
  sort?: DashboardSortInput;
}

/** Full query with filters and options */
export interface DashboardFullQuery extends DashboardQueryFilters, DashboardQueryOptions {}

/** Query metadata returned with responses */
export interface DashboardQueryMeta {
  queryTimeMs?: number;
  cacheHit?: boolean;
  timestamp: string;
}

// =============================================================================
// PAGE RESULT
// =============================================================================

/** Paginated result wrapper */
export interface DashboardPageResult<T> {
  items: T[];
  pagination: DashboardPaginationMeta;
  meta?: DashboardQueryMeta;
}

// =============================================================================
// OVERVIEW MODELS
// =============================================================================

/** Overview cards data */
export interface DashboardOverviewCards {
  crawlJobs: CardSummary;
  publishJobs: CardSummary;
  aiEnrichment: CardSummary;
  deadLetters: CardSummary;
  activeWorkers: CardSummary;
  recentFailures: CardSummary;
}

/** Single card summary */
export interface CardSummary {
  total: number;
  success: number;
  failed: number;
  pending: number;
  inProgress: number;
  trend?: TrendIndicator;
}

/** Trend indicator */
export interface TrendIndicator {
  direction: 'up' | 'down' | 'stable';
  percentChange: number;
  comparisonPeriod: string;
}

/** Health summary */
export interface DashboardHealthSummary {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: HealthComponent[];
  lastChecked: string;
}

/** Health component */
export interface HealthComponent {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  lastChecked?: string;
}

// =============================================================================
// QUEUE & WORKER MODELS
// =============================================================================

/** Queue summary */
export interface DashboardQueueSummary {
  crawlQueue: QueueStatus;
  publishQueue: QueueStatus;
  aiQueue: QueueStatus;
}

/** Queue status */
export interface QueueStatus {
  pending: number;
  ready: number;
  inProgress: number;
  completed: number;
  failed: number;
  deadLetter: number;
  oldestJobAge?: number;
  avgWaitTime?: number;
}

/** Worker dashboard record */
export interface WorkerDashboardRecord {
  identity: string;
  type: string;
  status: 'active' | 'idle' | 'stale' | 'offline';
  lastSeenAt: string;
  currentJob?: string;
  jobsCompleted: number;
  jobsFailed: number;
  uptime?: number;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// ACTIVITY FEED
// =============================================================================

/** Activity item */
export interface DashboardActivityItem {
  id: string;
  type: ActivityType;
  severity: ActivitySeverity;
  source: ActivitySource;
  title: string;
  message: string;
  timestamp: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
  actor?: ActivityActor;
  target?: ActivityTarget;
}

/** Activity types */
export type ActivityType =
  | 'crawl_started'
  | 'crawl_completed'
  | 'crawl_failed'
  | 'publish_started'
  | 'publish_completed'
  | 'publish_failed'
  | 'ai_enrich_started'
  | 'ai_enrich_completed'
  | 'ai_enrich_failed'
  | 'job_retry'
  | 'job_cancelled'
  | 'job_unlocked'
  | 'dead_letter_created'
  | 'dead_letter_resolved'
  | 'worker_heartbeat'
  | 'system_alert'
  | 'admin_action';

/** Activity severity */
export type ActivitySeverity = 'info' | 'warning' | 'error' | 'critical';

/** Activity source */
export type ActivitySource = 'crawler' | 'publisher' | 'ai_enrichment' | 'system' | 'admin';

/** Activity actor (for admin actions) */
export interface ActivityActor {
  id: string;
  name?: string;
  role?: string;
}

/** Activity target */
export interface ActivityTarget {
  type: string;
  id: string;
  name?: string;
}

/** Activity feed result */
export interface DashboardActivityFeed {
  items: DashboardActivityItem[];
  pagination: DashboardPaginationMeta;
  meta?: DashboardQueryMeta;
}

// =============================================================================
// PRODUCT MODELS
// =============================================================================

/** Product dashboard record */
export interface ProductDashboardRecord {
  id: string;
  externalId: string;
  source: string;
  shopId?: string;
  title: string;
  price?: number;
  originalPrice?: number;
  discount?: number;
  thumbnailUrl?: string;
  categoryId?: string;
  categoryName?: string;
  status: ProductStatus;
  aiContent?: AiContentSummary;
  publishJobs?: PublishJobSummary[];
  createdAt: string;
  updatedAt: string;
}

/** Product status */
export type ProductStatus = 'pending' | 'enriched' | 'ready' | 'published' | 'failed' | 'archived';

/** AI content summary */
export interface AiContentSummary {
  id: string;
  model: string;
  promptVersion: string;
  status: 'pending' | 'completed' | 'failed';
  qualityScore?: number;
  createdAt: string;
  completedAt?: string;
}

/** Publish job summary */
export interface PublishJobSummary {
  id: string;
  channel: string;
  status: string;
  publishedAt?: string;
  publishedUrl?: string;
  attemptCount: number;
}

// =============================================================================
// CRAWL JOB MODELS
// =============================================================================

/** Crawl job dashboard record */
export interface CrawlJobDashboardRecord {
  id: string;
  type: CrawlJobType;
  status: CrawlJobStatus;
  source: string;
  keyword?: string;
  url?: string;
  shopId?: string;
  itemsFound: number;
  itemsNew: number;
  itemsUpdated: number;
  itemsFailed: number;
  duration?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  errorSummary?: string;
  metadata?: Record<string, unknown>;
}

/** Crawl job type */
export type CrawlJobType = 'flash_sale' | 'search' | 'product' | 'shop';

/** Crawl job status */
export type CrawlJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// =============================================================================
// PUBLISH JOB MODELS
// =============================================================================

/** Publish job dashboard record */
export interface PublishJobDashboardRecord {
  id: string;
  channel: Channel;
  status: PublishJobStatus;
  productId?: string;
  productTitle?: string;
  scheduledAt?: string;
  publishedAt?: string;
  claimedAt?: string;
  claimedBy?: string;
  priority: number;
  attemptCount: number;
  maxAttempts: number;
  lastError?: string;
  publishedUrl?: string;
  executionMetadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** Publish job status */
export type PublishJobStatus =
  | 'pending'
  | 'ready'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'retry_scheduled'
  | 'cancelled';

/** Channel */
export type Channel = 'tiktok' | 'facebook' | 'website';

// =============================================================================
// AI CONTENT MODELS
// =============================================================================

/** AI content dashboard record */
export interface AiContentDashboardRecord {
  id: string;
  productId: string;
  productTitle?: string;
  model: string;
  promptVersion: string;
  status: AiContentStatus;
  qualityScore?: number;
  content?: Record<string, unknown>;
  errorMessage?: string;
  processingTime?: number;
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
}

/** AI content status */
export type AiContentStatus = 'pending' | 'processing' | 'completed' | 'failed';

// =============================================================================
// DEAD LETTER MODELS
// =============================================================================

/** Dead letter dashboard record */
export interface DeadLetterDashboardRecord {
  id: string;
  jobType: string;
  operation: string;
  status: DeadLetterStatus;
  errorCode?: string;
  errorMessage: string;
  errorCategory?: string;
  payload?: Record<string, unknown>;
  attemptCount: number;
  firstAttemptAt?: string;
  lastAttemptAt?: string;
  resolvedAt?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

/** Dead letter status */
export type DeadLetterStatus = 'quarantined' | 'review' | 'resolved' | 'discarded';

// =============================================================================
// TRENDS & INSIGHTS
// =============================================================================

/** Trend data point */
export interface DashboardTrendPoint {
  timestamp: string;
  bucket: string;
  total: number;
  success: number;
  failed: number;
  pending?: number;
  inProgress?: number;
}

/** Trend series */
export interface DashboardTrendSeries {
  metric: string;
  bucketSize: 'hour' | 'day';
  dataPoints: DashboardTrendPoint[];
  summary: TrendSummary;
}

/** Trend summary */
export interface TrendSummary {
  total: number;
  success: number;
  failed: number;
  avgRate?: number;
  trend?: TrendIndicator;
}

/** Failure hotspot */
export interface DashboardFailureHotspot {
  category: string;
  subsystem: string;
  count: number;
  lastOccurred: string;
  recentErrors: string[];
  affectedJobs: number;
}

/** Failure summary */
export interface DashboardFailureSummary {
  hotspots: DashboardFailureHotspot[];
  topReasons: FailureReason[];
  totalFailures: number;
  failureRate: number;
}

/** Failure reason */
export interface FailureReason {
  reason: string;
  count: number;
  percentage: number;
  firstOccurred: string;
  lastOccurred: string;
}

// =============================================================================
// DETAIL VIEW MODELS
// =============================================================================

/** Product detail */
export interface ProductDashboardDetail extends ProductDashboardRecord {
  crawlHistory?: CrawlJobSummary[];
  publishHistory?: PublishJobSummary[];
  aiContentDetail?: AiContentDashboardRecord;
}

/** Crawl job summary for linking */
export interface CrawlJobSummary {
  id: string;
  type: string;
  status: string;
  itemsFound: number;
  completedAt?: string;
}

/** Publish job detail */
export interface PublishJobDashboardDetail extends PublishJobDashboardRecord {
  attempts: PublishJobAttempt[];
  timeline: PublishJobTimelineEvent[];
}

/** Publish job attempt */
export interface PublishJobAttempt {
  attemptNumber: number;
  startedAt: string;
  completedAt?: string;
  status: string;
  error?: string;
  publishedUrl?: string;
}

/** Publish job timeline event */
export interface PublishJobTimelineEvent {
  timestamp: string;
  event: string;
  actor?: string;
  details?: Record<string, unknown>;
}

/** Crawl job detail */
export interface CrawlJobDashboardDetail extends CrawlJobDashboardRecord {
  items?: CrawledItem[];
  errors?: CrawlError[];
  timeline: CrawlJobTimelineEvent[];
}

/** Crawled item */
export interface CrawledItem {
  id: string;
  externalId: string;
  title: string;
  price: number;
  status: string;
}

/** Crawl error */
export interface CrawlError {
  code: string;
  message: string;
  count: number;
}

/** Crawl job timeline event */
export interface CrawlJobTimelineEvent {
  timestamp: string;
  event: string;
  details?: Record<string, unknown>;
}

/** AI content detail */
export interface AiContentDashboardDetail extends AiContentDashboardRecord {
  linkedProduct?: ProductDashboardRecord;
  processingMetadata?: Record<string, unknown>;
}

// =============================================================================
// API RESPONSE CONTRACTS
// =============================================================================

/** Dashboard API status */
export type DashboardApiStatus = 'success' | 'error';

/** Dashboard API response */
export interface DashboardApiResponse<T> {
  ok: boolean;
  status: DashboardApiStatus;
  data?: T;
  error?: DashboardApiError;
  meta?: DashboardResponseMeta;
  timestamp: string;
  correlationId: string;
}

/** Dashboard API error */
export interface DashboardApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
}

/** Dashboard response metadata */
export interface DashboardResponseMeta {
  queryTimeMs?: number;
  cacheHit?: boolean;
  version?: string;
  requestId?: string;
}

// =============================================================================
// CACHE TYPES
// =============================================================================

/** Cache entry */
export interface DashboardCacheEntry<T> {
  data: T;
  expiresAt: number;
  cachedAt: number;
}

/** Cache options */
export interface DashboardCacheOptions {
  ttl?: number;
  key?: string;
}

/** Cache invalidation pattern */
export interface DashboardCacheInvalidation {
  pattern?: string;
  key?: string;
  tags?: string[];
}
