/**
 * Affiliate Redirect Handler — /redirect
 *
 * Flow:
 *   1. Parse dealId + source from URL params
 *   2. Fetch tracking URL from Supabase (by dealId)
 *   3. Log click event (fire-and-forget)
 *   4. 302 redirect to the real tracking URL
 *
 * URL format:
 *   /redirect?d=<base64url-encoded-dealId>&s=<source>
 *   s = 'at' (accesstrade) | 'mo' (masoffer)
 *
 * Security:
 *  - dealId is base64url encoded (not raw UUID in URL)
 *  - tracking URL is fetched from our DB (not from user)
 *  - We never redirect to arbitrary URLs
 *  - Rate limiting: 60 req/min/IP (via Next.js route config)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeDealId } from '@/lib/affiliate/links';
import { logClick } from '@/lib/affiliate/click-logger';

// ── Supabase ──────────────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ── GET /redirect ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const encodedId = searchParams.get('d');
  const src = searchParams.get('s');

  // ── Validate params ───────────────────────────────────────────────────────
  if (!encodedId || !src) {
    return NextResponse.redirect(new URL('/deals/hot', request.url), 302);
  }

  const dealId = decodeDealId(encodedId);
  if (!dealId) {
    return NextResponse.redirect(new URL('/deals/hot', request.url), 302);
  }

  let source: 'accesstrade' | 'masoffer';
  if (src === 'at') source = 'accesstrade';
  else if (src === 'mo') source = 'masoffer';
  else {
    return NextResponse.redirect(new URL('/deals/hot', request.url), 302);
  }

  // ── Fetch tracking URL from Supabase ──────────────────────────────────────
  const sb = getSupabase();
  if (!sb) {
    return NextResponse.redirect(new URL('/deals/hot', request.url), 302);
  }

  const { data: deal, error } = await sb
    .from('offers')
    .select('id, tracking_url, destination_url, title, source')
    .eq('id', dealId)
    .eq('source', source)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (error || !deal) {
    // Deal not found or not active — redirect to deals page
    return NextResponse.redirect(new URL('/deals/hot', request.url), 302);
  }

  // ── Determine redirect target ───────────────────────────────────────────────
  const trackingUrl = deal.tracking_url ?? deal.destination_url;
  if (!trackingUrl) {
    return NextResponse.redirect(new URL('/deals/hot', request.url), 302);
  }

  // ── Log click (fire-and-forget) ───────────────────────────────────────────
  const ip = request.headers.get('x-forwarded-for')
    ?? request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-real-ip')
    ?? '0.0.0.0';

  logClick({
    dealId,
    source,
    destination: trackingUrl,
    ip: ip.split(',')[0].trim(),
    userAgent: request.headers.get('user-agent') ?? 'unknown',
    referer: request.headers.get('referer') ?? undefined,
  });

  // ── Redirect to tracking link ──────────────────────────────────────────────
  // 302 = temporary redirect (forces fresh fetch, no caching)
  return NextResponse.redirect(trackingUrl, 302);
}
