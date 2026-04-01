/**
 * Admin Blog Image Upload
 *
 * Two-step upload flow to bypass Vercel's 4.5MB body limit:
 *
 * Step 1 — GET /api/admin/blog/upload?path=...&fileName=...&fileType=...&fileSize=...
 *   → Auth check, validates metadata, returns signed upload URL from Supabase Storage API
 *
 * Step 2 — POST /api/admin/blog/upload  (binary file body)
 *   → Auth check, reads file from request.arrayBuffer(), uploads to Supabase Storage
 *   → Returns { url, path } on success
 *
 * Auth: admin session + edit_blog_posts permission
 * Limits: 10MB, JPEG/PNG/WebP/GIF only
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/rbac';
import type { Role } from '@/lib/auth/rbac';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB — Supabase Storage bucket default is 50MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// ── GET: Return signed upload URL (no file data in request) ───────────────────

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(session.role as Role, 'edit_blog_posts')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  const fileName = searchParams.get('fileName');
  const fileType = searchParams.get('fileType');
  const fileSize = parseInt(searchParams.get('fileSize') ?? '0', 10);

  if (!path || !fileName || !fileType) {
    return NextResponse.json({ error: 'Missing required params: path, fileName, fileType' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(fileType)) {
    return NextResponse.json({ error: `Định dạng không hỗ trợ. Chỉ: JPEG, PNG, WebP, GIF.` }, { status: 400 });
  }
  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json({ error: `File quá lớn. Tối đa 10MB.` }, { status: 400 });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    // Call Supabase Storage REST API directly for signed upload URL
    const token = btoa(`${supabaseKey}:`);
    const signedRes = await fetch(
      `${supabaseUrl}/storage/v1/object/upload/sign/${path}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!signedRes.ok) {
      const errText = await signedRes.text();
      return NextResponse.json(
        { error: `Supabase signed URL error ${signedRes.status}: ${errText}` },
        { status: 502 }
      );
    }

    const signedData = await signedRes.json() as { url: string };
    const uploadUrl = `${supabaseUrl}/storage/v1${signedData.url}`;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${path}`;

    return NextResponse.json({ uploadUrl, publicUrl, path });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── POST: Receive binary file and forward to Supabase Storage ─────────────────

export async function POST(request: NextRequest) {
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

  // Read file metadata from headers (set by client before uploading)
  const fileName = request.headers.get('x-upload-file-name') ?? 'upload';
  const fileType = request.headers.get('x-upload-file-type') ?? 'image/jpeg';
  const fileSize = parseInt(request.headers.get('x-upload-file-size') ?? '0', 10);
  const uploadPath = request.headers.get('x-upload-path');

  if (!uploadPath) {
    return NextResponse.json({ error: 'Missing x-upload-path header' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(fileType)) {
    return NextResponse.json(
      { error: `Định dạng không hỗ trợ. Chỉ JPEG, PNG, WebP, GIF.` },
      { status: 400 }
    );
  }
  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File quá lớn (${(fileSize / 1024 / 1024).toFixed(1)}MB). Tối đa 10MB.` },
      { status: 400 }
    );
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await request.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload via Supabase Storage REST API (no SDK needed)
    const token = btoa(`${supabaseKey}:`);
    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/${uploadPath}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': fileType,
          'x-upsert': 'true',
        },
        body: uint8Array,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return NextResponse.json(
        { error: `Upload failed: HTTP ${uploadRes.status} — ${errText}` },
        { status: 502 }
      );
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${uploadPath}`;

    return NextResponse.json({
      url: publicUrl,
      path: uploadPath,
      fileName,
      size: fileSize,
      type: fileType,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
