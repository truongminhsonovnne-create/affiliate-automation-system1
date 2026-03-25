-- ============================================================
-- Migration: 029_create_seo_posts_table.sql
-- Mô tả: Tạo bảng posts cho blog SEO tự động
-- Ngày: 2026-03-25
-- ============================================================

-- Tạo bảng posts
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  meta_description TEXT,
  keywords TEXT[],
  category TEXT,
  featured_image_url TEXT,
  featured_image_prompt TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'auto-generated')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index cho tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_source ON posts(source);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);

-- Trigger tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Cho phép đọc tất cả bài đã publish (public)
DROP POLICY IF EXISTS "Allow public read published posts" ON posts;
CREATE POLICY "Allow public read published posts" ON posts
  FOR SELECT USING (status = 'published');

-- Cho phép đọc tất cả (cho admin)
DROP POLICY IF EXISTS "Allow admin full access" ON posts;
CREATE POLICY "Allow admin full access" ON posts
  FOR ALL USING (true);

-- ============================================================
-- COMMENT
-- ============================================================
COMMENT ON TABLE posts IS 'Bảng lưu bài viết blog SEO, auto-generated mỗi ngày bởi AI';
COMMENT ON COLUMN posts.title IS 'Tiêu đề bài viết';
COMMENT ON COLUMN posts.slug IS 'URL slug duy nhất (VD: ma-giam-gia-shopee-2026)';
COMMENT ON COLUMN posts.content IS 'Nội dung HTML bài viết';
COMMENT ON COLUMN posts.meta_description IS 'Mô tả meta cho SEO (dưới 160 ký tự)';
COMMENT ON COLUMN posts.keywords IS 'Danh sách từ khóa SEO';
COMMENT ON COLUMN posts.category IS 'Danh mục: voucher, review, hướng dẫn, tin tức';
COMMENT ON COLUMN posts.featured_image_url IS 'URL ảnh cover (từ Supabase Storage)';
COMMENT ON COLUMN posts.featured_image_prompt IS 'Prompt dùng để tạo ảnh cover bằng AI';
COMMENT ON COLUMN posts.status IS 'Trạng thái: draft, published, archived';
COMMENT ON COLUMN posts.source IS 'Nguồn: manual hoặc auto-generated';
COMMENT ON COLUMN posts.published_at IS 'Thời gian đăng bài';
