/**
 * Admin Blog Image Upload — POST /api/admin/blog/upload
 *
 * Luồng đúng: chỉ nhận metadata nhỏ (JSON) → trả về signed URL
 * → Browser upload trực tiếp lên Supabase Storage (không qua Vercel)
 *
 * Auth: admin session + edit_blog_posts permission
 * Limits: 10MB, JPEG/PNG/WebP/GIF only
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/rbac';
import type { Role } from '@/lib/auth/rbac';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
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

  // ── Parse body (metadata only — no file data) ─────────────────────────────────
  let body: { fileName: string; fileType: string; fileSize: number } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const fileName: string = (body?.fileName as string | undefined) ?? '';
  const fileType: string = (body?.fileType as string | undefined) ?? '';
  const fileSize: number = (body?.fileSize as number | undefined) ?? 0;

  if (!fileName || !fileType) {
    return NextResponse.json(
      { error: 'Missing required fields: fileName, fileType' },
      { status: 400 }
    );
  }

  // ── Validate ─────────────────────────────────────────────────────────────
  if (!ALLOWED_TYPES.includes(fileType)) {
    return NextResponse.json(
      { error: `Định dạng không hỗ trợ: ${fileType}. Chỉ JPEG, PNG, WebP, GIF.` },
      { status: 400 }
    );
  }
  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File quá lớn (${(fileSize / 1024 / 1024).toFixed(1)}MB). Tối đa 10MB.` },
      { status: 400 }
    );
  }

  // ── Build storage path ────────────────────────────────────────────────────
  const safeName = fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/__+/g, '_')
    .slice(0, 60);
  const path = `blog/${Date.now()}-${safeName}`;

  // ── Get signed upload URL from Supabase ─────────────────────────────────
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

    // createSignedUploadUrl returns: { signedUrl, token, path }
    const { data, error } = await supabase.storage
      .from('blog-images')
      .createSignedUploadUrl(path);

    if (error) {
      return NextResponse.json(
        { error: `Supabase error: ${error.message}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      uploadUrl: (data as { signedUrl: string }).signedUrl,
      path,
      publicUrl: `${url}/storage/v1/object/public/${path}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
