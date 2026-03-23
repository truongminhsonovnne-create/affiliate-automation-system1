// =============================================================================
// Public API Client — Browser-safe client for the voucher resolution public API.
//
// Supports both synchronous resolution (fast path) and asynchronous resolution
// (queued + polling with exponential backoff). The internal API URL never leaks
// to the browser; all calls go through the Next.js /api/public/v1/resolve route.
// =============================================================================

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
 * Map the engine's raw status + HTTP status to our UI-friendly phase.
 *
 * CRITICAL: resolutionStatus === null with httpStatus === 200 means the server
 * returned an empty/partial response (stub handler). We MUST NOT treat this as
 * 'failed' — treat it as 'queued' so the client keeps polling.
 *
 * Status table:
 *   null  + 200  → queued (server stub)       ← NEVER map to failed
 *   null  + 202  → queued/processing
 *   null  + 4xx  → failed (validation error)
 *   null  + 5xx  → failed (server error, retryable)
 *   null  + 404  → expired
 *   pending     + any → queued
 *   processing  + any → processing
 *   succeeded   + 200 → success (DONE)
 *   no_match   + 200 → no_match (DONE)
 *   failed     + 200 → failed (DONE)
 *   expired    + 200 → expired (DONE)
 *   cached     + 200 → success (DONE)
 */
export function mapEngineStatusToPhase(
  rawStatus: EngineResolutionStatus | null,
  httpStatus: number
): PhaseMappingResult {
  // ── Final HTTP codes ───────────────────────────────────────────────────────
  if (httpStatus === 200) {
    switch (rawStatus) {
      case 'succeeded':
        return { phase: 'success',    isDone: true,  isRetryable: false, retryCount: 0, elapsedMs: 0, serverDurationMs: null };
      case 'no_match':
        return { phase: 'no_match',   isDone: true,  isRetryable: true,  retryCount: 0, elapsedMs: 0, serverDurationMs: null };
      case 'failed':
        return { phase: 'failed',     isDone: true,  isRetryable: true,  retryCount: 0, elapsedMs: 0, serverDurationMs: null };
      case 'expired':
        return { phase: 'expired',    isDone: true,  isRetryable: false, retryCount: 0, elapsedMs: 0, serverDurationMs: null };
      case 'cached':
        return { phase: 'success',    isDone: true,  isRetryable: false, retryCount: 0, elapsedMs: 0, serverDurationMs: null };
      case 'not_found':
        // not_found + 200: the request was genuinely not found in the DB.
        // This is a terminal state — the user should see a friendly message.
        return { phase: 'expired',     isDone: true,  isRetryable: false, retryCount: 0, elapsedMs: 0, serverDurationMs: null };
      default:
        // rawStatus === null with 200 → server stub: keep polling
        return { phase: 'queued',      isDone: false, isRetryable: false, retryCount: 0, elapsedMs: 0, serverDurationMs: null };
    }
  }

  // 202 = still in flight
  if (httpStatus === 202) {
    switch (rawStatus) {
      case 'pending':
        return { phase: 'queued',      isDone: false, isRetryable: false, retryCount: 0, elapsedMs: 0, serverDurationMs: null };
      case 'processing':
        return { phase: 'processing',  isDone: false, isRetryable: false, retryCount: 0, elapsedMs: 0, serverDurationMs: null };
      default:
        return { phase: 'processing',  isDone: false, isRetryable: false, retryCount: 0, elapsedMs: 0, serverDurationMs: null };
    }
  }

  // ── Error codes ───────────────────────────────────────────────────────────
  if (httpStatus === 400 || httpStatus === 422) {
    return { phase: 'failed', isDone: true, isRetryable: false, retryCount: 0, elapsedMs: 0, serverDurationMs: null };
  }
  if (httpStatus === 404) {
    return { phase: 'expired', isDone: true, isRetryable: false, retryCount: 0, elapsedMs: 0, serverDurationMs: null };
  }
  if (httpStatus === 429) {
    return { phase: 'rate_limited', isDone: true, isRetryable: true, retryCount: 0, elapsedMs: 0, serverDurationMs: null };
  }
  // 5xx — server error, retryable
  if (httpStatus >= 500) {
    return { phase: 'failed', isDone: true, isRetryable: true, retryCount: 0, elapsedMs: 0, serverDurationMs: null };
  }

  // Catch-all: unknown → keep polling as queued
  return { phase: 'queued', isDone: false, isRetryable: false, retryCount: 0, elapsedMs: 0, serverDurationMs: null };
}

// =============================================================================
// Request ID helpers
// =============================================================================

/** Generate a server-safe request ID using crypto.randomUUID() */
function generateRequestId(): string {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  // Node.js 14+ fallback
  const { randomBytes } = require('crypto');
  return randomBytes(12).toString('hex');
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

  // Always generate a requestId client-side so the backend can correlate the request.
  // This is the source of truth for the requestId across the whole flow.
  const clientRequestId = generateRequestId();

  // ---- Step 1: Submit ----
  const submitResponse = await submitVoucherResolution(input, clientRequestId, signal);
  const { requestId } = submitResponse;

  // Use the server-provided requestId if it matches, otherwise fall back to our client ID
  const resolvedRequestId =
    (requestId && requestId.length >= 8) ? requestId : clientRequestId;

  if (!requestId) {
    // Synchronous result — no async needed
    const state = buildResolutionState(
      submitResponse as PublicVoucherResolveResponse,
      { requestId: clientRequestId }
    );
    return state;
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

    const pollResponse = await pollVoucherResolution(resolvedRequestId, signal);

    // Log poll result for debugging
    if (pollResponse.httpStatus >= 400) {
      // HTTP error: let the mapper handle it
    }

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
        return buildResolutionStateFromPoll(pollResponse, resolvedRequestId);
      }
      // Map final phase to a ResolutionState
      return buildStateFromPhase(
        phaseResult.phase,
        resolvedRequestId,
        elapsedMs
      );
    }

    // Exponential backoff
    interval = Math.min(interval * POLL_BACKOFF_MULTIPLIER, POLL_MAX_INTERVAL_MS);
  }

  // Ran out of attempts
  const elapsedMs = Date.now() - startTime;
  if (elapsedMs >= EXPIRED_THRESHOLD_MS) {
    return buildStateFromPhase('expired', resolvedRequestId, elapsedMs);
  }
  return buildStateFromPhase('failed', resolvedRequestId, elapsedMs);
}

/**
 * Submit a resolution request. Returns the raw response.
 * May return a queued response with a requestId (async path).
 *
 * The requestId is always included so the server can correlate logs and
 * downstream services can validate it without generating their own.
 */
export async function submitVoucherResolution(
  input: string,
  requestId: string,
  signal?: AbortSignal
): Promise<PublicVoucherResolveResponse | { requestId: string; queued: true }> {
  const controller = new AbortController();
  if (signal) signal.addEventListener('abort', () => controller.abort());

  const response = await fetch('/api/public/v1/resolve', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Client-Request-Id': requestId,
    },
    body: JSON.stringify({ input, requestId }),
    signal: controller.signal,
  });

  if (!response.ok) {
    const errorBody = await safeReadJson(response) as Record<string, unknown> | null;
    const serverCode = errorBody?.code ?? (errorBody?.error as Record<string, unknown>)?.code ?? null;

    // Distinguish validation errors (4xx) from infrastructure errors (5xx)
    if (response.status === 429) {
      throw new ProxyError('RATE_LIMITED', 'Too many requests', response.status);
    }
    if (response.status === 400 || response.status === 422) {
      const msg = extractErrorMessage(errorBody);
      throw new ProxyError(
        (serverCode as string) ?? 'VALIDATION_ERROR',
        msg,
        response.status
      );
    }
    if (response.status >= 500) {
      throw new ProxyError(
        (serverCode as string) ?? 'DOWNSTREAM_ERROR',
        `Server error (${response.status}). Please retry.`,
        response.status
      );
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

/** Read JSON safely without throwing */
async function safeReadJson(response: Response): Promise<unknown> {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
}

/** Extract a human-readable message from a variety of error body shapes */
function extractErrorMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return 'Request failed.';
  const b = body as Record<string, unknown>;
  if (typeof b.message === 'string' && b.message.length > 0) return b.message;
  if (typeof b.error === 'string') return b.error;
  if (typeof b.error === 'object' && b.error !== null) {
    const e = b.error as Record<string, unknown>;
    if (typeof e.message === 'string') return e.message;
    if (typeof e.code === 'string') return e.code;
  }
  return 'Request failed.';
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

  // Always read body as QueuedResolutionResponse shape
  let data: QueuedResolutionResponse;
  try {
    data = await response.json() as QueuedResolutionResponse;
  } catch {
    // Malformed response: treat as a transient failure
    throw new ProxyError(
      'POLL_MALFORMED',
      `Poll returned invalid JSON (status ${response.status})`,
      response.status
    );
  }

  if (!response.ok) {
    throw new ProxyError(
      'POLL_ERROR',
      `Poll failed: ${response.status}`,
      response.status
    );
  }

  return data;
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

  const requestId = generateRequestId();

  const response = await fetch('/api/public/v1/resolve', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Client-Request-Id': requestId,
    },
    body: JSON.stringify({ input, requestId }),
    signal: controller.signal,
  });

  if (!response.ok) {
    const errorBody = await safeReadJson(response) as Record<string, unknown> | null;
    const serverCode = errorBody?.code ?? (errorBody?.error as Record<string, unknown>)?.code ?? null;
    if (response.status === 429) {
      throw new ProxyError('RATE_LIMITED', 'Too many requests', response.status);
    }
    if (response.status === 400 || response.status === 422) {
      throw new ProxyError(
        (serverCode as string) ?? 'VALIDATION_ERROR',
        extractErrorMessage(errorBody),
        response.status
      );
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

  // Use server-provided requestId if valid (>=8 chars), otherwise fall back to client-generated one.
  // This ensures the requestId is always available even when the server-side pipeline
  // doesn't return one (e.g. immediate cache hit).
  const resolvedRequestId =
    (apiResponse.requestId && apiResponse.requestId.length >= 8)
      ? apiResponse.requestId
      : (previousState?.requestId ?? null);

  // Error handling: the error status is driven by the warnings array, not a generic fallback.
  // Only construct an error when the status is 'error'; no_match is not an error state.
  const errorWarning = status === 'error'
    ? (apiResponse.warnings ?? []).find(w => w.severity === 'warning' || w.code.includes('UNAVAILABLE') || w.code.includes('ERROR'))
    : null;

  return {
    status,
    requestId: resolvedRequestId,
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
    error: errorWarning
      ? { code: errorWarning.code, message: errorWarning.message }
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
  },
  requestId: string
): ResolutionState {
  const data = (poll as unknown as { data?: PublicVoucherResolveResponse }).data;
  if (!data) {
    return buildStateFromPhase('failed', requestId, poll.durationMs ?? 0);
  }
  return buildResolutionState(data, { requestId });
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
    case 'rate_limited':
      return {
        status: 'rate_limited',
        requestId,
        bestMatch: null,
        candidates: [],
        performance: { totalLatencyMs: latencyMs, servedFromCache: false, resolvedAt: new Date().toISOString() },
        warnings: [],
        explanation: null,
        error: { code: 'RATE_LIMITED', message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' },
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
    case 'queued':
    case 'processing':
    case 'retrying':
      return {
        status: 'queued',
        requestId,
        bestMatch: null,
        candidates: [],
        performance: { totalLatencyMs: latencyMs, servedFromCache: false, resolvedAt: new Date().toISOString() },
        warnings: [],
        explanation: null,
        error: null,
      };
    case 'not_found':
      return {
        status: 'expired',
        requestId,
        bestMatch: null,
        candidates: [],
        performance: { totalLatencyMs: latencyMs, servedFromCache: false, resolvedAt: new Date().toISOString() },
        warnings: [],
        explanation: null,
        error: { code: 'REQUEST_NOT_FOUND', message: 'Yêu cầu đã hết hạn hoặc không tồn tại. Vui lòng gửi yêu cầu mới.' },
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
