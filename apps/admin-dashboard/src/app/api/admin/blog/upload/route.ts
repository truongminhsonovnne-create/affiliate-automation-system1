/**
 * Admin Blog Image Upload — POST /api/admin/blog/upload
 *
 * Uses Supabase Storage signed URL to upload directly from browser → Supabase.
 * This bypasses Vercel's 4.5MB body limit (file never touches Vercel).
 *
 * Auth: admin session + edit_blog_posts permission
 * Limits: 5MB, JPEG/PNG/WebP/GIF only (validated via metadata before upload)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/rbac';
import type { Role } from '@/lib/auth/rbac';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
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

  // ── Parse minimal body (metadata only — no file data here) ───────────────
  let body: { fileName: string; fileType: string; fileSize: number } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body?.fileName || !body?.fileType) {
    return NextResponse.json({ error: 'Missing file metadata (fileName, fileType required)' }, { status: 400 });
  }

  const { fileName, fileType, fileSize } = body;

  // ── Validate metadata ─────────────────────────────────────────────────────
  if (!ALLOWED_TYPES.includes(fileType)) {
    return NextResponse.json(
      { error: `Định dạng không hỗ trợ: ${fileType}. Chỉ JPEG, PNG, WebP, GIF.` },
      { status: 400 }
    );
  }

  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File quá lớn (${(fileSize / 1024 / 1024).toFixed(1)}MB). Tối đa 5MB.` },
      { status: 400 }
    );
  }

  // ── Generate signed upload URL (file goes browser → Supabase directly) ────
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

    const safeName = fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/__+/g, '_')
      .substring(0, 60);
    const path = `blog/${Date.now()}-${safeName}`;

    // createSignedUploadUrl creates a short-lived PUT URL for direct browser upload
    const { data, error } = await supabase.storage
      .from('blog-images')
      .createSignedUploadUrl(path);

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Không thể tạo upload URL' },
        { status: 500 }
      );
    }

    // Return the signed URL — client uploads file directly to Supabase
    // publicUrl is the permanent public URL after upload completes
    const publicUrl = `${url}/storage/v1/object/public/blog-images/${path}`;

    return NextResponse.json({
      uploadUrl: data.signedUrl,
      publicUrl,
      path,
      message: 'Upload URL generated — upload file directly to uploadUrl with PUT method',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
