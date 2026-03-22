/**
 * History Types
 *
 * Type definitions for the lookup history feature.
 * All types are plain serializable objects — suitable for localStorage or future
 * backend persistence with minimal refactoring.
 */

import type {
  BestMatchDetail,
  BestMatchCard,
  CandidateCard,
  ExplanationCard,
  PerformanceMeta,
  WarningItem,
  DataFreshnessLevel,
} from './api-client';

export type { PerformanceMeta, WarningItem };

// =============================================================================
// Lookup History Record
// =============================================================================

/** A single lookup history entry stored locally. */
export interface LookupHistoryEntry {
  /** Stable client-generated UUID */
  id: string;

  /** The URL submitted by the user */
  inputUrl: string;

  /** Platform inferred from the URL (e.g. 'shopee') */
  platform: string;

  /** Normalized display label (product title if resolved, otherwise domain) */
  displayLabel: string;

  /** When the lookup was performed */
  performedAt: string; // ISO 8601

  /** Resolution outcome */
  outcome: LookupOutcome;

  /** User-friendly outcome label */
  outcomeLabel: string;

  /** User-friendly outcome description */
  outcomeDescription: string;

  /** Voucher result if successful */
  result: LookupResult | null;

  /** Performance metadata */
  performance: PerformanceMeta | null;

  /** Warnings from the API */
  warnings: WarningItem[];

  /** Whether this entry is pinned by the user */
  pinned: boolean;

  /** Confidence score 0-1 */
  confidenceScore?: number;

  /** Source that provided the best match */
  matchedSource?: string;

  /** Data freshness level */
  dataFreshness?: DataFreshnessLevel;
}

// =============================================================================
// Outcome Types
// =============================================================================

export type LookupOutcome =
  | 'success'       // Best voucher found
  | 'no_match'     // Valid URL, no vouchers
  | 'invalid_link' // URL validation failed
  | 'rate_limited' // Too many requests
  | 'expired'      // Request expired during processing
  | 'failed'       // Processing failed
  | 'error';       // Unexpected error

// =============================================================================
// Result (serializable subset of ResolutionState)
// =============================================================================

/** The voucher data stored in history — fully serializable. */
export interface LookupResult {
  /** Best voucher card data */
  bestMatch: BestMatchDetail | null;

  /** Alternative candidates (stored in full for re-copy) */
  candidates: CandidateCard[];

  /** Explanation */
  explanation: ExplanationCard | null;

  /** Best voucher discount text for quick display */
  bestDiscountText: string;

  /** Best voucher code */
  bestCode: string | null;

  /** Number of candidates available */
  candidateCount: number;

  /** Expiry of the best voucher (ISO) */
  bestVoucherExpiry: string | null;

  /** Whether the best voucher is likely expired (based on stored expiry) */
  isExpired: boolean;
}

// =============================================================================
// Storage Types
// =============================================================================

/** Raw shape stored in localStorage */
export interface HistoryStorageData {
  version: 1;
  entries: LookupHistoryEntry[];
  lastCleanupAt: string;
}

// =============================================================================
// Configuration
// =============================================================================

export const HISTORY_CONFIG = {
  /** Maximum entries to keep in history */
  MAX_ENTRIES: 50,

  /** Maximum entries to keep for unpinned items */
  MAX_UNPINNED_ENTRIES: 50,

  /** Age threshold in ms — entries older than this are pruned on load */
  MAX_ENTRY_AGE_MS: 30 * 24 * 60 * 60 * 1000, // 30 days

  /** localStorage key */
  STORAGE_KEY: 'vf_history_v1',

  /** Storage version for future migrations */
  STORAGE_VERSION: 1,
} as const;

// =============================================================================
// Derived Labels
// =============================================================================

/** Get human-readable label for an outcome */
export function getOutcomeLabel(outcome: LookupOutcome): string {
  switch (outcome) {
    case 'success': return 'Có mã giảm giá';
    case 'no_match': return 'Không tìm thấy mã';
    case 'invalid_link': return 'Link không hợp lệ';
    case 'rate_limited': return 'Thao tác quá nhanh';
    case 'expired': return 'Yêu cầu hết hạn';
    case 'failed': return 'Xử lý thất bại';
    case 'error': return 'Có lỗi xảy ra';
  }
}

/** Get human-readable description for an outcome */
export function getOutcomeDescription(
  outcome: LookupOutcome,
  result: LookupResult | null
): string {
  switch (outcome) {
    case 'success': {
      const discount = result?.bestDiscountText ?? 'mã giảm giá';
      return `Tìm thấy ${discount}`;
    }
    case 'no_match': return 'Không có voucher nào cho sản phẩm này';
    case 'invalid_link': return 'Link không hợp lệ hoặc không nhận diện được';
    case 'rate_limited': return 'Bạn đã thao tác quá nhanh';
    case 'expired': return 'Yêu cầu mất quá nhiều thời gian và đã bị hủy';
    case 'failed': return 'Xử lý gặp sự cố, vui lòng thử lại';
    case 'error': return result?.bestMatch?.headline ?? 'Hệ thống gặp sự cố';
  }
}

/** Build a short display label from a URL */
export function buildDisplayLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, '');

    // Try to extract a meaningful path segment
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const lastSegment = pathParts[pathParts.length - 1] ?? '';

    // Truncate to 50 chars
    const label = lastSegment
      .replace(/-/g, ' ')
      .replace(/\.[^.]+$/, '') // Remove extension
      .replace(/(.{47})..+/, '$1…')
      .trim();

    if (label.length > 2) {
      return `${hostname} · ${label}`;
    }
    return hostname;
  } catch {
    // Not a valid URL — truncate as-is
    return url.length > 50 ? url.slice(0, 47) + '…' : url;
  }
}
