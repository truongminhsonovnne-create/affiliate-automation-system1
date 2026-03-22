/**
 * Dashboard Activity Feed Read Model
 *
 * Builds unified activity feed from multiple sources:
 * - System events
 * - Admin actions
 * - Publish lifecycle events
 * - Crawl/AI failures
 */

import { createLogger } from '../../observability/logger/structuredLogger.js';
import type {
  DashboardActivityItem,
  DashboardActivityFeed,
  ActivityType,
  ActivitySeverity,
  ActivitySource,
} from '../types.js';
import { getRecentAdminActions } from '../../controlPlane/repositories/adminActionLogRepository.js';
import { DEFAULT_ACTIVITY_LIMIT, MAX_ACTIVITY_LIMIT } from '../constants.js';

const logger = createLogger({ subsystem: 'dashboard_activity_feed_read_model' });

/**
 * Get Supabase client
 */
async function getSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Database not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Map admin action to activity item
 */
function mapAdminActionToActivityItem(action: any): DashboardActivityItem {
  const severity = mapActionResultToSeverity(action.result_status);
  const type = mapActionTypeToActivityType(action.action_type);

  return {
    id: `admin-${action.id}`,
    type: type || 'admin_action',
    severity,
    source: 'admin',
    title: formatActionTitle(action.action_type),
    message: action.result_summary || `Action ${action.result_status}`,
    timestamp: action.created_at,
    correlationId: action.correlation_id,
    actor: {
      id: action.actor_id,
      role: action.actor_role,
    },
    target: action.target_id
      ? {
          type: action.target_type || 'unknown',
          id: action.target_id,
        }
      : undefined,
    metadata: {
      actionType: action.action_type,
      resultStatus: action.result_status,
    },
  };
}

/**
 * Map action result to severity
 */
function mapActionResultToSeverity(resultStatus?: string): ActivitySeverity {
  switch (resultStatus) {
    case 'success':
      return 'info';
    case 'rejected':
      return 'warning';
    case 'failure':
      return 'error';
    default:
      return 'info';
  }
}

/**
 * Map action type to activity type
 */
function mapActionTypeToActivityType(actionType?: string): ActivityType | null {
  if (!actionType) return null;

  if (actionType.startsWith('crawl.')) return 'crawl_started';
  if (actionType.startsWith('publishing.')) return 'publish_started';
  if (actionType.startsWith('ai.')) return 'ai_enrich_started';
  if (actionType.startsWith('dead_letter.')) return 'dead_letter_created';

  return null;
}

/**
 * Format action type to title
 */
function formatActionTitle(actionType?: string): string {
  if (!actionType) return 'Admin Action';

  const parts = actionType.split('.');
  const operation = parts[parts.length - 1];
  const resource = parts.slice(0, -1).join(' ');

  return `${operation.charAt(0).toUpperCase() + operation.slice(1)} ${resource}`;
}

/**
 * Map system event to activity item
 */
function mapSystemEventToActivityItem(event: any): DashboardActivityItem {
  const type = mapEventTypeToActivityType(event.category);
  const severity = mapEventLevelToSeverity(event.severity);

  return {
    id: `event-${event.id}`,
    type: type || 'system_alert',
    severity,
    source: 'system',
    title: event.operation || 'System Event',
    message: event.message || '',
    timestamp: event.created_at,
    correlationId: event.correlation_id,
    jobId: event.job_id || undefined,
    workerId: event.worker_id || undefined,
    metadata: {
      eventType: event.category,
      severity: event.severity,
      operation: event.operation,
    },
  };
}

/**
 * Map event type to activity type
 */
function mapEventTypeToActivityType(eventType?: string): ActivityType | null {
  if (!eventType) return null;

  const mapping: Record<string, ActivityType> = {
    'crawl.started': 'crawl_started',
    'crawl.completed': 'crawl_completed',
    'crawl.failed': 'crawl_failed',
    'publish.started': 'publish_started',
    'publish.completed': 'publish_completed',
    'publish.failed': 'publish_failed',
    'worker.heartbeat': 'worker_heartbeat',
  };

  return mapping[eventType] || null;
}

/**
 * Map event level to severity
 */
function mapEventLevelToSeverity(level?: string): ActivitySeverity {
  switch (level?.toLowerCase()) {
    case 'error':
      return 'error';
    case 'warn':
    case 'warning':
      return 'warning';
    case 'critical':
      return 'critical';
    default:
      return 'info';
  }
}

/**
 * Get recent operational activity from system events
 */
export async function getRecentOperationalActivity(
  options?: {
    limit?: number;
    timeRange?: { start: Date; end: Date };
    types?: string[];
    severity?: string[];
  }
): Promise<DashboardActivityItem[]> {
  try {
    const supabase = await getSupabaseClient();
    const limit = Math.min(options?.limit || DEFAULT_ACTIVITY_LIMIT, MAX_ACTIVITY_LIMIT);

    let query = supabase
      .from('system_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (options?.timeRange) {
      query = query
        .gte('created_at', options.timeRange.start.toISOString())
        .lte('created_at', options.timeRange.end.toISOString());
    }

    if (options?.types && options.types.length > 0) {
      query = query.in('category', options.types);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(mapSystemEventToActivityItem);
  } catch (err) {
    logger.error('Failed to get recent operational activity', err);
    return [];
  }
}

/**
 * Get recent admin actions activity
 */
export async function getRecentAdminActionsActivity(
  options?: {
    limit?: number;
    timeRange?: { start: Date; end: Date };
    actionTypes?: string[];
  }
): Promise<DashboardActivityItem[]> {
  try {
    const limit = Math.min(options?.limit || DEFAULT_ACTIVITY_LIMIT, MAX_ACTIVITY_LIMIT);

    const actions = await getRecentAdminActions(limit, {
      actionType: options?.actionTypes?.[0] as any,
    });

    // Filter by time range if provided
    let filtered = actions;
    if (options?.timeRange) {
      const start = options.timeRange.start.getTime();
      filtered = actions.filter(
        (a) => new Date(a.created_at).getTime() >= start
      );
    }

    return filtered.map(mapAdminActionToActivityItem);
  } catch (err) {
    logger.error('Failed to get recent admin actions activity', err);
    return [];
  }
}

/**
 * Get recent publishing activity
 */
export async function getRecentPublishingActivity(
  options?: {
    limit?: number;
    timeRange?: { start: Date; end: Date };
    statuses?: string[];
  }
): Promise<DashboardActivityItem[]> {
  try {
    const supabase = await getSupabaseClient();
    const limit = Math.min(options?.limit || DEFAULT_ACTIVITY_LIMIT, MAX_ACTIVITY_LIMIT);

    let query = supabase
      .from('publish_jobs')
      .select('id, status, channel, published_at, created_at, source_metadata')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (options?.timeRange) {
      query = query
        .gte('created_at', options.timeRange.start.toISOString())
        .lte('created_at', options.timeRange.end.toISOString());
    }

    if (options?.statuses && options.statuses.length > 0) {
      query = query.in('status', options.statuses);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((job): DashboardActivityItem => {
      const type = mapPublishStatusToActivityType(job.status);
      const severity = mapPublishStatusToSeverity(job.status);

      return {
        id: `publish-${job.id}`,
        type,
        severity,
        source: 'publisher',
        title: `Publish ${job.status}`,
        message: `Job ${job.status} for channel ${job.channel}`,
        timestamp: job.published_at || job.created_at,
        correlationId: job.source_metadata?.correlationId as string,
        target: {
          type: 'publish_job',
          id: job.id,
          name: job.channel,
        },
      };
    });
  } catch (err) {
    logger.error('Failed to get recent publishing activity', err);
    return [];
  }
}

/**
 * Map publish status to activity type
 */
function mapPublishStatusToActivityType(status?: string): ActivityType {
  switch (status) {
    case 'published':
      return 'publish_completed';
    case 'failed':
      return 'publish_failed';
    case 'publishing':
      return 'publish_started';
    default:
      return 'publish_started';
  }
}

/**
 * Map publish status to severity
 */
function mapPublishStatusToSeverity(status?: string): ActivitySeverity {
  switch (status) {
    case 'published':
      return 'info';
    case 'failed':
      return 'error';
    case 'publishing':
      return 'info';
    default:
      return 'info';
  }
}

/**
 * Get unified dashboard activity feed
 */
export async function getDashboardActivityFeedInternal(
  options?: {
    limit?: number;
    page?: number;
    pageSize?: number;
    timeRange?: { start: Date; end: Date };
    sources?: ActivitySource[];
    severities?: ActivitySeverity[];
    types?: ActivityType[];
  }
): Promise<DashboardActivityFeed> {
  const limit = Math.min(options?.limit || options?.pageSize || DEFAULT_ACTIVITY_LIMIT, MAX_ACTIVITY_LIMIT);
  const page = options?.page || 1;
  const pageSize = options?.pageSize || limit;

  // Fetch from multiple sources in parallel
  const [operational, adminActions, publishing] = await Promise.all([
    options?.sources === undefined || options.sources.includes('system')
      ? getRecentOperationalActivity({ limit, timeRange: options.timeRange })
      : [],
    options?.sources === undefined || options.sources.includes('admin')
      ? getRecentAdminActionsActivity({ limit, timeRange: options.timeRange })
      : [],
    options?.sources === undefined || options.sources.includes('publisher')
      ? getRecentPublishingActivity({ limit, timeRange: options.timeRange })
      : [],
  ]);

  // Merge and sort by timestamp
  let allActivities: DashboardActivityItem[] = [
    ...operational,
    ...adminActions,
    ...publishing,
  ];

  // Filter by types if provided
  if (options?.types && options.types.length > 0) {
    allActivities = allActivities.filter((a) => options.types!.includes(a.type));
  }

  // Filter by severities if provided
  if (options?.severities && options.severities.length > 0) {
    allActivities = allActivities.filter((a) => options.severities!.includes(a.severity));
  }

  // Sort by timestamp descending
  allActivities.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Apply pagination
  const totalItems = allActivities.length;
  const offset = (page - 1) * pageSize;
  const paginatedItems = allActivities.slice(offset, offset + pageSize);

  return {
    items: paginatedItems,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
      hasMore: offset + pageSize < totalItems,
    },
  };
}

/**
 * Get activity feed with simplified options
 * Main export for services to use
 */
export async function getDashboardActivityFeed(
  options?: {
    limit?: number;
    page?: number;
    pageSize?: number;
    timeRange?: { start: Date; end: Date };
    sources?: ActivitySource[];
    severities?: ActivitySeverity[];
    types?: ActivityType[];
  }
): Promise<DashboardActivityFeed> {
  return getDashboardActivityFeedInternal(options);
}
