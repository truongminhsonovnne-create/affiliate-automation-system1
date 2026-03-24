/**
 * MasOffer Sync Trigger — POST /api/admin/masoffer/sync
 *
 * Proxies to the control plane internal API.
 * The control plane owns the Supabase writes.
 *
 * Auth: requires admin session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? 'http://localhost:3001';
const CONTROL_PLANE_SECRET = process.env.CONTROL_PLANE_INTERNAL_SECRET ?? '';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { type?: string; dryRun?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { type = 'offers', dryRun = false } = body;
  const allowedTypes = ['offers', 'campaigns'];
  if (!allowedTypes.includes(type)) {
    return NextResponse.json(
      { error: `type must be one of: ${allowedTypes.join(', ')}` },
      { status: 400 }
    );
  }

  // Proxy to control plane
  const internalUrl = `${INTERNAL_API_URL}/internal/integrations/masoffer/sync`;

  let response: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    response = await fetch(internalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': CONTROL_PLANE_SECRET,
        'x-actor-id': session.actorId,
        'x-correlation-id': `mo_sync_${Date.now().toString(36)}`,
      },
      body: JSON.stringify({ type, dryRun }),
      signal: controller.signal as AbortSignal,
    });

    clearTimeout(timeout);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    if (reason.includes('abort')) {
      return NextResponse.json({ error: 'Sync timed out (2 minute limit)' }, { status: 504 });
    }
    return NextResponse.json({ error: `Failed to reach control plane: ${reason}` }, { status: 502 });
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
