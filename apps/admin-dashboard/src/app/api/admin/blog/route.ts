/**
 * Admin Blog API — /api/admin/blog
 *
 * Full CRUD for blog posts + image upload via Supabase Storage.
 * All routes require admin session + appropriate role permission.
 *
 * Auth: session cookie (server-side verified)
 * Permissions:
 *   GET  — view_blog_posts  (operator+)
 *   POST — edit_blog_posts  (operator+)
 *   PUT  — edit_blog_posts (operator+)
 *   DELETE — delete_blog_posts (admin+)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/rbac';
import type { Role } from '@/lib/auth/rbac';

// =============================================================================
// Supabase client (server-side only — never expose to browser)
// =============================================================================

function getSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// =============================================================================
// Types
// =============================================================================

interface PostRow {
  id: string;
  title: string;
  slug: string;
  content: string;
  meta_description: string | null;
  keywords: string[] | null;
  category: string | null;
  featured_image_url: string | null;
  featured_image_prompt: string | null;
  status: string;
  source: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author_id: string | null;
  author_name: string | null;
  read_time_minutes: number | null;
  content_summary: string | null;
}

// =============================================================================
// Helpers
// =============================================================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
}

function estimateReadTime(content: string): number {
  const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / 200));
}

function generateMetaDescription(content: string): string {
  const stripped = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return stripped.substring(0, 155) + (stripped.length > 155 ? '…' : '');
}

// =============================================================================
// GET /api/admin/blog — List posts
// =============================================================================

export async function GET(request: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(session.role as Role, 'view_blog_posts')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ── Parse query params ───────────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
  const status   = searchParams.get('status') ?? '';
  const category = searchParams.get('category') ?? '';
  const search   = searchParams.get('search') ?? '';
  const sortBy   = searchParams.get('sortBy') ?? 'created_at';
  const sortDir  = searchParams.get('sortDir') ?? 'desc';

  try {
    const supabase = getSupabase();

    let query = supabase
      .from('posts')
      .select('*', { count: 'exact' })
      .order(sortBy === 'published_at' ? 'published_at' : 'created_at', {
        ascending: sortDir === 'asc',
      })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (status) {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        items: data as PostRow[],
        pagination: {
          page,
          pageSize,
          total: count ?? 0,
          totalPages: Math.ceil((count ?? 0) / pageSize),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// =============================================================================
// POST /api/admin/blog — Create post
// =============================================================================

export async function POST(request: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(session.role as Role, 'edit_blog_posts')) {
    return NextResponse.json(
      { error: 'Forbidden — cần quyền operator trở lên để tạo bài viết' },
      { status: 403 }
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    title,
    content,
    category = 'voucher',
    status = 'draft',
    keywords = [],
    featured_image_url = null,
    featured_image_prompt = null,
    publishNow = false,
  } = body as Record<string, unknown>;

  // ── Validation ────────────────────────────────────────────────────────────
  if (!title || typeof title !== 'string' || title.trim().length < 5) {
    return NextResponse.json(
      { error: 'Tiêu đề phải có ít nhất 5 ký tự' },
      { status: 400 }
    );
  }

  if (!content || typeof content !== 'string' || content.trim().length < 50) {
    return NextResponse.json(
      { error: 'Nội dung bài viết phải có ít nhất 50 ký tự' },
      { status: 400 }
    );
  }

  const slug = slugify(title as string);
  const readTime = estimateReadTime(content as string);
  const metaDescription =
    (body.meta_description as string) ||
    generateMetaDescription(content as string);
  const contentSummary = (content as string).replace(/<[^>]*>/g, '').substring(0, 199);

  // Determine effective status
  const effectiveStatus =
    publishNow === true ? 'published' : (status as string);
  const publishedAt =
    effectiveStatus === 'published' ? new Date().toISOString() : null;

  try {
    const supabase = getSupabase();

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Slug "${slug}" đã tồn tại. Vui lòng đổi tiêu đề.` },
        { status: 409 }
      );
    }

    // Insert
    const { data, error } = await supabase
      .from('posts')
      .insert({
        title: (title as string).trim(),
        slug,
        content: (content as string).trim(),
        meta_description: metaDescription,
        keywords: Array.isArray(keywords) ? keywords : [],
        category: category as string,
        featured_image_url: featured_image_url as string | null,
        featured_image_prompt: featured_image_prompt as string | null,
        status: effectiveStatus,
        source: 'manual',
        published_at: publishedAt,
        author_id: session.actorId,
        author_name: session.displayName || session.actorId,
        read_time_minutes: readTime,
        content_summary: contentSummary,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { data: data as PostRow, message: 'Bài viết đã được tạo!' },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// =============================================================================
// PUT /api/admin/blog — Update post
// =============================================================================

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(session.role as Role, 'edit_blog_posts')) {
    return NextResponse.json(
      { error: 'Forbidden — cần quyền operator trở lên để sửa bài viết' },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { id, title, content, category, status, keywords, featured_image_url, featured_image_prompt, publishNow } = body;

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing post id' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 5) {
        return NextResponse.json({ error: 'Tiêu đề phải có ít nhất 5 ký tự' }, { status: 400 });
      }
      updates.title = (title as string).trim();
      updates.slug = slugify(title as string);
    }

    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length < 50) {
        return NextResponse.json({ error: 'Nội dung phải có ít nhất 50 ký tự' }, { status: 400 });
      }
      updates.content = (content as string).trim();
      updates.read_time_minutes = estimateReadTime(content as string);
      updates.content_summary = (content as string).replace(/<[^>]*>/g, '').substring(0, 199);
      updates.meta_description =
        body.meta_description
          ? (body.meta_description as string)
          : generateMetaDescription(content as string);
    }

    if (category !== undefined) updates.category = category;
    if (keywords !== undefined) updates.keywords = Array.isArray(keywords) ? keywords : [];
    if (featured_image_url !== undefined) updates.featured_image_url = featured_image_url;
    if (featured_image_prompt !== undefined) updates.featured_image_prompt = featured_image_prompt;

    const effectiveStatus =
      publishNow === true
        ? 'published'
        : status !== undefined
        ? (status as string)
        : undefined;

    if (effectiveStatus) {
      updates.status = effectiveStatus;
      updates.published_at =
        effectiveStatus === 'published' ? new Date().toISOString() : null;
    }

    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Không tìm thấy bài viết' }, { status: 404 });
    }

    return NextResponse.json({ data: data as PostRow, message: 'Bài viết đã được cập nhật!' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// =============================================================================
// DELETE /api/admin/blog — Delete post
// =============================================================================

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(session.role as Role, 'delete_blog_posts')) {
    return NextResponse.json(
      { error: 'Forbidden — chỉ admin mới được xóa bài viết' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id query parameter' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    // Get post first (to delete associated image)
    const { data: post } = await supabase
      .from('posts')
      .select('featured_image_url')
      .eq('id', id)
      .maybeSingle();

    // Delete post
    const { error } = await supabase.from('posts').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Optionally delete image from storage
    if (post?.featured_image_url) {
      const pathMatch = (post.featured_image_url as string).match(/\/blog-images\/(.+)$/);
      if (pathMatch) {
        await supabase.storage.from('blog-images').remove([pathMatch[1]]);
      }
    }

    return NextResponse.json({ message: 'Bài viết đã được xóa!' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
