/**
 * Date Formatters
 *
 * Utilities for formatting dates and times.
 */

import { format, formatDistanceToNow, formatDuration, parseISO, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Format date to readable string
 */
export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '-';

  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '-';

  return format(parsed, 'dd/MM/yyyy', { locale: vi });
}

/**
 * Format date with time
 */
export function formatDateTime(date: string | Date | undefined | null): string {
  if (!date) return '-';

  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '-';

  return format(parsed, 'dd/MM/yyyy HH:mm', { locale: vi });
}

/**
 * Format date with seconds
 */
export function formatDateTimeWithSeconds(date: string | Date | undefined | null): string {
  if (!date) return '-';

  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '-';

  return format(parsed, 'dd/MM/yyyy HH:mm:ss', { locale: vi });
}

/**
 * Format as relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date | undefined | null): string {
  if (!date) return '-';

  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '-';

  return formatDistanceToNow(parsed, { addSuffix: true, locale: vi });
}

/**
 * Format duration in seconds to human readable
 */
export function formatDurationSeconds(seconds: number | undefined | null): string {
  if (seconds === undefined || seconds === null) return '-';

  if (seconds < 60) {
    return `${seconds}s`;
  }

  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }

  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format duration in milliseconds to human readable
 */
export function formatDurationMs(ms: number | undefined | null): string {
  if (ms === undefined || ms === null) return '-';
  return formatDurationSeconds(Math.floor(ms / 1000));
}

/**
 * Format time only
 */
export function formatTime(date: string | Date | undefined | null): string {
  if (!date) return '-';

  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '-';

  return format(parsed, 'HH:mm');
}

/**
 * Get time ago in short format
 */
export function formatTimeAgo(date: string | Date | undefined | null): string {
  if (!date) return '-';

  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '-';

  const now = new Date();
  const diffMs = now.getTime() - parsed.getTime();

  if (diffMs < 60000) { // < 1 minute
    return 'vừa xong';
  }

  if (diffMs < 3600000) { // < 1 hour
    const mins = Math.floor(diffMs / 60000);
    return `${mins}ph`;
  }

  if (diffMs < 86400000) { // < 1 day
    const hours = Math.floor(diffMs / 3600000);
    return `${hours}gi`;
  }

  const days = Math.floor(diffMs / 86400000);
  return `${days}ngày`;
}
