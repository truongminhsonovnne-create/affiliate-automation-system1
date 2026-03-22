/**
 * Status Formatters
 *
 * Utilities for formatting status, severity, and labels.
 */

import type {
  ProductStatus,
  CrawlJobStatus,
  PublishJobStatus,
  AiContentStatus,
  WorkerStatus,
  DeadLetterStatus,
} from '../types/api';

// =============================================================================
// Status to Label Mapping
// =============================================================================

/** Product status labels */
export const productStatusLabels: Record<ProductStatus, string> = {
  pending: 'Chờ xử lý',
  active: 'Hoạt động',
  inactive: 'Không hoạt động',
  error: 'Lỗi',
};

/** Crawl job status labels */
export const crawlJobStatusLabels: Record<CrawlJobStatus, string> = {
  pending: 'Chờ',
  running: 'Đang chạy',
  completed: 'Hoàn thành',
  failed: 'Thất bại',
  cancelled: 'Đã hủy',
};

/** Publish job status labels */
export const publishJobStatusLabels: Record<PublishJobStatus, string> = {
  pending: 'Chờ',
  running: 'Đang chạy',
  completed: 'Hoàn thành',
  failed: 'Thất bại',
  cancelled: 'Đã hủy',
};

/** AI content status labels */
export const aiContentStatusLabels: Record<AiContentStatus, string> = {
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  completed: 'Hoàn thành',
  failed: 'Thất bại',
};

/** Worker status labels */
export const workerStatusLabels: Record<WorkerStatus, string> = {
  active: 'Hoạt động',
  idle: 'Rảnh',
  paused: 'Tạm dừng',
  error: 'Lỗi',
};

/** Dead letter status labels */
export const deadLetterStatusLabels: Record<DeadLetterStatus, string> = {
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  processed: 'Đã xử lý',
  failed: 'Thất bại',
};

// =============================================================================
// Format Functions
// =============================================================================

/**
 * Format product status
 */
export function formatProductStatus(status: string | undefined | null): string {
  if (!status) return '-';
  return productStatusLabels[status as ProductStatus] || status;
}

/**
 * Format crawl job status
 */
export function formatCrawlJobStatus(status: string | undefined | null): string {
  if (!status) return '-';
  return crawlJobStatusLabels[status as CrawlJobStatus] || status;
}

/**
 * Format publish job status
 */
export function formatPublishJobStatus(status: string | undefined | null): string {
  if (!status) return '-';
  return publishJobStatusLabels[status as PublishJobStatus] || status;
}

/**
 * Format AI content status
 */
export function formatAiContentStatus(status: string | undefined | null): string {
  if (!status) return '-';
  return aiContentStatusLabels[status as AiContentStatus] || status;
}

/**
 * Format worker status
 */
export function formatWorkerStatus(status: string | undefined | null): string {
  if (!status) return '-';
  return workerStatusLabels[status as WorkerStatus] || status;
}

/**
 * Format dead letter status
 */
export function formatDeadLetterStatus(status: string | undefined | null): string {
  if (!status) return '-';
  return deadLetterStatusLabels[status as DeadLetterStatus] || status;
}

/**
 * Format platform
 */
export function formatPlatform(platform: string | undefined | null): string {
  if (!platform) return '-';
  const platformLabels: Record<string, string> = {
    shopee: 'Shopee',
    lazada: 'Lazada',
    tiktok: 'TikTok Shop',
    tiki: 'Tiki',
  };
  return platformLabels[platform.toLowerCase()] || platform;
}

/**
 * Format activity type
 */
export function formatActivityType(type: string | undefined | null): string {
  if (!type) return '-';
  const typeLabels: Record<string, string> = {
    CRAWL_STARTED: 'Bắt đầu crawl',
    CRAWL_COMPLETED: 'Hoàn thành crawl',
    CRAWL_FAILED: 'Crawl thất bại',
    PUBLISH_STARTED: 'Bắt đầu publish',
    PUBLISH_COMPLETED: 'Hoàn thành publish',
    PUBLISH_FAILED: 'Publish thất bại',
    AI_CONTENT_CREATED: 'Tạo AI content',
    WORKER_REGISTERED: 'Worker đăng ký',
    WORKER_HEARTBEAT: 'Worker heartbeat',
    SUCCESS: 'Thành công',
    ERROR: 'Lỗi',
    INFO: 'Thông tin',
  };
  return typeLabels[type.toUpperCase()] || type;
}
