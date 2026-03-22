// =============================================================================
// Resolve Pipeline Logger
// Structured per-phase logging for the voucher resolution pipeline
// =============================================================================

import { logger } from '../../utils/logger.js';

export type PipelinePhase =
  | 'validate_input'
  | 'normalize_input'
  | 'check_rate_limit'
  | 'cache_lookup'
  | 'source_health_check'
  | 'resolve_primary'
  | 'resolve_supabase_fallback'
  | 'rank_candidates'
  | 'build_explanation'
  | 'cache_set'
  | 'serialize_response'
  | 'error_recovery';

export interface PhaseLogContext {
  requestId: string;
  input?: string;
  normalizedInput?: string;
  cacheKey?: string;
  source?: string;
  candidateCount?: number;
  bestMatchId?: string;
  errorCode?: string;
  errorMessage?: string;
  cause?: string;
}

interface PhaseEntry {
  phase: PipelinePhase;
  startedAt: number;
  durationMs?: number;
  success: boolean;
  error?: string;
}

// In-memory pipeline trace buffer (last 1000 entries per request)
const traces = new Map<string, PhaseEntry[]>();

const MAX_TRACES_PER_REQUEST = 50;

/**
 * Begin a pipeline phase — returns a token to call endPhase() with.
 */
export function beginPhase(
  requestId: string,
  phase: PipelinePhase,
  ctx: PhaseLogContext
): () => void {
  const start = Date.now();

  logger.debug({
    requestId,
    phase,
    input: ctx.input ? '[REDACTED]' : undefined,
    normalizedInput: ctx.normalizedInput ? '[REDACTED]' : undefined,
    cacheKey: ctx.cacheKey ? '[REDACTED]' : undefined,
    ts: new Date().toISOString(),
  }, `Pipeline phase START: ${phase}`);

  return function endPhase(success: boolean = true, errorMessage?: string): void {
    const durationMs = Date.now() - start;

    // Record in trace buffer
    const entry: PhaseEntry = {
      phase,
      startedAt: start,
      durationMs,
      success,
      error: errorMessage,
    };

    if (!traces.has(requestId)) {
      traces.set(requestId, []);
    }
    const reqTraces = traces.get(requestId)!;
    if (reqTraces.length < MAX_TRACES_PER_REQUEST) {
      reqTraces.push(entry);
    }

    const logData = {
      requestId,
      phase,
      durationMs,
      success,
      error: errorMessage,
      ts: new Date().toISOString(),
    };

    if (success) {
      logger.debug(logData, `Pipeline phase END: ${phase} (${durationMs}ms)`);
    } else {
      logger.warn(logData, `Pipeline phase ERROR: ${phase} (${durationMs}ms) — ${errorMessage}`);
    }
  };
}

/**
 * Log the completion of a full pipeline run.
 */
export function logPipelineCompletion(
  requestId: string,
  ctx: {
    status: string;
    totalLatencyMs: number;
    servedFromCache: boolean;
    cacheHit: boolean;
    candidateCount: number;
    bestMatchId?: string;
    phases: PhaseLogContext[];
    warnings: string[];
    sourceHealthStates: Record<string, string>;
  }
): void {
  const { phases, ...rest } = ctx;

  const totalByPhase = phases.reduce((sum, p) => sum + (p.durationMs ?? 0), 0);
  const nonCacheMs = Math.max(0, ctx.totalLatencyMs - (ctx.servedFromCache ? 0 : 0));

  const entry = {
    requestId,
    status: ctx.status,
    totalLatencyMs: ctx.totalLatencyMs,
    servedFromCache: ctx.servedFromCache,
    candidateCount: ctx.candidateCount,
    bestMatchId: ctx.bestMatchId ?? null,
    warnings: ctx.warnings,
    sourceHealthStates: ctx.sourceHealthStates,
    phases: phases.map((p) => ({
      phase: p.phase,
      durationMs: p.durationMs,
      error: p.error ?? null,
    })),
    pipelineOverheadMs: Math.max(0, ctx.totalLatencyMs - totalByPhase),
    ts: new Date().toISOString(),
  };

  if (ctx.status === 'success' || ctx.status === 'no_match') {
    logger.info(entry, 'Pipeline completed');
  } else {
    logger.warn(entry, `Pipeline completed with status: ${ctx.status}`);
  }
}

/**
 * Log an error that escaped the pipeline.
 */
export function logPipelineError(
  requestId: string,
  error: unknown,
  phase: PipelinePhase,
  ctx: PhaseLogContext
): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  logger.error({
    requestId,
    phase,
    errorCode: ctx.errorCode,
    errorMessage: message,
    stack,
    input: ctx.input ? '[REDACTED]' : undefined,
    normalizedInput: ctx.normalizedInput ? '[REDACTED]' : undefined,
    ts: new Date().toISOString(),
  }, `Pipeline unhandled error at phase: ${phase}`);
}

/**
 * Get the current trace for a request (for debug endpoint).
 */
export function getPipelineTrace(requestId: string): PhaseEntry[] {
  return traces.get(requestId) ?? [];
}

/**
 * Prune traces older than cutoffMs to prevent unbounded memory growth.
 */
export function pruneTraces(cutoffMs: number = 300_000): number {
  const now = Date.now();
  let pruned = 0;
  for (const [requestId, entries] of traces.entries()) {
    const latest = entries[entries.length - 1];
    if (latest && now - latest.startedAt > cutoffMs) {
      traces.delete(requestId);
      pruned++;
    }
  }
  return pruned;
}
