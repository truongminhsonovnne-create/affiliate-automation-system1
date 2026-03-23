-- Migration: 005_create_resolve_requests
-- Purpose: Create resolve_requests table for /api/public/v1/resolve endpoint.
--
-- Architecture: persistent request state for POST+GET polling contract.
--
-- NOTE: Do NOT wrap with BEGIN/COMMIT.
-- pgBouncer (transaction mode) auto-manages transactions per query.
-- Adding explicit transaction control causes "current transaction is aborted".
--
-- This migration is idempotent — safe to re-run.

-- ── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS resolve_requests (
    request_id          TEXT        NOT NULL,
    platform            TEXT        NOT NULL,
    raw_url             TEXT        NOT NULL,
    normalized_url      TEXT        NOT NULL,

    status              TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN (
                                'pending', 'processing',
                                'succeeded', 'no_match', 'failed', 'expired',
                                'completed'
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

-- ── Primary key ───────────────────────────────────────────────────────────────

-- Use DO block to safely drop/recreate PK (handles IF NOT EXISTS edge case)
DO $$
BEGIN
    ALTER TABLE resolve_requests DROP CONSTRAINT IF EXISTS pk_resolve_requests;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PK drop skipped: %', SQLERRM;
END
$$;

ALTER TABLE resolve_requests
    ADD CONSTRAINT pk_resolve_requests
    PRIMARY KEY (request_id);

-- ── Indexes ────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_rr_status_pending
    ON resolve_requests (status, requested_at)
    WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_rr_expires
    ON resolve_requests (expires_at)
    WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_rr_platform_requested
    ON resolve_requests (platform, requested_at DESC)
    WHERE status NOT IN ('pending', 'processing');

-- ── Updated-at trigger ─────────────────────────────────────────────────────────

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
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ── Helper view ───────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW resolve_requests_ttl AS
SELECT request_id, status, expires_at
FROM resolve_requests
WHERE expires_at < NOW();
