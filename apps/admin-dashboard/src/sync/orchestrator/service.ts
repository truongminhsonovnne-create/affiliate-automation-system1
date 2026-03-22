/**
 * Sync Orchestrator — Orchestration Service
 *
 * Self-contained version for admin-dashboard Next.js deployment.
 * Uses local checkpoint + registry modules within the same package.
 */

import { getSyncSupabase, logSync } from './types.js';
import {
  getCheckpoint,
  updateCheckpoint,
  getEnabledSources,
} from './checkpoint.js';
import {
  getSourceAdapter,
  getRegisteredKeys,
} from './registry.js';
import type { SyncMode, TriggeredBy, SourceResult } from './types.js';

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
    } as Record<string, unknown>)
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
  const adapter = await getSourceAdapter(sourceKey);
  const start = Date.now();

  logSync(sourceKey, `Starting sync (mode=${mode}, dryRun=${dryRun})`);

  // Read checkpoint before sync
  const checkpoint = await getCheckpoint(sourceKey);
  const checkpointBefore = {
    lastPage: checkpoint.lastPage,
    lastCursor: checkpoint.lastCursor,
    lastExternalTimestamp: checkpoint.lastExternalTimestamp,
  };

  // Skip if retry exhausted
  if (checkpoint.retryCount >= adapter.maxRetries && !dryRun) {
    logSync(sourceKey, `Skipping — max retries reached (${checkpoint.retryCount}/${adapter.maxRetries})`);
    return {
      sourceKey,
      jobKey: 'orchestrated',
      status: 'skipped',
      fetched: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [`Max retries exhausted: ${checkpoint.retryCount}/${adapter.maxRetries}`],
      checkpointBefore,
      checkpointAfter: { ...checkpointBefore, pendingContinue: checkpoint.pendingContinue, lastError: `Max retries exhausted: ${checkpoint.retryCount}/${adapter.maxRetries}` },
      durationMs: 0,
    };
  }

  try {
    const syncResult = await adapter.sync({
      dryRun,
      mode,
      checkpoint: {
        lastPage: checkpoint.lastPage,
        lastCursor: checkpoint.lastCursor,
        lastExternalTimestamp: checkpoint.lastExternalTimestamp,
        pendingContinue: checkpoint.pendingContinue,
      },
      maxPages: maxPages ?? adapter.maxPagesPerRun,
    });

    const durationMs = Date.now() - start;
    const ok = syncResult.errors.length === 0 || dryRun;
    const status = ok ? 'completed' : 'failed';

    const result: SourceResult = {
      sourceKey,
      jobKey: 'orchestrated',
      status,
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

    // Update checkpoint (not in dry-run)
    if (!dryRun) {
      await updateCheckpoint(sourceKey, {
        lastPage: syncResult.checkpoint.lastPage,
        lastCursor: syncResult.checkpoint.lastCursor,
        lastExternalTimestamp: syncResult.checkpoint.lastExternalTimestamp,
        pendingContinue: syncResult.checkpoint.pendingContinue,
        succeeded: ok,
        error: ok ? null : syncResult.errors[0],
      });
    }

    logSync(sourceKey, `Done: +${result.inserted} inserted, ~${result.updated} updated (${durationMs}ms)`);
    return result;

  } catch (err) {
    const durationMs = Date.now() - start;
    const errorMsg = err instanceof Error ? err.message : String(err);
    logSync(sourceKey, `Failed: ${errorMsg}`);

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
      checkpointAfter: { ...checkpointBefore, pendingContinue: true, lastError: errorMsg },
      durationMs,
    };
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface RunDailySyncOptions {
  dryRun?: boolean;
  sources?: string[];
  mode?: SyncMode;
  triggeredBy?: TriggeredBy;
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
 * Run daily sync across all enabled sources.
 * Failure isolation: one source failure does NOT stop other sources.
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

  // Get enabled sources from DB
  const enabledSources = await getEnabledSources();
  const sourceKeys = sourceFilter ?? enabledSources.map((s) => s.source);

  if (sourceKeys.length === 0) {
    logSync('Orchestrator', 'No enabled sources found');
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

  const runId = await createOrchestratorRun(triggeredBy);
  logSync('Orchestrator', `Run ${runId}: sources = ${sourceKeys.join(', ')}`);

  const sourceResults: Record<string, SourceResult> = {};
  let successful = 0;
  let failed = 0;
  let skipped = 0;

  for (const sourceKey of sourceKeys) {
    const dbSource = enabledSources.find((s) => s.source === sourceKey);
    if (!dbSource) {
      logSync('Orchestrator', `Source '${sourceKey}' not in DB — skipping`);
      skipped++;
      continue;
    }

    const checkpoint = await getCheckpoint(sourceKey);
    const mode = forcedMode ?? (checkpoint.pendingContinue ? 'incremental' : 'incremental');

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

  logSync('Orchestrator', `Done: ${successful} ok, ${failed} failed, ${skipped} skipped (${durationMs}ms)`);

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
 * Run sync for a single source (manual/debugging).
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

  logSync('Orchestrator', `Single-source: ${sourceKey} (mode=${mode}, dryRun=${dryRun})`);

  return runSourceSync(sourceKey, {
    dryRun,
    mode,
    triggeredBy,
    runId: 'manual',
    maxPages: opts.maxPages,
  });
}

/**
 * Get all source states.
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
  const rows = await getEnabledSources();
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
