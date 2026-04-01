/**
 * Local Dashboard Failure Insights — /api/internal/dashboard/failure-insights
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
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await sb
      .from('dead_letters')
      .select('id, error_message, source_type, retry_count, status, created_at')
      .eq('status', 'failed')
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    // Group by error_message
    const grouped: Record<string, { count: number; last_occurrence: string; error_message: string }> = {};
    for (const row of (data ?? [])) {
      const key = row.error_message || 'Unknown error';
      if (!grouped[key]) {
        grouped[key] = { count: 0, last_occurrence: row.created_at, error_message: key };
      }
      grouped[key].count++;
      if (row.created_at > grouped[key].last_occurrence) {
        grouped[key].last_occurrence = row.created_at;
      }
    }

    const insights = Object.values(grouped).map((item) => ({
      error_type: item.error_message.substring(0, 50),
      error_message: item.error_message,
      count: item.count,
      percentage: 100,
      last_occurrence: item.last_occurrence,
      affected_entities: [],
    }));

    return NextResponse.json({
      ok: true,
      status: 'success',
      data: {
        insights,
        newFailures24h: insights.reduce((sum: number, i: any) => sum + i.count, 0),
        maxCount: insights.length || 1,
        trends: {
          crawl: { count: 0 },
          publish: { count: 0 },
          ai_content: { count: 0 },
          worker: { count: 0 },
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
