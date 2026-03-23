-- Migration: 006_add_completed_status
-- Purpose: Add 'completed' to resolve_requests.status CHECK constraint.
--
-- Root cause:
--   DB CHECK constraint only allowed:
--     pending, processing, succeeded, no_match, failed, expired
--   Missing: 'completed' — used by polling frontend contracts and
--   mapDbStatus() for upstream 'completed' responses from voucher engine.
--
-- Symptom: INSERT with status='completed' violates the constraint,
-- causing PERSISTENCE_REQUIRED_FAILED → 503 on POST /api/public/v1/resolve.
--
-- Fix: Drop and re-add CHECK constraint with 'completed' included.
--
-- NOTE: Do NOT wrap with BEGIN/COMMIT.
-- pgBouncer (transaction mode) auto-manages transactions per query.

-- Drop the old constraint (ignore error if already missing)
DO $$
BEGIN
    ALTER TABLE resolve_requests
        DROP CONSTRAINT resolve_requests_status_check;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Constraint already absent or dropped: %', SQLERRM;
END
$$;

-- Re-add with 'completed' included
ALTER TABLE resolve_requests
    ADD CONSTRAINT resolve_requests_status_check
    CHECK (status IN (
      'pending',
      'processing',
      'succeeded',
      'no_match',
      'failed',
      'expired',
      'completed'
    ));
