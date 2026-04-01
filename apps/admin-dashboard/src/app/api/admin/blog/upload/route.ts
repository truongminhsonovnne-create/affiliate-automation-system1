/**
 * Admin Blog Image Upload — POST /api/admin/blog/upload
 *
 * Accepts a multipart/form-data image upload and stores it in Supabase Storage.
 * Returns the public URL of the uploaded image.
 *
 * Auth: admin session + edit_blog_posts permission
 * Limits: 5MB, JPEG/PNG/WebP/GIF only
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/rbac';
import type { Role } from '@/lib/auth/rbac';

// 5 MB limit
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(session.role as Role, 'edit_blog_posts')) {
    return NextResponse.json(
      { error: 'Forbidden — cần quyền operator trở lên để upload ảnh' },
      { status: 403 }
    );
  }

  // ── Parse multipart form ───────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Không có file nào được gửi lên' }, { status: 400 });
  }

  // ── Validate file ─────────────────────────────────────────────────────────
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Định dạng không hỗ trợ: ${file.type}. Chỉ JPEG, PNG, WebP, GIF.` },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Tối đa 5MB.` },
      { status: 400 }
    );
  }

  // ── Build storage path ────────────────────────────────────────────────────
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/__+/g, '_')
    .substring(0, 60);
  const timestamp = Date.now().toString(36);
  const fileName = `${timestamp}-${safeName}`;
  const storagePath = `blog/${fileName}`;

  // ── Upload to Supabase Storage ───────────────────────────────────────────
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Upload using ArrayBuffer (Buffer is not available in Vercel Edge runtime)
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { data: uploadData, error } = await supabase.storage
      .from('blog-images')
      .upload(storagePath, uint8Array, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      return NextResponse.json(
        { error: `Upload thất bại: ${error.message}` },
        { status: 500 }
      );
    }

    // Supabase Storage v2 returns data as a string path
    const uploadedPath = typeof uploadData === 'string' ? uploadData : (uploadData as any)?.path;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('blog-images')
      .getPublicUrl(uploadedPath as string);

    return NextResponse.json({
      url: urlData.publicUrl,
      path: uploadedPath,
      fileName: file.name,
      size: file.size,
      type: file.type,
      message: 'Upload thành công!',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
