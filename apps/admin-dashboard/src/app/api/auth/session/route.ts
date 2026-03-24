/**
 * Session Check API
 *
 * Returns current authenticated session for client-side UI.
 * Uses server-side HMAC verification — never trusts client cookie.
 */

import { NextResponse } from 'next/server';
import { getSession, isAuthenticated } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }

  const session = await getSession();

  if (!session) {
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }

  // Return only safe, non-sensitive data
  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.actorId,
      role: session.role,
      // Expose remaining session time (not sensitive)
      expiresAt: session.expiresAt,
    },
  });
}
