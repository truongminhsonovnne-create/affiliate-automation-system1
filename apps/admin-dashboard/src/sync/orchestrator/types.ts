/**
 * Sync Orchestrator — Core Types
 *
 * Defines the source abstraction and orchestrator interfaces.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ── Checkpoint ──────────────────────────────────────────────────────────────

export interface SyncCheckpoint {
  lastPage: number;
  lastCursor: string | null;
  lastExternalTimestamp: string | null;
  pendingContinue: boolean;
  retryCount: number;
  meta: Record<string, unknown>;
}

export interface CheckpointBefore {
  lastPage: number;
  lastCursor: string | null;
  lastExternalTimestamp: string | null;
}

export interface CheckpointAfter {
  lastPage: number;
  lastCursor: string | null;
  lastExternalTimestamp: string | null;
  pendingContinue: boolean;
  lastError: string | null;
}

// ── Source Registry ─────────────────────────────────────────────────────────

export type SyncMode = 'incremental' | 'full';
export type TriggeredBy = 'github_actions' | 'manual' | 'local';

export interface SourceConfig {
  key: string;
  name: string;
  enabled: boolean;
  defaultMode: SyncMode;
  maxPagesPerRun: number;
  maxRetries: number;
  retryCooldownSeconds: number;
}

// ── Per-source result ────────────────────────────────────────────────────────

export interface SourceResult {
  sourceKey: string;
  jobKey: string;
  status: 'completed' | 'failed' | 'skipped';
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  checkpointBefore: CheckpointBefore;
  checkpointAfter: CheckpointAfter;
  durationMs: number;
}

// ── Orchestrator run ───────────────────────────────────────────────────────

export interface OrchestratorRun {
  id: string;
  jobName: string;
  triggeredBy: TriggeredBy;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  finishedAt: string | null;
  totalSources: number;
  successfulSources: number;
  failedSources: number;
  summary: Record<string, SourceResult>;
}

// ── Supabase client factory ──────────────────────────────────────────────────

let _sb: SupabaseClient | null = null;

export function getSyncSupabase(): SupabaseClient {
  if (_sb) return _sb;

  const { createClient } = require('@supabase/supabase-js');

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  _sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as SupabaseClient;

  return _sb;
}

// ── Safe logging ─────────────────────────────────────────────────────────────

export function logSync(label: string, msg: string, meta?: Record<string, unknown>): void {
  const safe: Record<string, unknown> = {};
  if (meta) {
    for (const [k, v] of Object.entries(meta)) {
      const lo = k.toLowerCase();
      safe[k] =
        lo.includes('token') || lo.includes('key') || lo.includes('auth') ||
        lo.includes('secret') || lo.includes('password') || lo.includes('code')
          ? '[REDACTED]'
          : v;
    }
  }
  console.info(`[Sync][${label}] ${msg}`, safe);
}
