/**
 * Affiliate Click Logger — Server-side only
 *
 * Writes a lightweight click event to Supabase so VoucherFinder can:
 * 1. Track which deals are getting the most clicks (analytics)
 * 2. Attribute commissions if the user later converts (optional future use)
 *
 * This is fire-and-forget — we never block the redirect on this DB write.
 *
 * ── Supabase Table Setup (run once in SQL Editor) ──────────────────────────────
 *
 * CREATE TABLE affiliate_clicks (
 *   id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   deal_id     TEXT NOT NULL,
 *   source      TEXT NOT NULL,   -- 'accesstrade' | 'masoffer'
 *   destination TEXT NOT NULL,
 *   ip_hash     TEXT NOT NULL,   -- SHA-256 of IP + salt, never raw IP
 *   user_agent  TEXT,
 *   referer     TEXT,
 *   clicked_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
 * );
 *
 * CREATE INDEX idx_clicks_deal ON affiliate_clicks(deal_id);
 * CREATE INDEX idx_clicks_at   ON affiliate_clicks(clicked_at);
 * CREATE INDEX idx_clicks_src  ON affiliate_clicks(source);
 *
 * -- RLS (service_role bypasses RLS, so policy is optional)
 * ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "service_role full access" ON affiliate_clicks
 *   FOR ALL USING (auth.role() = 'service_role');
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js';

let _sb: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (_sb) return _sb;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _sb;
}

async function hashIp(ip: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + ip);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

export interface ClickEvent {
  dealId: string;
  source: string;
  destination: string;
  ip: string;
  userAgent: string;
  referer?: string;
}

const IP_SALT = (process.env.CLICK_IP_SALT as string | undefined) ?? 'vf-click-salt-2026';

// Supabase-generated types don't know about affiliate_clicks yet (table must be
// created in Supabase). Using `any` cast until the schema is registered.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any;

/**
 * Log a click event to Supabase (fire-and-forget).
 * Errors are swallowed — this must never block the redirect.
 */
export async function logClick(event: ClickEvent): Promise<void> {
  try {
    const sb = getSupabase() as Sb | null;
    if (!sb) return;

    const ipHash = await hashIp(event.ip, IP_SALT);

    // Fire-and-forget: do NOT await. Never blocks the redirect.
    sb.from('affiliate_clicks').insert({
      deal_id: event.dealId,
      source: event.source,
      destination: event.destination,
      ip_hash: ipHash,
      user_agent: event.userAgent.slice(0, 200),
      referer: event.referer ?? null,
      clicked_at: new Date().toISOString(),
    }).then(({ error }: { error: unknown }) => {
      if (error) {
        console.error('[ClickLogger] Insert failed:', error);
      }
    });
  } catch {
    // Swallow all errors — logging must never affect user experience
  }
}
