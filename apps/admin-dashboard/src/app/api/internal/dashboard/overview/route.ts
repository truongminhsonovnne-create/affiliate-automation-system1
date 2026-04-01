/**
 * Local Dashboard Overview API — /api/internal/dashboard/overview
 *
 * Returns dashboard KPI data by querying Supabase directly.
 * This replaces the Control Plane for Vercel-only deployments.
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

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Run all queries in parallel
    const [
      productsResult,
      publishJobsResult,
      publishJobsTodayResult,
      postsResult,
      deadLettersResult,
      crawlJobsResult,
    ] = await Promise.allSettled([
      // Total products
      sb.from('affiliate_products').select('id', { count: 'exact', head: true }),
      // Active publish jobs (pending + running)
      sb.from('publish_jobs').select('id', { count: 'exact', head: true }).in('status', ['pending', 'running', 'scheduled', 'ready', 'publishing']),
      // Publish jobs today
      sb.from('publish_jobs').select('id', { count: 'exact', head: true }).gte('created_at', yesterday),
      // Total posts
      sb.from('posts').select('id', { count: 'exact', head: true }),
      // Dead letters
      sb.from('dead_letters').select('id', { count: 'exact', head: true }),
      // Recent crawl jobs
      sb.from('crawl_jobs').select('id, status, started_at', { count: 'exact' }).gte('started_at', sevenDaysAgo).order('started_at', { ascending: false }).limit(5),
    ]);

    const productsCount    = productsResult.status === 'fulfilled' ? (productsResult.value.count ?? 0) : 0;
    const activeJobsCount  = publishJobsResult.status === 'fulfilled' ? (publishJobsResult.value.count ?? 0) : 0;
    const jobsTodayCount  = publishJobsTodayResult.status === 'fulfilled' ? (publishJobsTodayResult.value.count ?? 0) : 0;
    const postsCount      = postsResult.status === 'fulfilled' ? (postsResult.value.count ?? 0) : 0;
    const deadLettersCount = deadLettersResult.status === 'fulfilled' ? (deadLettersResult.value.count ?? 0) : 0;
    const crawlJobs       = crawlJobsResult.status === 'fulfilled' ? (crawlJobsResult.value.data ?? []) : [];

    const completedCrawlJobs = crawlJobs.filter((j: any) => j.status === 'completed').length;
    const failedCrawlJobs   = crawlJobs.filter((j: any) => j.status === 'failed').length;

    return NextResponse.json({
      ok: true,
      status: 'success',
      data: {
        totalProducts: productsCount,
        publishJobsToday: jobsTodayCount,
        activeWorkers: 0,
        successRate: crawlJobs.length > 0
          ? Math.round((completedCrawlJobs / crawlJobs.length) * 100)
          : 100,
        pendingJobs: activeJobsCount,
        runningJobs: 0,
        completedJobs: completedCrawlJobs,
        failedJobs: failedCrawlJobs,
        totalJobs: crawlJobs.length,
        shopeeProducts: 0,
        lazadaProducts: 0,
        tiktokProducts: 0,
        tikiProducts: 0,
        totalActivities: 0,
        totalWorkers: 0,
        idleWorkers: 0,
        errorWorkers: 0,
        newFailures24h: deadLettersCount,
        maxCount: deadLettersCount || 1,
        deadLetters: deadLettersCount,
        postsCount,
        trends: {
          crawl: { count: completedCrawlJobs },
          publish: { count: jobsTodayCount },
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
