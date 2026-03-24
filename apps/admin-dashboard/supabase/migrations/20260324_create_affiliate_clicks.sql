-- Migration: Create affiliate_clicks table for tracking affiliate link clicks
-- Run this once to enable click analytics and commission attribution

CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id     TEXT        NOT NULL,
  source      TEXT        NOT NULL CHECK (source IN ('accesstrade', 'masoffer')),
  destination TEXT        NOT NULL,
  ip_hash     TEXT        NOT NULL,
  user_agent  TEXT,
  referer     TEXT,
  clicked_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_deal_id ON public.affiliate_clicks(deal_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_clicked_at ON public.affiliate_clicks(clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_source ON public.affiliate_clicks(source);

-- Row Level Security: service_role can do everything, anon can do nothing
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- Only service_role (backend) can read/write — anon key (browser) has no access
CREATE POLICY "service_role full access" ON public.affiliate_clicks
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE public.affiliate_clicks IS
  'Tracks clicks on affiliate deal links for analytics and commission attribution. IP is stored as salted SHA-256 hash only — never raw.';
