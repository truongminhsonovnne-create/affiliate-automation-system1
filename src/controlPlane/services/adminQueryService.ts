/**
 * Admin Query Service
 *
 * Provides aggregated read-only queries for dashboard and admin overview.
 */

import type { ControlPlaneRequestContext, AdminActionResult, AdminActionLogFilters } from '../types.js';
import { createLogger } from '../../observability/logger/structuredLogger.js';
import { getRecentAdminActions as fetchRecentAdminActions, getActionStatistics } from '../repositories/adminActionLogRepository.js';
import { getPublishJobs } from './publishingOperationsService.js';
import { getDeadLetterRecords } from './deadLetterService.js';

const logger = createLogger({ subsystem: 'admin_query_service' });

/**
 * Get dashboard overview
 */
export async function getDashboardOverview(
  context: ControlPlaneRequestContext
): Promise<AdminActionResult> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return {
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Database not configured' },
        correlationId: context.correlationId,
        actionType: 'admin.dashboard.read',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get publish job counts
    const { data: jobCounts } = await supabase
      .from('publish_jobs')
      .select('status', { count: 'exact', head: true });

    // Get recent publish jobs
    const { data: recentJobs } = await supabase
      .from('publish_jobs')
      .select('id, channel, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    // Get dead letter counts
    const { data: dlCounts } = await supabase
      .from('dead_letter_jobs')
      .select('status', { count: 'exact', head: true });

    // Get active workers count (from heartbeat table)
    const { data: workers } = await supabase
      .from('worker_heartbeats')
      .select('worker_id', { count: 'exact', head: true })
      .gte('last_seen_at', new Date(Date.now() - 60000).toISOString());

    const result = {
      publishJobs: {
        total: jobCounts?.length || 0,
        pending: jobCounts?.filter((j: any) => j.status === 'pending').length || 0,
        ready: jobCounts?.filter((j: any) => j.status === 'ready').length || 0,
        publishing: jobCounts?.filter((j: any) => j.status === 'publishing').length || 0,
        published: jobCounts?.filter((j: any) => j.status === 'published').length || 0,
        failed: jobCounts?.filter((j: any) => j.status === 'failed').length || 0,
      },
      deadLetter: {
        total: dlCounts?.length || 0,
        quarantined: dlCounts?.filter((d: any) => d.status === 'quarantined').length || 0,
        review: dlCounts?.filter((d: any) => d.status === 'review').length || 0,
        resolved: dlCounts?.filter((d: any) => d.status === 'resolved').length || 0,
      },
      workers: {
        active: workers?.length || 0,
      },
      recentJobs: recentJobs || [],
      generatedAt: new Date().toISOString(),
    };

    return {
      success: true,
      data: result,
      correlationId: context.correlationId,
      actionType: 'admin.dashboard.read',
    };
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to get dashboard overview', error, {
      actorId: context.actor?.id || 'unknown'
    });

    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      correlationId: context.correlationId,
      actionType: 'admin.dashboard.read',
    };
  }
}

/**
 * Get recent operational events
 */
export async function getRecentOperationalEvents(
  context: ControlPlaneRequestContext,
  filters?: {
    limit?: number;
    since?: string;
  }
): Promise<AdminActionResult> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return {
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Database not configured' },
        correlationId: context.correlationId,
        actionType: 'admin.events.read',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const limit = filters?.limit || 50;

    // Get recent system events
    let query = supabase
      .from('system_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filters?.since) {
      query = query.gte('created_at', filters.since);
    }

    const { data: events, error } = await query;

    if (error) {
      throw error;
    }

    return {
      success: true,
      data: {
        events: events || [],
        generatedAt: new Date().toISOString(),
      },
      correlationId: context.correlationId,
      actionType: 'admin.events.read',
    };
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to get recent events', error, {
      actorId: context.actor?.id || 'unknown'
    });

    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      correlationId: context.correlationId,
      actionType: 'admin.events.read',
    };
  }
}

/**
 * Get recent admin actions
 */
export async function getRecentAdminActions(
  context: ControlPlaneRequestContext,
  filters?: {
    limit?: number;
    actionType?: string;
    actorId?: string;
  }
): Promise<AdminActionResult> {
  try {
    const logs = await fetchRecentAdminActions(filters?.limit || 20, {
      actionType: filters?.actionType as any,
      actorId: filters?.actorId,
    });

    return {
      success: true,
      data: {
        actions: logs,
        generatedAt: new Date().toISOString(),
      },
      correlationId: context.correlationId,
      actionType: 'admin.actions.read',
    };
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to get recent admin actions', error, {
      actorId: context.actor?.id || 'unknown'
    });

    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      correlationId: context.correlationId,
      actionType: 'admin.actions.read',
    };
  }
}

/**
 * Get job queue overview
 */
export async function getJobQueueOverview(
  context: ControlPlaneRequestContext
): Promise<AdminActionResult> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return {
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Database not configured' },
        correlationId: context.correlationId,
        actionType: 'admin.dashboard.read',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get counts by status and channel
    const { data: jobs } = await supabase
      .from('publish_jobs')
      .select('status, channel, priority');

    // Group by status
    const byStatus: Record<string, number> = {};
    const byChannel: Record<string, Record<string, number>> = {};

    for (const job of jobs || []) {
      byStatus[job.status] = (byStatus[job.status] || 0) + 1;

      if (!byChannel[job.channel]) {
        byChannel[job.channel] = {};
      }
      byChannel[job.channel][job.status] = (byChannel[job.channel][job.status] || 0) + 1;
    }

    // Get oldest pending jobs
    const { data: oldestPending } = await supabase
      .from('publish_jobs')
      .select('id, channel, status, created_at, priority')
      .in('status', ['pending', 'ready'])
      .order('created_at', { ascending: true })
      .limit(10);

    const result = {
      byStatus,
      byChannel,
      oldestPending: oldestPending || [],
      total: jobs?.length || 0,
      generatedAt: new Date().toISOString(),
    };

    return {
      success: true,
      data: result,
      correlationId: context.correlationId,
      actionType: 'admin.dashboard.read',
    };
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to get job queue overview', error, {
      actorId: context.actor?.id || 'unknown'
    });

    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      correlationId: context.correlationId,
      actionType: 'admin.dashboard.read',
    };
  }
}
