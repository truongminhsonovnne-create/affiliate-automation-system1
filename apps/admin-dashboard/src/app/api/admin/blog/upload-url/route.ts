/**
 * Generate Supabase Storage Upload URL
 *
 * Step 1: Browser calls this route → gets upload params
 * Step 2: Browser POSTs file directly to Supabase Storage
 * Step 3: Browser saves the returned public URL in the blog post form
 *
 * This avoids the Vercel 4.5MB body limit.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/rbac';
import type { Role } from '@/lib/auth/rbac';
import { createClient } from '@supabase/supabase-js';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: NextRequest) {
  // Auth
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.role as Role, 'edit_blog_posts')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Parse body (tiny — no file data here)
  let body: { fileName: string; fileType: string; fileSize: number } | null = null;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!body?.fileName || !body?.fileType) {
    return NextResponse.json({ error: 'Missing file metadata' }, { status: 400 });
  }

  const { fileName, fileType, fileSize } = body;

  // Validate
  if (!ALLOWED_TYPES.includes(fileType)) {
    return NextResponse.json({ error: `Chỉ hỗ trợ: ${ALLOWED_TYPES.join(', ')}` }, { status: 400 });
  }
  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json({ error: `File tối đa 5MB` }, { status: 400 });
  }

  // Generate signed upload URL
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/__+/g, '_').slice(0, 60);
  const path = `blog/${Date.now()}-${safeName}`;

  const { data, error } = await sb.storage
    .from('blog-images')
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Upload URL generation failed' }, { status: 500 });
  }

  return NextResponse.json({
    uploadUrl: data.url,
    publicUrl: `${url}/storage/v1/object/public/blog-images/${path}`,
    path,
  });
}
