-- ============================================
-- Migration: 001_create_affiliate_products
-- Created: 2024
-- Description: Create affiliate_products table
-- ============================================

-- Create table
CREATE TABLE IF NOT EXISTS public.affiliate_products (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Product information
  title TEXT NOT NULL,
  price NUMERIC(15, 2) NULL,
  image_url TEXT NULL,
  original_description TEXT NULL,

  -- AI generated content
  rewritten_title TEXT NULL,
  review_content TEXT NULL,
  social_caption TEXT NULL,
  hashtags TEXT[] NULL,

  -- Source information
  product_url TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_keyword TEXT NULL,

  -- Timestamps
  crawled_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Additional fields
  original_price NUMERIC(15, 2) NULL,
  shop_name TEXT NULL,
  rating NUMERIC(3, 2) NULL,
  review_count INTEGER NULL,
  sold_count INTEGER NULL,
  category TEXT NULL,
  status TEXT NULL DEFAULT 'pending',
  error_message TEXT NULL,
  processed_at TIMESTAMPTZ NULL,
  confidence_score NUMERIC(5, 4) NULL,
  trending_score NUMERIC(5, 4) NULL,
  recommendation TEXT NULL,

  -- Constraints
  CONSTRAINT unique_product_url UNIQUE (product_url)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_products_product_url
  ON public.affiliate_products(product_url);

CREATE INDEX IF NOT EXISTS idx_affiliate_products_source_type
  ON public.affiliate_products(source_type);

CREATE INDEX IF NOT EXISTS idx_affiliate_products_created_at
  ON public.affiliate_products(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_affiliate_products_status
  ON public.affiliate_products(status);

CREATE INDEX IF NOT EXISTS idx_affiliate_products_source_keyword
  ON public.affiliate_products(source_keyword);

CREATE INDEX IF NOT EXISTS idx_affiliate_products_price
  ON public.affiliate_products(price);

-- Enable RLS
ALTER TABLE public.affiliate_products ENABLE ROW LEVEL SECURITY;

-- Policy for service role
CREATE POLICY "Service role full access" ON public.affiliate_products
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
