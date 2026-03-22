/**
 * MasOffer Health & Status — GET /api/admin/masoffer/health
 *
 * Proxies to the control plane's MasOffer health endpoint.
 * The control plane (Express backend) has the proper MasOffer API client
 * that uses HTTP/1.1 https.request for MasOffer compatibility.
 *
 * Auth: requires admin session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? 'http://localhost:3001';
const CONTROL_PLANE_SECRET = process.env.CONTROL_PLANE_INTERNAL_SECRET ?? '';

export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const url = `${INTERNAL_API_URL}/integrations/masoffer/health`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-internal-secret': CONTROL_PLANE_SECRET,
        'x-actor-id': session.actorId,
        'x-correlation-id': `mo_hp_${Date.now().toString(36)}`,
      },
      signal: controller.signal as AbortSignal,
    });

    clearTimeout(timeout);

    const contentType = response.headers.get('content-type') ?? '';
    let body: unknown;

    try {
      const text = await response.text();
      if (contentType.includes('application/json')) {
        body = JSON.parse(text);
      } else {
        body = { message: 'Unexpected response', status: response.status };
      }
    } catch {
      body = { message: 'Response received', status: response.status };
    }

    return NextResponse.json(body, { status: response.status });
  } catch (err) {
    clearTimeout(timeout);
    const reason = err instanceof Error ? err.message : String(err);

    if (reason.includes('abort')) {
      return NextResponse.json({ error: 'Health check timed out' }, { status: 504 });
    }
    return NextResponse.json(
      { error: `Control plane unreachable: ${reason}` },
      { status: 502 }
    );
  }
}
