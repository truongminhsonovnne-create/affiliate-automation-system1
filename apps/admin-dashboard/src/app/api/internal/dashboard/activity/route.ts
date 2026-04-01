/**
 * Local Dashboard Activity Feed — /api/internal/dashboard/activity
 *
 * Returns recent operational events from admin_action_logs.
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET() {
  try {
    const sb = getSupabase();

    // Try admin_action_logs first, fall back to dead_letters
    let items: any[] = [];

    try {
      const { data, error } = await sb
        .from('admin_action_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        items = data.map((row: any) => ({
          id: row.id,
          type: row.action_type || 'system',
          message: `${row.action_type || 'Unknown action'} by ${row.actor_id || 'system'}`,
          entity_type: row.target_type,
          entity_id: row.target_id,
          user_id: row.actor_id,
          created_at: row.created_at,
        }));
      }
    } catch {
      // admin_action_logs may not exist, fall back gracefully
    }

    // Fallback: use dead_letters if no activity logs
    if (items.length === 0) {
      const { data, error } = await sb
        .from('dead_letters')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        items = data.map((row: any) => ({
          id: row.id,
          type: 'dead_letter',
          message: row.error_message || 'Dead letter event',
          entity_type: row.source_type,
          entity_id: row.entity_id,
          created_at: row.created_at,
        }));
      }
    }

    return NextResponse.json({
      ok: true,
      status: 'success',
      data: { items, pagination: { page: 1, pageSize: 20, total: items.length, totalPages: 1 } },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
