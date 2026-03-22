-- ============================================================
-- Migration: 002_create_offer_tables
-- Description: Core offer ingestion schema for multi-source voucher/deal pipeline
-- Sources: AccessTrade, MasOffer, Shopee, Ecomobi, Manual
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. offer_sources  — registry of data sources
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.offer_sources (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key          TEXT NOT NULL UNIQUE,  -- e.g. 'accesstrade', 'shopee'
  name         TEXT NOT NULL,         -- e.g. 'AccessTrade Publisher Network'
  is_enabled   BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 2. offers  — canonical normalised offer record
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.offers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source identification
  source                TEXT NOT NULL,    -- 'accesstrade' | 'shopee' | 'ecomobi' | 'manual'
  source_type           TEXT NOT NULL,    -- 'campaign' | 'voucher' | 'coupon' | 'deal' | 'promotion'
  external_id           TEXT NOT NULL,    -- ID in the source system

  -- Content
  title                 TEXT NOT NULL,
  slug                  TEXT,
  description           TEXT,

  -- Merchant
  merchant_name         TEXT NOT NULL,
  merchant_id           TEXT,             -- ID in the source system (may differ from external_id)
  category              TEXT,             -- e.g. 'shopee', 'lazada' — platform inference

  -- URLs
  destination_url       TEXT,
  tracking_url          TEXT,

  -- Coupon / discount
  coupon_code           TEXT,
  discount_type         TEXT,             -- 'percent' | 'fixed' | 'free_shipping' | 'cashback'
  discount_value        NUMERIC(12, 2),
  max_discount          NUMERIC(12, 2),
  min_order_value       NUMERIC(12, 2),

  -- Pricing / currency
  currency              TEXT NOT NULL DEFAULT 'VND',

  -- Validity
  start_at              TIMESTAMPTZ,
  end_at                TIMESTAMPTZ,
  status                TEXT NOT NULL DEFAULT 'pending',  -- 'active' | 'inactive' | 'expired' | 'pending'

  -- Terms / extras
  terms                 TEXT,
  image_url             TEXT,

  -- Scoring / quality
  confidence_score      NUMERIC(3, 2) NOT NULL DEFAULT 0.30,  -- 0.00 – 1.00

  -- Observability timestamps
  last_seen_at         TIMESTAMPTZ NOT NULL,   -- when we last saw this in the API
  first_seen_at        TIMESTAMPTZ NOT NULL,   -- when we first ingested it
  synced_at            TIMESTAMPTZ NOT NULL,    -- when this specific record was written

  -- Raw data (always kept for debugging / reprocessing)
  raw_payload_jsonb    JSONB NOT NULL DEFAULT '{}',

  -- Dedupe
  normalized_hash       TEXT NOT NULL,   -- SHA-256 of key fields

  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_source_external_id UNIQUE (source, external_id)
);

-- ─────────────────────────────────────────────────────────────
-- 3. offer_snapshots  — payload change history
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.offer_snapshots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id          UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  raw_payload_jsonb JSONB NOT NULL DEFAULT '{}',
  captured_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checksum          TEXT NOT NULL          -- SHA-256 of the payload at capture time
);

-- ─────────────────────────────────────────────────────────────
-- 4. sync_runs  — sync job execution log
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sync_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source           TEXT NOT NULL,
  job_name         TEXT NOT NULL,   -- e.g. 'sync_deals', 'sync_campaigns'
  status           TEXT NOT NULL,   -- 'running' | 'completed' | 'failed' | 'cancelled'
  started_at       TIMESTAMPTZ NOT NULL,
  finished_at      TIMESTAMPTZ,
  records_fetched  INTEGER NOT NULL DEFAULT 0,
  records_inserted INTEGER NOT NULL DEFAULT 0,
  records_updated  INTEGER NOT NULL DEFAULT 0,
  records_skipped  INTEGER NOT NULL DEFAULT 0,
  error_summary    TEXT
);

-- ─────────────────────────────────────────────────────────────
-- 5. sync_errors  — per-record error log
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sync_errors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_run_id     UUID REFERENCES public.sync_runs(id) ON DELETE SET NULL,
  source          TEXT NOT NULL,
  external_id     TEXT,
  stage           TEXT NOT NULL,    -- 'fetch' | 'normalize' | 'dedupe' | 'upsert' | 'snapshot'
  error_message   TEXT NOT NULL,
  raw_context     JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================

-- Core dedupe / lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_offers_source_external_id
  ON public.offers(source, external_id);

-- Query filters
CREATE INDEX IF NOT EXISTS idx_offers_status
  ON public.offers(status);

CREATE INDEX IF NOT EXISTS idx_offers_end_at
  ON public.offers(end_at);

CREATE INDEX IF NOT EXISTS idx_offers_merchant_name
  ON public.offers(merchant_name);

CREATE INDEX IF NOT EXISTS idx_offers_source_type
  ON public.offers(source_type);

CREATE INDEX IF NOT EXISTS idx_offers_source
  ON public.offers(source);

CREATE INDEX IF NOT EXISTS idx_offers_confidence_score
  ON public.offers(confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_offers_coupon_code
  ON public.offers(coupon_code) WHERE coupon_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_offers_synced_at
  ON public.offers(synced_at DESC);

-- Snapshot FK
CREATE INDEX IF NOT EXISTS idx_offer_snapshots_offer_id
  ON public.offer_snapshots(offer_id);

-- Sync run queries
CREATE INDEX IF NOT EXISTS idx_sync_runs_source
  ON public.sync_runs(source);

CREATE INDEX IF NOT EXISTS idx_sync_runs_started_at
  ON public.sync_runs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_errors_sync_run_id
  ON public.sync_errors(sync_run_id);

CREATE INDEX IF NOT EXISTS idx_sync_errors_created_at
  ON public.sync_errors(created_at DESC);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.offer_sources  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_runs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_errors   ENABLE ROW LEVEL SECURITY;

-- Service role: full access for all tables
CREATE POLICY "service_role_full_access_offer_sources"    ON public.offer_sources    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access_offers"           ON public.offers           FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access_offer_snapshots" ON public.offer_snapshots  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access_sync_runs"       ON public.sync_runs         FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access_sync_errors"     ON public.sync_errors       FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- Seed: offer_sources
-- ============================================================

INSERT INTO public.offer_sources (key, name, is_enabled, created_at, updated_at)
VALUES
  ('accesstrade', 'AccessTrade Publisher Network', true,  NOW(), NOW()),
  ('masoffer',    'MasOffer Publisher Network',     true,  NOW(), NOW()),
  ('shopee',      'Shopee Affiliate',               false, NOW(), NOW()),
  ('ecomobi',     'Ecomobi',                        false, NOW(), NOW()),
  ('manual',      'Manual Entry',                   true,  NOW(), NOW())
ON CONFLICT (key) DO NOTHING;
