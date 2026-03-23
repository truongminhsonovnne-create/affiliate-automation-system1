-- ============================================
-- Migration: 028_create_offers_table
-- Description: Create offers table for public deals API
-- ============================================

CREATE TABLE IF NOT EXISTS public.offers (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- External identification
  external_id TEXT,
  source TEXT NOT NULL,
  source_type TEXT,
  source_label TEXT,

  -- Offer details
  title TEXT,
  merchant_name TEXT,
  merchant_id TEXT,
  category TEXT,
  deal_subtype TEXT,

  -- Description & terms
  description TEXT,
  terms TEXT,

  -- Discount info
  discount_type TEXT,
  discount_value NUMERIC(15, 2),
  min_order_value NUMERIC(15, 2),
  max_discount NUMERIC(15, 2),

  -- Coupon / tracking
  coupon_code TEXT,
  destination_url TEXT,
  tracking_url TEXT,

  -- Media
  image_url TEXT,

  -- Timestamps
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),

  -- Status
  status TEXT DEFAULT 'active',

  -- Scores
  confidence_score NUMERIC(5, 4),
  hotness_score NUMERIC(5, 4),
  url_quality_score NUMERIC(5, 4),
  freshness_score NUMERIC(5, 4),

  -- Flags
  is_pushsale BOOLEAN DEFAULT FALSE,
  is_exclusive BOOLEAN DEFAULT FALSE,

  -- Internal
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_offers_source ON public.offers(source);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_end_at ON public.offers(end_at);
CREATE INDEX IF NOT EXISTS idx_offers_hotness ON public.offers(hotness_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_offers_confidence ON public.offers(confidence_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_offers_synced_at ON public.offers(synced_at DESC NULLS LAST);

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Policy: service_role has full access
CREATE POLICY "Service role full access offers" ON public.offers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Policy: anon can read active offers
CREATE POLICY "Anon can read active offers" ON public.offers
  FOR SELECT TO anon USING (status = 'active');
