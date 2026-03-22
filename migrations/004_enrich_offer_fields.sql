-- ============================================================
-- Migration: 004_enrich_offer_fields
-- Description: Add enrichment fields for freshness, hotness,
--   URL quality, and deal classification.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Add engagement & freshness columns to offers
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS used_count        INTEGER     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS click_count       INTEGER     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversion_count  INTEGER     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hotness_score     NUMERIC(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_pushsale       BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_exclusive      BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at       TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS freshness_score   NUMERIC(5,4) DEFAULT 0;

COMMENT ON COLUMN public.offers.used_count       IS 'Number of times this offer has been used (MasOffer used_count)';
COMMENT ON COLUMN public.offers.click_count       IS 'Number of clicks on this offer (MasOffer click_count)';
COMMENT ON COLUMN public.offers.conversion_count IS 'Number of conversions from this offer (MasOffer conversion_count)';
COMMENT ON COLUMN public.offers.hotness_score     IS 'Composite hotness signal 0–1 derived from used_count and conversion rate';
COMMENT ON COLUMN public.offers.is_pushsale       IS 'True if this offer is flagged as pushsale/hot deal by the source network';
COMMENT ON COLUMN public.offers.is_exclusive      IS 'True if this offer is exclusive to the publisher network';
COMMENT ON COLUMN public.offers.verified_at       IS 'When this offer was verified by a publisher moderator';
COMMENT ON COLUMN public.offers.freshness_score   IS 'Recency signal 0–1: higher = more recently synced or recently active';

-- ─────────────────────────────────────────────────────────────
-- 2. Normalise category: cascade for GIN/FTS
-- ─────────────────────────────────────────────────────────────

-- Drop existing category index if any (replaced below)
DROP INDEX IF EXISTS public.idx_offers_category;

-- Partial unique constraint: same source+external_id should map to same category
-- (add as informational note — not enforced to allow source data to evolve)

-- New index: category lookups + text search
CREATE INDEX IF NOT EXISTS idx_offers_category_normalized
  ON public.offers(category)
  WHERE category IS NOT NULL;

-- Composite index for status + confidence + freshness sorting
CREATE INDEX IF NOT EXISTS idx_offers_quality_sort
  ON public.offers(status, confidence_score DESC, hotness_score DESC)
  WHERE status = 'active';

-- Composite index for freshness-based queries
CREATE INDEX IF NOT EXISTS idx_offers_freshness
  ON public.offers(synced_at DESC, hotness_score DESC)
  WHERE status = 'active';

-- Index for pushsale / hot deal queries
CREATE INDEX IF NOT EXISTS idx_offers_pushsale
  ON public.offers(source, hotness_score DESC, confidence_score DESC)
  WHERE is_pushsale = true OR hotness_score > 0.5;

-- ─────────────────────────────────────────────────────────────
-- 3. Add url_quality_score column
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS url_quality_score NUMERIC(3,2) DEFAULT 0;

COMMENT ON COLUMN public.offers.url_quality_score
  IS 'URL quality score 0–1: 1.0 = well-formed HTTPS, has click params; 0.5 = http only; 0 = broken/invalid';

CREATE INDEX IF NOT EXISTS idx_offers_url_quality
  ON public.offers(url_quality_score DESC)
  WHERE destination_url IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 4. Add source-specific sub-type for granular deal classification
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS deal_subtype TEXT DEFAULT NULL;

COMMENT ON COLUMN public.offers.deal_subtype
  IS 'Granular deal type: flash_sale | pushesale | cashback | free_shipping | hot_deal | general';

-- Index for deal_subtype filtering
CREATE INDEX IF NOT EXISTS idx_offers_deal_subtype
  ON public.offers(deal_subtype)
  WHERE deal_subtype IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 5. Tracking URL presence indicator (for query optimization)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS has_tracking_url BOOLEAN GENERATED ALWAYS AS (
    tracking_url IS NOT NULL AND tracking_url <> ''
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_offers_has_tracking_url
  ON public.offers(has_tracking_url)
  WHERE has_tracking_url = true;

-- ─────────────────────────────────────────────────────────────
-- 6. Compute freshness_score trigger
-- ─────────────────────────────────────────────────────────────

-- freshness_score = recency component (0.5) + status component (0.5)
-- recency: 1.0 if synced < 1 day ago, decays linearly to 0 over 7 days
-- status: 1.0 if active, 0.5 if pending, 0 if inactive/expired
-- This is updated via the sync pipeline, not a DB trigger (more control)

-- ─────────────────────────────────────────────────────────────
-- 7. Update sync_runs: add endpoint tracking
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.sync_runs
  ADD COLUMN IF NOT EXISTS endpoint      TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS records_deduplicated INTEGER DEFAULT 0;

COMMENT ON COLUMN public.sync_runs.endpoint            IS 'API endpoint that was synced (e.g. /v1/offer/pushsale)';
COMMENT ON COLUMN public.sync_runs.records_deduplicated IS 'Number of duplicate records removed before upsert';

-- ─────────────────────────────────────────────────────────────
-- 8. Offer snapshot: add snapshot type for diff analysis
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.offer_snapshots
  ADD COLUMN IF NOT EXISTS snapshot_type TEXT DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS hotness_at_capture NUMERIC(5,4);

COMMENT ON COLUMN public.offer_snapshots.snapshot_type        IS 'Type: full | delta | verification';
COMMENT ON COLUMN public.offer_snapshots.hotness_at_capture   IS 'hotness_score at the time of snapshot capture';

-- ============================================================
-- Migration applied
-- ============================================================
