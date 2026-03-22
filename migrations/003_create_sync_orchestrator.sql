-- ============================================================
-- Migration: 003_create_sync_orchestrator
-- Description: Multi-source sync orchestration schema
-- Features: orchestrator runs, per-source items, checkpoint state
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. sync_orchestrator_runs
--    Top-level run covering one or more sources.
--    Created by: 'github_actions' | 'manual' | 'local' | 'vercel_cron'
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sync_orchestrator_runs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name             TEXT NOT NULL DEFAULT 'daily_sync',
  triggered_by         TEXT NOT NULL,           -- 'github_actions' | 'manual' | 'local'
  status               TEXT NOT NULL DEFAULT 'running',  -- 'running' | 'completed' | 'failed' | 'cancelled'
  started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at          TIMESTAMPTZ,
  total_sources       INTEGER NOT NULL DEFAULT 0,
  successful_sources   INTEGER NOT NULL DEFAULT 0,
  failed_sources       INTEGER NOT NULL DEFAULT 0,
  summary_jsonb        JSONB NOT NULL DEFAULT '{}',  -- { masoffer: {...}, accesstrade: {...} }
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 2. sync_orchestrator_items
--    Per-source result within an orchestrator run.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sync_orchestrator_items (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orchestrator_run_id    UUID NOT NULL REFERENCES public.sync_orchestrator_runs(id) ON DELETE CASCADE,
  source                 TEXT NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'running',  -- 'running' | 'completed' | 'failed' | 'skipped'
  started_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at            TIMESTAMPTZ,
  records_fetched        INTEGER NOT NULL DEFAULT 0,
  records_inserted       INTEGER NOT NULL DEFAULT 0,
  records_updated        INTEGER NOT NULL DEFAULT 0,
  records_skipped        INTEGER NOT NULL DEFAULT 0,
  checkpoint_before_jsonb JSONB,   -- { lastPage, lastCursor, lastSyncedAt } before this run
  checkpoint_after_jsonb  JSONB,   -- { lastPage, lastCursor, lastSyncedAt } after this run
  error_summary          TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 3. sync_source_state
--    Per-source checkpoint state. Drives incremental sync.
--    One row per source key.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sync_source_state (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source                 TEXT NOT NULL UNIQUE,
  is_enabled             BOOLEAN NOT NULL DEFAULT true,
  -- Timing
  last_synced_at         TIMESTAMPTZ,
  last_success_at        TIMESTAMPTZ,
  last_failure_at        TIMESTAMPTZ,
  -- Page/cursor checkpoint
  last_page              INTEGER NOT NULL DEFAULT 0,
  last_cursor            TEXT,
  last_external_timestamp TIMESTAMPTZ,
  -- Continuation
  pending_continue        BOOLEAN NOT NULL DEFAULT false,
  -- Retry
  retry_count             INTEGER NOT NULL DEFAULT 0,
  max_retries            INTEGER NOT NULL DEFAULT 3,
  -- Status
  last_status             TEXT,  -- 'completed' | 'failed' | null
  last_error              TEXT,
  -- Metadata
  meta_jsonb              JSONB NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_orchestrator_runs_status
  ON public.sync_orchestrator_runs(status);

CREATE INDEX IF NOT EXISTS idx_orchestrator_runs_started_at
  ON public.sync_orchestrator_runs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_orchestrator_runs_triggered_by
  ON public.sync_orchestrator_runs(triggered_by);

CREATE INDEX IF NOT EXISTS idx_orchestrator_items_run_id
  ON public.sync_orchestrator_items(orchestrator_run_id);

CREATE INDEX IF NOT EXISTS idx_orchestrator_items_source
  ON public.sync_orchestrator_items(source);

CREATE INDEX IF NOT EXISTS idx_sync_source_state_enabled
  ON public.sync_source_state(is_enabled)
  WHERE is_enabled = true;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.sync_orchestrator_runs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_orchestrator_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_source_state       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_orchestrator_runs"
  ON public.sync_orchestrator_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access_orchestrator_items"
  ON public.sync_orchestrator_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access_sync_source_state"
  ON public.sync_source_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- Seed: initial source states
-- ============================================================

INSERT INTO public.sync_source_state (source, is_enabled, last_page, pending_continue, retry_count, meta_jsonb)
VALUES
  ('masoffer',    true,  0, false, 0, '{}'),
  ('accesstrade', true,  0, false, 0, '{}'),
  ('shopee',      false, 0, false, 0, '{}'),
  ('ecomobi',     false, 0, false, 0, '{}')
ON CONFLICT (source) DO NOTHING;
