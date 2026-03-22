/**
 * Admin Logout API
 *
 * Clears the signed session cookie and logs the event.
 */

import { NextRequest, NextResponse } from 'next/server';
import { clearSession, getActorId } from '@/lib/auth/session';
import { logLogout } from '@/lib/auth/auditLogger';

function getClientIp(request: NextRequest): string {
  return (
    request.ip ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  try {
    // Get actor before clearing session
    const actorId = await getActorId();

    await clearSession();

    // Log logout event
    if (actorId) {
      logLogout(ip, actorId);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[LOGOUT] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
