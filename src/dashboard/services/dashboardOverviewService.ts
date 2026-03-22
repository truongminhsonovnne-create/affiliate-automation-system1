/**
 * Dashboard Overview Service
 *
 * High-level service for dashboard overview data.
 */

import { createLogger } from '../../observability/logger/structuredLogger.js';
import { getDashboardOverviewReadModel } from '../readModels/overviewReadModel.js';
import type { DashboardTimeRange, DashboardCustomTimeRange } from '../types.js';

const logger = createLogger({ subsystem: 'dashboard_overview_service' });

/**
 * Get dashboard overview
 */
export async function getDashboardOverview(
  options?: {
    timeRange?: DashboardTimeRange;
    customTimeRange?: DashboardCustomTimeRange;
    useCache?: boolean;
  }
): Promise<{
  cards: any;
  health: any;
  queue: any;
}> {
  const startTime = Date.now();

  try {
    // Parse time range
    let parsedTimeRange: { start: Date; end: Date } | undefined;

    if (options?.customTimeRange) {
      parsedTimeRange = {
        start: new Date(options.customTimeRange.start),
        end: new Date(options.customTimeRange.end),
      };
    } else if (options?.timeRange) {
      const ms = getTimeRangeMs(options.timeRange);
      parsedTimeRange = {
        start: new Date(Date.now() - ms),
        end: new Date(),
      };
    }

    const result = await getDashboardOverviewReadModel({
      timeRange: parsedTimeRange,
      useCache: options?.useCache,
    });

    const queryTimeMs = Date.now() - startTime;
    logger.info('Dashboard overview fetched', { queryTimeMs });

    return result;
  } catch (err) {
    logger.error('Failed to get dashboard overview', err);
    throw err;
  }
}

/**
 * Get time range in milliseconds
 */
function getTimeRangeMs(timeRange: DashboardTimeRange): number {
  const map: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  return map[timeRange] || map['24h'];
}
