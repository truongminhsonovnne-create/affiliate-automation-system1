-- ============================================
-- Migration: 001_create_affiliate_tables
-- Description: Create 3 tables for affiliate automation system
-- ============================================

-- ============================================
-- Table 1: affiliate_products
-- Store normalized product information
-- ============================================

CREATE TABLE IF NOT EXISTS public.affiliate_products (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Product identification
  platform TEXT NOT NULL,
  external_product_id TEXT NULL,
  title TEXT NOT NULL,
  price NUMERIC(15, 2) NULL,
  image_url TEXT NULL,
  original_description TEXT NULL,
  product_url TEXT NOT NULL,

  -- Source information
  source_type TEXT NOT NULL,
  source_keyword TEXT NULL,

  -- Timestamps
  crawled_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Additional fields
  original_price NUMERIC(15, 2) NULL,
  shop_name TEXT NULL,
  rating NUMERIC(3, 2) NULL,
  review_count INTEGER NULL,
  sold_count INTEGER NULL,
  category TEXT NULL
);

-- ============================================
-- Table 2: affiliate_contents
-- Store AI-generated content for products
-- ============================================

CREATE TABLE IF NOT EXISTS public.affiliate_contents (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key to products
  product_id UUID NOT NULL REFERENCES affiliate_products(id) ON DELETE CASCADE,

  -- AI-generated content
  rewritten_title TEXT NULL,
  review_content TEXT NULL,
  social_caption TEXT NULL,
  hashtags TEXT[] NULL,

  -- AI metadata
  ai_model TEXT NULL,
  prompt_version TEXT NULL,
  confidence_score NUMERIC(5, 4) NULL,
  trending_score NUMERIC(5, 4) NULL,
  recommendation TEXT NULL,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Table 3: crawl_jobs
-- Store crawl job history
-- ============================================

CREATE TABLE IF NOT EXISTS public.crawl_jobs (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Job identification
  platform TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_keyword TEXT NULL,

  -- Job status
  status TEXT NOT NULL DEFAULT 'pending',

  -- Job results
  items_found INTEGER NOT NULL DEFAULT 0,
  items_crawled INTEGER NOT NULL DEFAULT 0,
  items_failed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT NULL,

  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Indexes for affiliate_products
-- ============================================

CREATE INDEX IF NOT EXISTS idx_affiliate_products_product_url
  ON public.affiliate_products(product_url);

CREATE INDEX IF NOT EXISTS idx_affiliate_products_platform
  ON public.affiliate_products(platform);

CREATE INDEX IF NOT EXISTS idx_affiliate_products_source_type
  ON public.affiliate_products(source_type);

CREATE INDEX IF NOT EXISTS idx_affiliate_products_created_at
  ON public.affiliate_products(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_affiliate_products_external_id
  ON public.affiliate_products(external_product_id);

-- ============================================
-- Indexes for affiliate_contents
-- ============================================

CREATE INDEX IF NOT EXISTS idx_affiliate_contents_product_id
  ON public.affiliate_contents(product_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_contents_created_at
  ON public.affiliate_contents(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_affiliate_contents_ai_model
  ON public.affiliate_contents(ai_model);

-- ============================================
-- Indexes for crawl_jobs
-- ============================================

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_status
  ON public.crawl_jobs(status);

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_created_at
  ON public.crawl_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_started_at
  ON public.crawl_jobs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_source
  ON public.crawl_jobs(platform, source_type, source_keyword);

-- ============================================
-- Enable Row Level Security
-- ============================================

ALTER TABLE public.affiliate_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawl_jobs ENABLE ROW LEVEL SECURITY;

-- Policy for service role (full access)
CREATE POLICY "Service role full access products" ON public.affiliate_products
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access contents" ON public.affiliate_contents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access jobs" ON public.crawl_jobs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
