-- Migration: 027_create_resolve_requests_rls
-- Purpose: Add RLS policies for resolve_requests table.
--          Required for Supabase auth to work correctly with service_role.
--
-- Background:
--   Migration 026 created the resolve_requests table but was never applied
--   to production (runAllMigrations.ts only runs files 001-003).
--   This migration completes the schema including RLS policies.
--
-- IMPORTANT: This table is also missing in production.
--   Either:
--   (A) Run migration 026 first (full DDL), then 027 for RLS, OR
--   (B) Run this file alone — it includes the full DDL + RLS in one script
--       so it is self-contained and safe to re-run.

BEGIN;

-- ── Full DDL (idempotent — matches migration 026) ─────────────────────────────

CREATE TABLE IF NOT EXISTS resolve_requests (
    request_id          TEXT        NOT NULL,
    platform            TEXT        NOT NULL,
    raw_url             TEXT        NOT NULL,
    normalized_url      TEXT        NOT NULL,

    status              TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN (
                                'pending', 'processing',
                                'succeeded', 'no_match', 'failed', 'expired'
                              )),

    has_match           BOOLEAN,
    best_voucher_id     TEXT,
    best_voucher_code   TEXT,
    error_message       TEXT,

    requested_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at         TIMESTAMPTZ,
    duration_ms         INTEGER,
    expires_at          TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary key
ALTER TABLE resolve_requests
    DROP CONSTRAINT IF EXISTS pk_resolve_requests;
ALTER TABLE resolve_requests
    ADD CONSTRAINT pk_resolve_requests
    PRIMARY KEY (request_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rr_status_pending
    ON resolve_requests (status, requested_at)
    WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_rr_expires
    ON resolve_requests (expires_at)
    WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_rr_platform_requested
    ON resolve_requests (platform, requested_at DESC)
    WHERE status NOT IN ('pending', 'processing');

-- Updated-at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resolve_requests_updated_at ON resolve_requests;
CREATE TRIGGER trg_resolve_requests_updated_at
    BEFORE UPDATE ON resolve_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE resolve_requests ENABLE ROW LEVEL SECURITY;

-- Service role: full CRUD (used by all Next.js API routes)
CREATE POLICY "service_role_full_access_resolve_requests"
    ON resolve_requests
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ── Retention helper view ───────────────────────────────────────────────────

CREATE OR REPLACE VIEW resolve_requests_ttl AS
SELECT request_id, status, expires_at
FROM resolve_requests
WHERE expires_at < NOW();

-- ── TTL cleanup (optional — run via Supabase pg_cron or external scheduler) ───
--
--  DELETE FROM resolve_requests
--  WHERE expires_at < NOW() - INTERVAL '1 hour';
--
--  VACUUM ANALYZE resolve_requests;

COMMIT;
