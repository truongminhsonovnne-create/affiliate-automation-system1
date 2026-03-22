/**
 * Public API Client — Browser-safe client for the voucher resolution public API.
 *
 * Supports both synchronous resolution (fast path) and asynchronous resolution
 * (queued + polling with exponential backoff). The internal API URL never leaks
 * to the browser; all calls go through the Next.js /api/public/v1/resolve route.
 */

import type {
  PublicVoucherResolveResponse,
  PublicVoucherResolveStatus,
  PublicVoucherBestMatchDto,
  PublicVoucherCandidateDto,
  PublicDiscountType,
} from './types';
import type {
  QueuedResolutionResponse,
  PhaseMappingResult,
  EngineResolutionStatus,
  PublicResolutionPhase,
} from './types';

// =============================================================================
// Re-export public types
// =============================================================================

export type { PublicDiscountType };
export type { PublicResolutionPhase };
export type { PhaseMappingResult };

// =============================================================================
// Async resolution constants
// =============================================================================

/** Minimum ms to wait between consecutive poll attempts */
const POLL_INTERVAL_MS = 800;
/** Multiply interval by this each retry */
const POLL_BACKOFF_MULTIPLIER = 1.6;
/** Cap backoff at this value (ms) */
const POLL_MAX_INTERVAL_MS = 8_000;
/** Stop polling after this many attempts */
const MAX_POLL_ATTEMPTS = 15;
/** After this many ms, show a long-wait fallback message */
const LONG_WAIT_THRESHOLD_MS = 12_000;
/** After this many ms, the request is considered expired */
const EXPIRED_THRESHOLD_MS = 60_000;

// =============================================================================
// Client-side state types
// =============================================================================

export interface VoucherResolveOptions {
  /** Signal for request cancellation */
  signal?: AbortSignal;
  /** Called each time polling updates the phase */
  onPhaseChange?: (phase: PhaseMappingResult) => void;
  /** Called on each poll (allows UI to show "updating...") */
  onPoll?: (attempt: number, elapsedMs: number) => void;
}

export interface ResolutionState {
  status: ResolutionStatus;
  requestId: string | null;
  bestMatch: BestMatchDetail | null;
  candidates: CandidateCard[];
  performance: PerformanceMeta | null;
  warnings: WarningItem[];
  explanation: ExplanationCard | null;
  error: ErrorCard | null;
  /** Confidence score 0-1 from backend resolve pipeline */
  confidenceScore?: number;
  /** Which source provided the best match */
  matchedSource?: string;
  /** Data freshness level */
  dataFreshness?: DataFreshnessLevel;
}

export type DataFreshnessLevel = 'live' | 'recent' | 'stale' | 'unknown';

export type ResolutionStatus =
  | 'idle'
  | 'queued'
  | 'processing'
  | 'retrying'
  | 'success'
  | 'no_match'
  | 'invalid_link'
  | 'rate_limited'
  | 'expired'
  | 'failed'
  | 'error';

export interface BestMatchCard {
  voucherId: string;
  code: string;
  discountType: PublicDiscountType;
  discountValue: string;
  minSpend: string | null;
  maxDiscount: string | null;
  validUntil: string;
  headline: string;
  applicableCategories: string[];
}

export interface CandidateCard {
  voucherId: string;
  code: string;
  discountText: string;
  rank: number;
  reason?: string;
}

export interface PerformanceMeta {
  totalLatencyMs: number;
  servedFromCache: boolean;
  resolvedAt: string;
}

export interface WarningItem {
  code: string;
  message: string;
  severity: 'info' | 'warning';
}

export interface ErrorCard {
  code: string;
  message: string;
}

export interface ExplanationCard {
  summary: string;
  tips: string[];
  context?: string;
}

/** Enriched best match — includes conditions, scope, and warnings for the analysis panel */
export interface BestMatchDetail extends BestMatchCard {
  /** Plain-language conditions (e.g. "Áp dụng cho đơn từ 150K") */
  conditions: string[];
  /** Shop/category scope — e.g. ["Tiki", "Shop Official"] */
  scope: string[];
  /** Whether the voucher is verified by the engine */
  isVerified: boolean;
  /** Whether the voucher was in the cache */
  servedFromCache: boolean;
  /** All warnings associated with this voucher */
  warnings: WarningItem[];
  /** Total candidates considered */
  totalCandidates: number;
  /** Match quality label derived from confidence score */
  matchQuality: 'high' | 'medium' | 'low';
  /** Why this match was selected */
  selectionReason?: string;
}

/** Full analysis result for a single lookup */
export interface AnalysisResult {
  /** Original URL submitted by the user */
  originalUrl: string;
  /** Normalized display label */
  displayLabel: string;
  /** Platform inferred from URL */
  platform: string;
  /** Resolution status */
  outcome: ResolutionStatus;
  /** Best voucher (may be null for no_match) */
  bestMatch: BestMatchDetail | null;
  /** All other candidates */
  candidates: CandidateCard[];
  /** Explanation / ranking rationale */
  explanation: ExplanationCard | null;
  /** Performance metadata */
  performance: PerformanceMeta | null;
  /** Confidence score 0-1 (null if not provided by backend) */
  confidenceScore?: number;
  /** Source that provided the best match */
  matchedSource?: string;
  /** Data freshness level */
  dataFreshness?: DataFreshnessLevel;
  /** Processing metadata */
  meta: AnalysisMeta;
}

export interface AnalysisMeta {
  /** Whether served from cache */
  servedFromCache: boolean;
  /** Server-reported resolution time in ms */
  serverDurationMs: number | null;
  /** User-reported (client-side) latency in ms */
  clientLatencyMs: number;
  /** When the resolution was completed */
  resolvedAt: string;
  /** Whether the result is stale (expiry data may be outdated) */
  isStale: boolean;
}

// =============================================================================
// Phase mapping
// =============================================================================

/**
 * Map the engine's raw status to our UI-friendly phase.
 */
export function mapEngineStatusToPhase(
  rawStatus: EngineResolutionStatus | null,
  httpStatus: number
): PhaseMappingResult {
  if (httpStatus === 200) {
    // Done — final state
    switch (rawStatus) {
      case 'succeeded':
        return { phase: 'success', isDone: true, isRetryable: false, retryCount: 0, elapsedMs: 0, serverDurationMs: null };
      case 'no_match':
        return { phase: 'no_match', isDone: true, isRetryable: true, retryCount: 0, elapsedMs: 0, serverDurationMs: null };
      case 'failed':
        return { phase: 'failed', isDone: true, isRetryable: true, retryCount: 0, elapsedMs: 0, serverDurationMs: null };
      case 'expired':
        return { phase: 'expired', isDone: true, isRetryable: true, retryCount: 0, elapsedMs: 0, serverDurationMs: null };
      case 'cached':
        return { phase: 'success', isDone: true, isRetryable: false, retryCount: 0, elapsedMs: 0, serverDurationMs: null };
      default:
        return { phase: 'failed', isDone: true, isRetryable: true, retryCount: 0, elapsedMs: 0, serverDurationMs: null };
    }
  }

  // 202 = still in flight
  switch (rawStatus) {
    case 'pending':
      return { phase: 'queued', isDone: false, isRetryable: false, retryCount: 0, elapsedMs: 0, serverDurationMs: null };
    case 'processing':
      return { phase: 'processing', isDone: false, isRetryable: false, retryCount: 0, elapsedMs: 0, serverDurationMs: null };
    default:
      // Unexpected intermediate status — keep polling
      return { phase: 'processing', isDone: false, isRetryable: false, retryCount: 0, elapsedMs: 0, serverDurationMs: null };
  }
}

// =============================================================================
// Async Resolution Pipeline
// =============================================================================

/**
 * Full async resolution: submits the request then polls until done.
 *
 * Returns the final ResolutionState regardless of how long it took.
 * Throws ProxyError on unrecoverable network failures.
 *
 * Calls onPhaseChange and onPoll callbacks for real-time UI updates.
 */
export async function resolveVoucherAsync(
  input: string,
  options: VoucherResolveOptions = {}
): Promise<ResolutionState> {
  const { signal, onPhaseChange, onPoll } = options;

  // ---- Step 1: Submit ----
  const submitResponse = await submitVoucherResolution(input, signal);
  const { requestId } = submitResponse;

  if (!requestId) {
    // Synchronous result — no async needed
    return buildResolutionState(submitResponse as PublicVoucherResolveResponse);
  }

  // We have a requestId — enter polling
  let attempt = 0;
  let interval = POLL_INTERVAL_MS;
  const startTime = Date.now();

  while (attempt < MAX_POLL_ATTEMPTS) {
    // Check abort before polling
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortException');
    }

    // Respect backoff interval
    await sleep(interval);

    // Check abort after sleeping
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortException');
    }

    attempt++;
    const elapsedMs = Date.now() - startTime;

    onPoll?.(attempt, elapsedMs);

    const pollResponse = await pollVoucherResolution(requestId, signal);
    const phaseResult = mapEngineStatusToPhase(
      pollResponse.resolutionStatus,
      pollResponse.httpStatus
    );

    // Provide elapsed + server duration context
    phaseResult.elapsedMs = elapsedMs;
    phaseResult.serverDurationMs = pollResponse.durationMs ?? null;
    phaseResult.retryCount = attempt - 1;

    onPhaseChange?.(phaseResult);

    if (phaseResult.isDone) {
      // Map the queued response to a ResolutionState
      if (
        phaseResult.phase === 'success' &&
        pollResponse.httpStatus === 200
      ) {
        // Build state from the final API result
        return buildResolutionStateFromPoll(pollResponse);
      }
      // Map final phase to a ResolutionState
      return buildStateFromPhase(
        phaseResult.phase,
        requestId,
        elapsedMs
      );
    }

    // Exponential backoff
    interval = Math.min(interval * POLL_BACKOFF_MULTIPLIER, POLL_MAX_INTERVAL_MS);
  }

  // Ran out of attempts
  const elapsedMs = Date.now() - startTime;
  if (elapsedMs >= EXPIRED_THRESHOLD_MS) {
    return buildStateFromPhase('expired', requestId, elapsedMs);
  }
  return buildStateFromPhase('failed', requestId, elapsedMs);
}

/**
 * Submit a resolution request. Returns the raw response.
 * May return a queued response with a requestId (async path).
 */
export async function submitVoucherResolution(
  input: string,
  signal?: AbortSignal
): Promise<PublicVoucherResolveResponse | { requestId: string; queued: true }> {
  const controller = new AbortController();
  if (signal) signal.addEventListener('abort', () => controller.abort());

  const response = await fetch('/api/public/v1/resolve', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ input }),
    signal: controller.signal,
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new ProxyError('RATE_LIMITED', 'Too many requests', response.status);
    }
    throw new ProxyError('HTTP_ERROR', `Request failed: ${response.status}`, response.status);
  }

  const data = await response.json() as PublicVoucherResolveResponse;

  // If the internal engine returned a queued response with a requestId,
  // treat it as async and return the requestId for polling
  if (data.requestId && data.requestId.length > 0) {
    return { requestId: data.requestId, queued: true };
  }

  return data;
}

/**
 * Poll for resolution status by requestId.
 */
export async function pollVoucherResolution(
  requestId: string,
  signal?: AbortSignal
): Promise<QueuedResolutionResponse> {
  const controller = new AbortController();
  if (signal) signal.addEventListener('abort', () => controller.abort());

  const response = await fetch(`/api/public/v1/resolve?requestId=${encodeURIComponent(requestId)}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal: controller.signal,
  });

  if (!response.ok) {
    throw new ProxyError(
      'POLL_ERROR',
      `Poll failed: ${response.status}`,
      response.status
    );
  }

  return response.json() as Promise<QueuedResolutionResponse>;
}

// =============================================================================
// Legacy sync resolver (kept for compatibility)
// =============================================================================

export async function resolveVoucher(
  input: string,
  options?: VoucherResolveOptions
): Promise<PublicVoucherResolveResponse> {
  const controller = new AbortController();
  if (options?.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }

  const response = await fetch('/api/public/v1/resolve', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ input }),
    signal: controller.signal,
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new ProxyError('RATE_LIMITED', 'Too many requests', response.status);
    }
    throw new ProxyError('HTTP_ERROR', `Request failed: ${response.status}`, response.status);
  }

  return response.json() as Promise<PublicVoucherResolveResponse>;
}

// =============================================================================
// Proxy Error
// =============================================================================

export class ProxyError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly httpStatus: number
  ) {
    super(message);
    this.name = 'ProxyError';
  }
}

// =============================================================================
// State Builders
// =============================================================================

export function buildResolutionState(
  apiResponse: PublicVoucherResolveResponse,
  previousState?: Partial<ResolutionState>
): ResolutionState {
  const status = classifyStatus(apiResponse.status);
  const performance: PerformanceMeta = {
    totalLatencyMs: apiResponse.performance.totalLatencyMs,
    servedFromCache: apiResponse.performance.servedFromCache,
    resolvedAt: apiResponse.performance.resolvedAt,
  };

  return {
    status,
    requestId: apiResponse.requestId,
    candidates: apiResponse.candidates.map(mapCandidate),
    bestMatch: apiResponse.bestMatch
      ? mapBestMatch(
          apiResponse.bestMatch,
          apiResponse.confidenceScore,
          apiResponse.matchedSource,
          apiResponse.warnings,
          apiResponse.candidates.map(mapCandidate),
        )
      : null,
    performance,
    warnings: apiResponse.warnings ?? [],
    explanation: apiResponse.explanation
      ? {
          summary: apiResponse.explanation.summary,
          tips: apiResponse.explanation.tips ?? [],
          context: apiResponse.explanation.context,
        }
      : null,
    error:
      status === 'error'
        ? {
            code: apiResponse.warnings?.[0]?.code ?? 'UNKNOWN',
            message:
              apiResponse.warnings?.[0]?.message ??
              'Đã xảy ra lỗi. Vui lòng thử lại.',
          }
        : null,
    confidenceScore: apiResponse.confidenceScore,
    matchedSource: apiResponse.matchedSource,
    dataFreshness: apiResponse.dataFreshness,
  };
}

/** Build state from a poll response (final 200 with full data) */
function buildResolutionStateFromPoll(
  poll: QueuedResolutionResponse & {
    data?: PublicVoucherResolveResponse;
  }
): ResolutionState {
  const data = (poll as unknown as { data?: PublicVoucherResolveResponse }).data;
  if (!data) {
    return buildStateFromPhase('failed', poll.requestId, poll.durationMs ?? 0);
  }
  return buildResolutionState(data);
}

/** Build a terminal ResolutionState from a phase */
function buildStateFromPhase(
  phase: PublicResolutionPhase,
  requestId: string,
  latencyMs: number
): ResolutionState {
  switch (phase) {
    case 'success':
      return {
        status: 'success',
        requestId,
        bestMatch: null,
        candidates: [],
        performance: { totalLatencyMs: latencyMs, servedFromCache: false, resolvedAt: new Date().toISOString() },
        warnings: [],
        explanation: null,
        error: null,
      };
    case 'no_match':
      return {
        status: 'no_match',
        requestId,
        bestMatch: null,
        candidates: [],
        performance: { totalLatencyMs: latencyMs, servedFromCache: false, resolvedAt: new Date().toISOString() },
        warnings: [],
        explanation: null,
        error: null,
      };
    case 'expired':
      return {
        status: 'expired',
        requestId,
        bestMatch: null,
        candidates: [],
        performance: { totalLatencyMs: latencyMs, servedFromCache: false, resolvedAt: new Date().toISOString() },
        warnings: [],
        explanation: null,
        error: { code: 'EXPIRED', message: 'Yêu cầu hết hạn. Vui lòng thử lại.' },
      };
    case 'failed':
      return {
        status: 'error',
        requestId,
        bestMatch: null,
        candidates: [],
        performance: { totalLatencyMs: latencyMs, servedFromCache: false, resolvedAt: new Date().toISOString() },
        warnings: [],
        explanation: null,
        error: { code: 'PROCESSING_FAILED', message: 'Xử lý thất bại. Vui lòng thử lại.' },
      };
    default:
      return {
        status: 'error',
        requestId,
        bestMatch: null,
        candidates: [],
        performance: { totalLatencyMs: latencyMs, servedFromCache: false, resolvedAt: new Date().toISOString() },
        warnings: [],
        explanation: null,
        error: { code: 'UNKNOWN_PHASE', message: 'Trạng thái không xác định.' },
      };
  }
}

// =============================================================================
// Status Classification
// =============================================================================

export function classifyStatus(status: PublicVoucherResolveStatus): ResolutionStatus {
  switch (status) {
    case 'success':
      return 'success';
    case 'no_match':
      return 'no_match';
    case 'invalid_input':
      return 'invalid_link';
    case 'rate_limited':
      return 'rate_limited';
    default:
      return 'error';
  }
}

// =============================================================================
// Internal mappers
// =============================================================================

function mapBestMatch(
  raw: PublicVoucherBestMatchDto,
  confidenceScore?: number,
  matchedSource?: string,
  warnings?: WarningItem[],
  candidates?: CandidateCard[],
): BestMatchDetail {
  // Build minimal BestMatchCard then enrich
  const card: BestMatchCard = {
    voucherId: raw.voucherId,
    code: raw.code,
    discountType: raw.discountType,
    discountValue: raw.discountValue,
    minSpend: raw.minSpend,
    maxDiscount: raw.maxDiscount,
    validUntil: raw.validUntil,
    headline: raw.headline,
    applicableCategories: raw.applicableCategories ?? [],
  };
  return enrichBestMatch(card, candidates ?? [], warnings ?? [], confidenceScore, matchedSource);
}

function mapCandidate(raw: PublicVoucherCandidateDto): CandidateCard {
  return {
    voucherId: raw.voucherId,
    code: raw.code,
    discountText: raw.discountText,
    rank: raw.rank,
    reason: raw.reason,
  };
}

// =============================================================================
// Analysis Result Builder
// =============================================================================

/**
 * Build a rich AnalysisResult from a ResolutionState + metadata.
 * This is the canonical way to construct analysis data for the UI.
 */
export function buildAnalysisResult(
  originalUrl: string,
  state: ResolutionState,
  clientLatencyMs: number
): AnalysisResult {
  const platform = extractPlatform(originalUrl);
  const displayLabel = buildDisplayLabelFromUrl(originalUrl);

  return {
    originalUrl,
    displayLabel,
    platform,
    outcome: state.status,
    bestMatch: state.bestMatch
      ? enrichBestMatch(state.bestMatch, state.candidates, state.warnings, state.confidenceScore, state.matchedSource)
      : null,
    candidates: state.candidates,
    explanation: state.explanation,
    performance: state.performance,
    confidenceScore: state.confidenceScore,
    matchedSource: state.matchedSource,
    dataFreshness: state.dataFreshness,
    meta: {
      servedFromCache: state.performance?.servedFromCache ?? false,
      serverDurationMs: state.performance?.totalLatencyMs ?? null,
      clientLatencyMs,
      resolvedAt: state.performance?.resolvedAt ?? new Date().toISOString(),
      isStale: isResultStale(state),
    },
  };
}

function enrichBestMatch(
  card: BestMatchCard,
  candidates: CandidateCard[],
  warnings: WarningItem[],
  confidenceScore?: number,
  matchedSource?: string,
): BestMatchDetail {
  const expiry = card.validUntil;
  const isExpired = expiry ? new Date(expiry).getTime() < Date.now() : false;
  const isExpiringSoon = expiry
    ? new Date(expiry).getTime() - Date.now() < 24 * 60 * 60 * 1000
    : false;

  const conditions: string[] = [];
  if (card.minSpend) {
    conditions.push(`Đơn tối thiểu ${card.minSpend}`);
  }
  if (card.maxDiscount) {
    conditions.push(`Giảm tối đa ${card.maxDiscount}`);
  }
  if (card.applicableCategories.length > 0) {
    conditions.push(
      `Áp dụng: ${card.applicableCategories.slice(0, 3).join(', ')}${
        card.applicableCategories.length > 3
          ? ` (+${card.applicableCategories.length - 3} khác)`
          : ''
      }`
    );
  }
  if (isExpired) {
    conditions.push('⚠️ Voucher này có thể đã hết hạn');
  } else if (isExpiringSoon) {
    conditions.push('⏰ Sắp hết hạn trong hôm nay');
  }

  // Determine match quality
  const quality: 'high' | 'medium' | 'low' =
    confidenceScore == null
      ? 'medium'
      : confidenceScore >= 0.8
      ? 'high'
      : confidenceScore >= 0.5
      ? 'medium'
      : 'low';

  return {
    ...card,
    conditions,
    scope: [],
    isVerified: false,
    servedFromCache: false,
    warnings: warnings.filter((w) => w.severity === 'warning'),
    totalCandidates: candidates.length + 1,
    matchQuality: quality,
    selectionReason: buildSelectionReason(confidenceScore, matchedSource),
  };
}

function buildSelectionReason(
  confidenceScore?: number,
  matchedSource?: string
): string | undefined {
  if (matchedSource === 'AccessTrade') {
    return 'Voucher chương trình Affiliate — được đối soát thường xuyên';
  }
  if (matchedSource === 'MasOffer') {
    return 'Từ mạng lưới đối tác chính thức';
  }
  if (matchedSource?.includes('broad') || matchedSource === 'MasOffer_broad') {
    return 'Broad promotion — áp dụng chung cho nhiều sản phẩm';
  }
  if (confidenceScore == null) return undefined;
  if (confidenceScore >= 0.9) return 'Kết quả khớp chính xác cao';
  if (confidenceScore >= 0.7) return 'Kết quả khớp tốt';
  if (confidenceScore >= 0.5) return 'Kết quả khớp trung bình — có thể có lựa chọn tốt hơn';
  return 'Kết quả khớp thấp — nên thử thêm';
}

function extractPlatform(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('shopee')) return 'shopee';
  if (lower.includes('lazada')) return 'lazada';
  if (lower.includes('tiki')) return 'tiki';
  if (lower.includes('tiktok')) return 'tiktok';
  return 'unknown';
}

function buildDisplayLabelFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, '');
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const lastSegment = pathParts[pathParts.length - 1] ?? '';
    const label = lastSegment
      .replace(/-/g, ' ')
      .replace(/\.[^.]+$/, '')
      .replace(/(.{47})..+/, '$1…')
      .trim();
    if (label.length > 2) return `${hostname} · ${label}`;
    return hostname;
  } catch {
    return url.length > 50 ? url.slice(0, 47) + '…' : url;
  }
}

function isResultStale(state: ResolutionState): boolean {
  if (!state.bestMatch?.validUntil) return false;
  const expiryMs = new Date(state.bestMatch.validUntil).getTime();
  return expiryMs < Date.now() || expiryMs - Date.now() > 30 * 24 * 60 * 60 * 1000;
}

// =============================================================================
// Utility helpers
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatExpiry(isoDate: string): string {
  const target = new Date(isoDate);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();

  if (diffMs <= 0) return 'Hết hạn';

  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 1) {
    const mins = Math.floor(diffMs / (1000 * 60));
    return `Còn ${mins} phút`;
  }
  if (diffHours < 24) {
    const hours = Math.floor(diffHours);
    return `Còn ${hours} giờ`;
  }
  const days = Math.floor(diffHours / 24);
  return `Còn ${days} ngày`;
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
