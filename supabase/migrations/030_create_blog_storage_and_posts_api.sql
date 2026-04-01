-- ============================================================
-- Migration: 030_create_blog_storage_and_posts_api
-- Mô tả: Thêm Supabase Storage bucket cho blog + cập nhật bảng posts
-- Ngày: 2026-04-01
-- ============================================================

-- ============================================================
-- 1. STORAGE BUCKET — blog-images
-- ============================================================

-- Tạo bucket cho ảnh blog (public: đọc công khai, ghi cần service role)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-images',
  'blog-images',
  true,                                           -- public: ai cũng đọc được ảnh
  5242880,                                        -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: ai cũng đọc được ảnh trong blog-images
DROP POLICY IF EXISTS "blog-images public read" ON storage.objects;
CREATE POLICY "blog-images public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'blog-images');

-- Policy: chỉ service_role được upload ảnh
DROP POLICY IF EXISTS "blog-images service upload" ON storage.objects;
CREATE POLICY "blog-images service upload" ON storage.objects
  FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'blog-images');

-- Policy: chỉ service_role được update ảnh
DROP POLICY IF EXISTS "blog-images service update" ON storage.objects;
CREATE POLICY "blog-images service update" ON storage.objects
  FOR UPDATE TO service_role
  USING (bucket_id = 'blog-images')
  WITH CHECK (bucket_id = 'blog-images');

-- Policy: chỉ service_role được xóa ảnh
DROP POLICY IF EXISTS "blog-images service delete" ON storage.objects;
CREATE POLICY "blog-images service delete" ON storage.objects
  FOR DELETE TO service_role
  USING (bucket_id = 'blog-images');

-- ============================================================
-- 2. CẬP NHẬT BẢNG posts
-- ============================================================

-- Thêm cột author/admin để track ai tạo bài
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS author_id TEXT,
  ADD COLUMN IF NOT EXISTS author_name TEXT,
  ADD COLUMN IF NOT EXISTS read_time_minutes INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS content_summary TEXT;  -- tóm tắt ngắn cho card

-- Thêm index cho author
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);

-- Comment cho các cột mới
COMMENT ON COLUMN posts.author_id IS 'ID của admin tạo bài';
COMMENT ON COLUMN posts.author_name IS 'Tên hiển thị của admin tạo bài';
COMMENT ON COLUMN posts.read_time_minutes IS 'Thời gian đọc ước tính (phút)';
COMMENT ON COLUMN posts.content_summary IS 'Tóm tắt ngắn cho card hiển thị (dưới 200 ký tự)';

-- ============================================================
-- 3. COMMENT
-- ============================================================

COMMENT ON POLICY "blog-images public read" ON storage.objects IS
  'Cho phép đọc công khai ảnh blog';
COMMENT ON POLICY "blog-images service upload" ON storage.objects IS
  'Chỉ service role được upload ảnh blog (admin API)';
