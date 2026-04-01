/**
 * Publish Jobs API — /api/admin/publish-jobs
 *
 * Handles creation of publish jobs via the admin dashboard.
 * Proxies to the control plane's internal API.
 *
 * Auth: requires admin session + run_publish_jobs permission.
 * Methods: GET (list), POST (create)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/rbac';
import type { Role } from '@/lib/auth/rbac';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? 'http://localhost:3001';
const CONTROL_PLANE_SECRET = process.env.CONTROL_PLANE_INTERNAL_SECRET ?? '';

// =============================================================================
// Validation Schemas (mirrors Zod patterns used in the codebase)
// =============================================================================

interface CreatePublishJobBody {
  platform: string;
  contentType?: string;
  sourceType?: string;
  /** Comma-separated product IDs, or "all" */
  productIds?: string;
  /** ISO timestamp for scheduled publish, or null for immediate */
  scheduledAt?: string | null;
  /** Channel: tiktok, facebook, website, etc. */
  channel?: string;
  /** Priority: higher = more important */
  priority?: number;
  title?: string;
  description?: string;
}

function validateCreateBody(body: unknown): { ok: true; data: CreatePublishJobBody } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object' };
  }

  const b = body as Record<string, unknown>;

  // Platform is required
  const platform = b.platform;
  if (typeof platform !== 'string' || platform.trim().length === 0) {
    return { ok: false, error: 'platform is required and must be a non-empty string' };
  }

  const allowedPlatforms = ['shopee', 'lazada', 'tiktok', 'tiki'];
  if (!allowedPlatforms.includes(platform.trim().toLowerCase())) {
    return { ok: false, error: `platform must be one of: ${allowedPlatforms.join(', ')}` };
  }

  // Optional fields
  const contentType = typeof b.contentType === 'string' ? b.contentType : undefined;
  const sourceType = typeof b.sourceType === 'string' ? b.sourceType : undefined;
  const productIds = typeof b.productIds === 'string' ? b.productIds : undefined;
  const channel = typeof b.channel === 'string' ? b.channel : undefined;
  const priority = typeof b.priority === 'number' ? b.priority : 0;
  const title = typeof b.title === 'string' ? b.title.trim() : undefined;
  const description = typeof b.description === 'string' ? b.description.trim() : undefined;

  // scheduledAt: optional ISO string or null
  let scheduledAt: string | null | undefined = undefined;
  if (b.scheduledAt === null) {
    scheduledAt = null;
  } else if (typeof b.scheduledAt === 'string' && b.scheduledAt.trim().length > 0) {
    const parsed = new Date(b.scheduledAt);
    if (isNaN(parsed.getTime())) {
      return { ok: false, error: 'scheduledAt must be a valid ISO timestamp' };
    }
    scheduledAt = parsed.toISOString();
  }

  return {
    ok: true,
    data: {
      platform: platform.trim().toLowerCase(),
      contentType,
      sourceType,
      productIds,
      scheduledAt,
      channel,
      priority: Math.max(0, Math.min(10, Math.floor(priority))),
      title: title || undefined,
      description: description || undefined,
    },
  };
}

// =============================================================================
// Route Handlers
// =============================================================================

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/publish-jobs
 * List publish jobs — proxied to control plane (read-only).
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(session.role as Role, 'view_publish_jobs')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  const targetPath = `/internal/dashboard/publish-jobs${query ? `?${query}` : ''}`;

  const url = `${INTERNAL_API_URL}${targetPath}`;
  let response: Response;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-internal-secret': CONTROL_PLANE_SECRET,
        'x-actor-id': session.actorId,
        'x-correlation-id': `pj_list_${Date.now().toString(36)}`,
      },
      signal: controller.signal as AbortSignal,
    });

    clearTimeout(timeout);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    if (reason.includes('abort')) {
      return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Failed to reach internal service' }, { status: 502 });
  }

  const contentType = response.headers.get('content-type') ?? '';
  let safeBody: unknown;

  try {
    const text = await response.text();
    if (contentType.includes('application/json')) {
      safeBody = JSON.parse(text);
    } else {
      safeBody = { message: 'Unexpected response', status: response.status };
    }
  } catch {
    safeBody = { message: 'Response received', status: response.status };
  }

  return NextResponse.json(safeBody, { status: response.status });
}

/**
 * POST /api/admin/publish-jobs
 * Create a new publish job — proxied to control plane.
 */
export async function POST(request: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(session.role as Role, 'run_publish_jobs')) {
    return NextResponse.json(
      { error: 'Forbidden — bạn cần quyền operator trở lên để tạo job' },
      { status: 403 }
    );
  }

  // ── Parse body ────────────────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = validateCreateBody(rawBody);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { data } = validation;

  // ── Proxy to control plane ────────────────────────────────────────
  const internalUrl = `${INTERNAL_API_URL}/internal/dashboard/publish-jobs`;

  let response: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    response = await fetch(internalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': CONTROL_PLANE_SECRET,
        'x-actor-id': session.actorId,
        'x-actor-role': session.role ?? 'unknown',
        'x-correlation-id': `pj_create_${Date.now().toString(36)}`,
      },
      body: JSON.stringify({
        platform: data.platform,
        contentType: data.contentType,
        sourceType: data.sourceType,
        productIds: data.productIds,
        scheduledAt: data.scheduledAt,
        channel: data.channel,
        priority: data.priority,
        title: data.title,
        description: data.description,
      }),
      signal: controller.signal as AbortSignal,
    });

    clearTimeout(timeout);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    if (reason.includes('abort')) {
      return NextResponse.json({ error: 'Request timed out (60s limit)' }, { status: 504 });
    }
    return NextResponse.json({ error: `Failed to reach internal service: ${reason}` }, { status: 502 });
  }

  const contentType = response.headers.get('content-type') ?? '';
  let safeBody: unknown;

  try {
    const text = await response.text();
    if (contentType.includes('application/json')) {
      safeBody = JSON.parse(text);
    } else {
      safeBody = { message: 'Unexpected response', status: response.status };
    }
  } catch {
    safeBody = { message: 'Response received', status: response.status };
  }

  return NextResponse.json(safeBody, { status: response.status });
}
