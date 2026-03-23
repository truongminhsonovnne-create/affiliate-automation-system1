-- Migration: 026_create_resolve_requests
-- Purpose: Dedicated request-state table for the public /api/public/v1/resolve endpoint.
--          Isolated from the voucher engine's voucher_resolution_requests to avoid
--          schema conflicts when both systems write to the same table.
--
-- Why a separate table?
--   - voucher_resolution_requests is owned by the voucher engine (Railway/Node.js)
--     and may use a different schema (resolution_status UUID, etc.)
--   - The Next.js public API route runs on Vercel (serverless) and needs its own
--     durable, persistent request state for the GET polling contract.
--   - Keeping them separate means neither side can break the other's inserts.
--
-- Schema design goals:
--   - id (TEXT): client-generated UUID from X-Client-Request-Id header.
--     Using TEXT to avoid UUID cast issues — the client generates hex strings.
--   - No foreign keys — this table is intentionally decoupled from the engine.
--   - expires_at: 5 minutes for pending/processing, 1 hour for completed.
--     Set explicitly so row cleanup is deterministic and fast.
--
-- TTL strategy (enforced by application + optional Supabase cron):
--   - pending/processing : 5 minutes   (expires_at = NOW() + 5min)
--   - succeeded/no_match : 60 minutes (expires_at = NOW() + 60min)
--   - failed             : 60 minutes
--
-- IMPORTANT: This table must exist before deploying the route.ts changes.
-- Run this migration in Supabase BEFORE deploying the new code.

BEGIN;

-- ── Drop the conflicting IF NOT EXISTS from 024 ───────────────────────────────
-- Migration 024 used CREATE TABLE IF NOT EXISTS voucher_resolution_requests
-- with a different schema (status TEXT, id TEXT).  If the engine schema ran
-- first (resolution_status UUID, id UUID), that table survives and the 024
-- version is never created.  We sidestep this entirely with a new dedicated table.

CREATE TABLE IF NOT EXISTS resolve_requests (
    -- Request identity (TEXT — client-generated UUID hex, not PostgreSQL UUID)
    request_id     TEXT        NOT NULL,

    -- Request inputs
    platform       TEXT        NOT NULL,
    raw_url        TEXT        NOT NULL,
    normalized_url TEXT        NOT NULL,

    -- Lifecycle status — canonical statuses for the polling contract
    status         TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN (
                       'pending', 'processing',
                       'succeeded', 'no_match', 'failed', 'expired'
                     )),

    -- Result summary (lightweight — no heavy JSON blobs here)
    has_match       BOOLEAN,
    best_voucher_id TEXT,
    best_voucher_code TEXT,
    error_message   TEXT,

    -- Timing (all real timestamps from the server, not client)
    requested_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    resolved_at   TIMESTAMPTZ,
    duration_ms   INTEGER,

    -- TTL: when this request row should be considered stale.
    -- Set explicitly at insert time so reads are fast (indexed expires_at).
    expires_at     TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),

    -- Audit
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Primary key: the request_id is the lookup key ────────────────────────────
ALTER TABLE resolve_requests
    ADD CONSTRAINT pk_resolve_requests PRIMARY KEY (request_id);

-- ── Index: find stale pending/processing rows (TTL cleanup worker) ────────────
CREATE INDEX IF NOT EXISTS idx_rr_status_pending
    ON resolve_requests (status, requested_at)
    WHERE status IN ('pending', 'processing');

-- ── Index: TTL-based cleanup ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rr_expires
    ON resolve_requests (expires_at)
    WHERE status IN ('pending', 'processing');

-- ── Index: analytics / dashboard ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rr_platform_requested
    ON resolve_requests (platform, requested_at DESC)
    WHERE status NOT IN ('pending', 'processing');

-- ── Updated-at trigger ───────────────────────────────────────────────────────
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

-- ── TTL cleanup view (for Supabase pg_cron or external scheduler) ─────────────
-- SELECT * FROM resolve_requests WHERE status IN ('pending','processing')
--   AND expires_at < NOW() - INTERVAL '5 minutes';
-- DELETE FROM resolve_requests WHERE expires_at < NOW() - INTERVAL '5 minutes';

COMMIT;
