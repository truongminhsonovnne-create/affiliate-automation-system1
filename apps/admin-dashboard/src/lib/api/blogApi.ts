/**
 * Blog API Client — Browser-safe helpers for admin blog management.
 *
 * All calls go to /api/admin/blog and /api/admin/blog/upload (server-side routes).
 *
 * Image upload (two-step):
 *   1. Browser → POST /api/admin/blog/upload (metadata JSON, <1KB) → returns signed URL
 *   2. Browser → PUT {signedUrl} directly to Supabase Storage (file never touches Vercel)
 *   Server-side limit: 10MB.
 */

import type {
  BlogPostRecord,
  ImageUploadResult,
  CreateBlogPostPayload,
  UpdateBlogPostPayload,
  PaginationMeta,
} from '../types/api';

const BASE = '/api/admin/blog';

// ── Internal fetch helper ───────────────────────────────────────────────────

async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const json = await res.json() as Record<string, unknown>;

  if (!res.ok) {
    throw new Error(
      (json.error as string) || `HTTP ${res.status}`
    );
  }

  return json as T;
}

// ── List posts ──────────────────────────────────────────────────────────────

export interface ListBlogPostsFilters {
  page?: number;
  pageSize?: number;
  status?: string;
  category?: string;
  search?: string;
  sortBy?: 'created_at' | 'published_at' | 'title';
  sortDir?: 'asc' | 'desc';
}

export async function listBlogPosts(
  filters: ListBlogPostsFilters = {}
): Promise<{ items: BlogPostRecord[]; pagination: PaginationMeta }> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.status) params.set('status', filters.status);
  if (filters.category) params.set('category', filters.category);
  if (filters.search) params.set('search', filters.search);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortDir) params.set('sortDir', filters.sortDir);

  const qs = params.toString();
  const result = await apiFetch<{
    data: { items: BlogPostRecord[]; pagination: PaginationMeta };
  }>(`${BASE}${qs ? `?${qs}` : ''}`);

  return result.data;
}

// ── Create post ─────────────────────────────────────────────────────────────

export async function createBlogPost(
  payload: CreateBlogPostPayload
): Promise<BlogPostRecord> {
  const result = await apiFetch<{
    data: BlogPostRecord;
    message: string;
  }>(BASE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return result.data;
}

// ── Update post ─────────────────────────────────────────────────────────────

export async function updateBlogPost(
  payload: UpdateBlogPostPayload
): Promise<BlogPostRecord> {
  const result = await apiFetch<{
    data: BlogPostRecord;
    message: string;
  }>(BASE, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return result.data;
}

// ── Delete post ─────────────────────────────────────────────────────────────

export async function deleteBlogPost(id: string): Promise<void> {
  await apiFetch<{ message: string }>(`${BASE}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ── AI content formatting ───────────────────────────────────────────────────

export interface FormatContentPayload {
  content: string;
  instruction?: string;
  title?: string;
  excerpt?: string;
}

export interface FormatContentResult {
  formatted: string;
  model: string;
  tokensUsed?: number;
}

export async function formatBlogContent(
  payload: FormatContentPayload
): Promise<FormatContentResult> {
  const result = await apiFetch<{
    data: FormatContentResult;
    message: string;
  }>('/api/admin/blog/format', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return result.data;
}

// ── Upload image (server-side FormData → Supabase SDK) ──

export async function uploadBlogImage(
  file: File
): Promise<ImageUploadResult> {
  // File is pre-compressed to ~1-2MB client-side before this call.
  // Vercel accepts it as multipart form data without 4.5MB issues.
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/admin/blog/upload', {
    method: 'POST',
    body: formData,
  });

  const json = await res.json() as Record<string, unknown>;

  if (!res.ok) {
    throw new Error((json.error as string) || `Upload failed: HTTP ${res.status}`);
  }

  const data = json as { url: string; path: string; fileName?: string; size?: number; type?: string };

  return {
    url: data.url,
    path: data.path,
    fileName: data.fileName ?? file.name,
    size: data.size ?? file.size,
    type: data.type ?? file.type,
  };
}
