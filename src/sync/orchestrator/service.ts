/**
 * Sync Orchestrator — Orchestration Service
 *
 * Coordinates multi-source sync runs:
 *  - Reads enabled sources from Supabase
 *  - Reads per-source checkpoints
 *  - Calls source sync functions
 *  - Writes checkpoint state after each source
 *  - Writes orchestrator run + items to Supabase
 *  - Failure isolation: one source failure ≠ total failure
 */

import { getSyncSupabase, logSync } from './types.js';
import { getCheckpoint, updateCheckpoint, getEnabledSources } from './checkpoint.js';
import { SOURCE_REGISTRY, getSource } from './registry.js';
import type { SyncMode, TriggeredBy, OrchestratorRun, SourceResult } from './types.js';

// ── DB helpers ───────────────────────────────────────────────────────────────

async function createOrchestratorRun(
  triggeredBy: TriggeredBy,
  jobName = 'daily_sync'
): Promise<string> {
  const sb = getSyncSupabase();
  const { data, error } = await sb
    .from('sync_orchestrator_runs')
    .insert({
      job_name: jobName,
      triggered_by: triggeredBy,
      status: 'running',
      started_at: new Date().toISOString(),
      total_sources: 0,
      successful_sources: 0,
      failed_sources: 0,
      summary_jsonb: {},
    } satisfies Record<string, unknown>)
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

async function completeOrchestratorRun(
  runId: string,
  status: 'completed' | 'failed',
  total: number,
  successful: number,
  failed: number,
  summary: Record<string, unknown>
): Promise<void> {
  const sb = getSyncSupabase();
  const { error } = await sb
    .from('sync_orchestrator_runs')
    .update({
      status,
      finished_at: new Date().toISOString(),
      total_sources: total,
      successful_sources: successful,
      failed_sources: failed,
      summary_jsonb: summary,
    })
    .eq('id', runId);

  if (error) throw error;
}

async function insertOrchestratorItem(
  runId: string,
  sourceKey: string,
  result: SourceResult
): Promise<void> {
  const sb = getSyncSupabase();
  const { error } = await sb
    .from('sync_orchestrator_items')
    .insert({
      orchestrator_run_id: runId,
      source: sourceKey,
      status: result.status,
      started_at: new Date(Date.now() - result.durationMs).toISOString(),
      finished_at: new Date().toISOString(),
      records_fetched: result.fetched,
      records_inserted: result.inserted,
      records_updated: result.updated,
      records_skipped: result.skipped,
      checkpoint_before_jsonb: result.checkpointBefore,
      checkpoint_after_jsonb: result.checkpointAfter,
      error_summary: result.errors.length > 0 ? result.errors.join('; ') : null,
    });

  if (error) throw error;
}

// ── Run single source ────────────────────────────────────────────────────────

async function runSourceSync(
  sourceKey: string,
  opts: {
    dryRun: boolean;
    mode: SyncMode;
    triggeredBy: TriggeredBy;
    runId: string;
    maxPages?: number;
  }
): Promise<SourceResult> {
  const { dryRun, mode, maxPages } = opts;
  const source = getSource(sourceKey);
  const start = Date.now();

  logSync(sourceKey, `Starting sync (mode=${mode}, dryRun=${dryRun})`);

  // Read checkpoint before sync
  const checkpoint = await getCheckpoint(sourceKey);
  const checkpointBefore = {
    lastPage: checkpoint.lastPage,
    lastCursor: checkpoint.lastCursor,
    lastExternalTimestamp: checkpoint.lastExternalTimestamp,
  };

  // Check if we should skip due to retry exhaustion
  if (checkpoint.retryCount >= source.maxRetries && !dryRun) {
    logSync(sourceKey, `Skipping — max retries reached (${checkpoint.retryCount}/${source.maxRetries})`);
    return {
      sourceKey,
      jobKey: 'orchestrated',
      status: 'skipped',
      fetched: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [`Max retries exhausted: ${checkpoint.retryCount}/${source.maxRetries}`],
      checkpointBefore,
      checkpointAfter: checkpointBefore,
      durationMs: 0,
    };
  }

  try {
    // Call source sync
    const syncResult = await source.sync({
      dryRun,
      mode,
      checkpoint: {
        lastPage: checkpoint.lastPage,
        lastCursor: checkpoint.lastCursor,
        lastExternalTimestamp: checkpoint.lastExternalTimestamp,
        pendingContinue: checkpoint.pendingContinue,
      },
      maxPages: maxPages ?? source.maxPagesPerRun,
    });

    const durationMs = Date.now() - start;
    const status = syncResult.errors.length > 0 && !dryRun ? 'failed' : 'completed';

    const result: SourceResult = {
      sourceKey,
      jobKey: 'orchestrated',
      status: dryRun ? 'completed' : status,
      fetched: syncResult.fetched,
      inserted: syncResult.inserted,
      updated: syncResult.updated,
      skipped: syncResult.skipped,
      errors: syncResult.errors,
      checkpointBefore,
      checkpointAfter: {
        lastPage: syncResult.checkpoint.lastPage,
        lastCursor: syncResult.checkpoint.lastCursor,
        lastExternalTimestamp: syncResult.checkpoint.lastExternalTimestamp,
        pendingContinue: syncResult.checkpoint.pendingContinue,
        lastError: syncResult.errors.length > 0 ? syncResult.errors[0] : null,
      },
      durationMs,
    };

    // Update checkpoint (except in dry-run)
    if (!dryRun) {
      await updateCheckpoint(sourceKey, {
        lastPage: syncResult.checkpoint.lastPage,
        lastCursor: syncResult.checkpoint.lastCursor,
        lastExternalTimestamp: syncResult.checkpoint.lastExternalTimestamp,
        pendingContinue: syncResult.checkpoint.pendingContinue,
        succeeded: result.status === 'completed',
        error: result.errors.length > 0 ? result.errors[0] : null,
      });
    }

    logSync(sourceKey, `Sync done: +${result.inserted} inserted, ~${result.updated} updated, ${result.skipped} skipped (${durationMs}ms)`);
    return result;

  } catch (err) {
    const durationMs = Date.now() - start;
    const errorMsg = err instanceof Error ? err.message : String(err);
    logSync(sourceKey, `Sync failed: ${errorMsg}`);

    if (!dryRun) {
      await updateCheckpoint(sourceKey, {
        pendingContinue: true,
        succeeded: false,
        error: errorMsg,
      });
    }

    return {
      sourceKey,
      jobKey: 'orchestrated',
      status: 'failed',
      fetched: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [errorMsg],
      checkpointBefore,
      checkpointAfter: checkpointBefore,
      durationMs,
    };
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface RunDailySyncOptions {
  /** Override default dryRun (defaults to false) */
  dryRun?: boolean;
  /** Override sources to run (default: all enabled) */
  sources?: string[];
  /** Override sync mode (default: per-source defaultMode) */
  mode?: SyncMode;
  /** Trigger source (default: 'local') */
  triggeredBy?: TriggeredBy;
  /** Max pages per source per run */
  maxPages?: number;
}

export interface DailySyncResult {
  runId: string;
  status: 'completed' | 'failed';
  totalSources: number;
  successfulSources: number;
  failedSources: number;
  skippedSources: number;
  sources: Record<string, SourceResult>;
  durationMs: number;
}

/**
 * Run the daily sync across all enabled sources.
 *
 * Each source runs sequentially. A failure in one source does NOT
 * stop other sources from running (failure isolation).
 *
 * Checkpoint state is saved after each source so partial runs
 * can be resumed.
 */
export async function runDailySync(options: RunDailySyncOptions = {}): Promise<DailySyncResult> {
  const {
    dryRun = false,
    sources: sourceFilter,
    mode: forcedMode,
    triggeredBy = 'local',
  } = options;

  const overallStart = Date.now();
  logSync('Orchestrator', `Starting daily sync (dryRun=${dryRun}, triggeredBy=${triggeredBy})`);

  // ── 1. Get enabled sources ──────────────────────────────────────
  const enabledSources = await getEnabledSources();
  const sourceKeys = sourceFilter ?? enabledSources.map((s) => s.source);

  if (sourceKeys.length === 0) {
    logSync('Orchestrator', 'No enabled sources found — nothing to sync');
    return {
      runId: 'no-run',
      status: 'completed',
      totalSources: 0,
      successfulSources: 0,
      failedSources: 0,
      skippedSources: 0,
      sources: {},
      durationMs: Date.now() - overallStart,
    };
  }

  // ── 2. Create orchestrator run record ──────────────────────────
  const runId = await createOrchestratorRun(triggeredBy);
  logSync('Orchestrator', `Created run ${runId} for sources: ${sourceKeys.join(', ')}`);

  // ── 3. Run each source sequentially ────────────────────────────
  const sourceResults: Record<string, SourceResult> = {};
  let successful = 0;
  let failed = 0;
  let skipped = 0;

  for (const sourceKey of sourceKeys) {
    const sourceEnabled = enabledSources.find((s) => s.source === sourceKey);
    if (!sourceEnabled) {
      logSync('Orchestrator', `Source '${sourceKey}' not found in registry — skipping`);
      skipped++;
      continue;
    }

    // Determine mode: forced > checkpoint.pending > source default
    const checkpoint = await getCheckpoint(sourceKey);
    const mode = forcedMode ?? (checkpoint.pendingContinue ? 'incremental' : sourceEnabled.is_enabled ? 'incremental' : 'full');

    const result = await runSourceSync(sourceKey, {
      dryRun,
      mode,
      triggeredBy,
      runId,
      maxPages: options.maxPages,
    });

    sourceResults[sourceKey] = result;
    await insertOrchestratorItem(runId, sourceKey, result);

    if (result.status === 'completed') successful++;
    else if (result.status === 'skipped') skipped++;
    else failed++;
  }

  // ── 4. Finalize orchestrator run ───────────────────────────────
  const durationMs = Date.now() - overallStart;
  const overallStatus = failed === sourceKeys.length ? 'failed' : 'completed';

  await completeOrchestratorRun(
    runId,
    overallStatus,
    sourceKeys.length,
    successful,
    failed,
    sourceResults as Record<string, unknown>
  );

  logSync('Orchestrator', `Daily sync complete: ${successful} ok, ${failed} failed, ${skipped} skipped (${durationMs}ms)`);

  return {
    runId,
    status: overallStatus,
    totalSources: sourceKeys.length,
    successfulSources: successful,
    failedSources: failed,
    skippedSources: skipped,
    sources: sourceResults,
    durationMs,
  };
}

/**
 * Run sync for a single source. Useful for manual debugging.
 */
export async function runSingleSourceSync(
  sourceKey: string,
  opts: {
    dryRun?: boolean;
    mode?: SyncMode;
    triggeredBy?: TriggeredBy;
    maxPages?: number;
  } = {}
): Promise<SourceResult> {
  const { dryRun = false, mode = 'incremental', triggeredBy = 'manual' } = opts;

  logSync('Orchestrator', `Single-source sync: ${sourceKey} (mode=${mode}, dryRun=${dryRun})`);

  const result = await runSourceSync(sourceKey, {
    dryRun,
    mode,
    triggeredBy,
    runId: 'manual',
    maxPages: opts.maxPages,
  });

  return result;
}

/**
 * Get the latest orchestrator run summary.
 */
export async function getLastOrchestratorRun(): Promise<{
  id: string;
  status: string;
  startedAt: string;
  totalSources: number;
  successfulSources: number;
  failedSources: number;
  durationMs: number | null;
} | null> {
  const sb = getSyncSupabase();

  const { data, error } = await sb
    .from('sync_orchestrator_runs')
    .select('id, status, started_at, total_sources, successful_sources, failed_sources, finished_at')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  const d = data as Record<string, unknown>;
  const started = d.started_at as string;
  const finished = d.finished_at as string | null;

  return {
    id: d.id as string,
    status: d.status as string,
    startedAt: started,
    totalSources: d.total_sources as number,
    successfulSources: d.successful_sources as number,
    failedSources: d.failed_sources as number,
    durationMs: finished ? new Date(finished).getTime() - new Date(started).getTime() : null,
  };
}

/**
 * Get source state from sync_source_state table.
 */
export async function getSourceStates(): Promise<Array<{
  source: string;
  isEnabled: boolean;
  lastSyncedAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  pendingContinue: boolean;
  retryCount: number;
}>> {
  const { getAllSources } = await import('./checkpoint.js');
  const rows = await getAllSources();
  return rows.map((r) => ({
    source: r.source,
    isEnabled: r.is_enabled,
    lastSyncedAt: r.last_synced_at,
    lastStatus: r.last_status,
    lastError: r.last_error,
    pendingContinue: r.pending_continue,
    retryCount: r.retry_count,
  }));
}
