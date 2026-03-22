/**
 * Cadence Planner
 *
 * Plans continuous improvement cadence runs.
 */

import {
  ProductQualityCadenceType,
} from '../types';
import { CADENCE_CONFIG } from '../constants';

export interface CadencePlan {
  cadenceType: ProductQualityCadenceType;
  periodStart: Date;
  periodEnd: Date;
  description: string;
}

/**
 * Build weekly quality cadence plan
 */
export function buildWeeklyQualityCadence(): CadencePlan {
  const now = new Date();
  const periodEnd = getNextWeekday(CADENCE_CONFIG.WEEKLY_QUALITY.dayOfWeek, CADENCE_CONFIG.WEEKLY_QUALITY.hour);

  // Period starts 7 days before end
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - 7);

  return {
    cadenceType: ProductQualityCadenceType.WEEKLY_QUALITY,
    periodStart,
    periodEnd,
    description: `Weekly quality review covering ${formatDateRange(periodStart, periodEnd)}`,
  };
}

/**
 * Build release cadence plan
 */
export function buildReleaseCadence(releaseDate: Date): CadencePlan {
  const periodStart = new Date(releaseDate);
  periodStart.setHours(0, 0, 0, 0);

  const periodEnd = new Date(releaseDate);
  periodEnd.setHours(23, 59, 59, 999);

  return {
    cadenceType: ProductQualityCadenceType.RELEASE,
    periodStart,
    periodEnd,
    description: `Release readiness review for ${formatDate(releaseDate)}`,
  };
}

/**
 * Build post-release review cadence plan
 */
export function buildPostReleaseReviewCadence(releaseDate: Date): CadencePlan {
  // Post-release review starts after release
  const periodStart = new Date(releaseDate);
  periodStart.setHours(0, 0, 0, 0);

  // And covers the next 24 hours
  const periodEnd = new Date(periodStart);
  periodEnd.setHours(periodEnd.getHours() + CADENCE_CONFIG.POST_RELEASE.REVIEW_WINDOW_HOURS);

  return {
    cadenceType: ProductQualityCadenceType.POST_RELEASE_REVIEW,
    periodStart,
    periodEnd,
    description: `Post-release review for ${formatDate(releaseDate)}`,
  };
}

/**
 * Build monthly governance cadence plan
 */
export function buildMonthlyGovernanceCadence(): CadencePlan {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Start of current month
  const periodStart = new Date(year, month, 1);

  // End of current month
  const periodEnd = new Date(year, month + 1, 0, 23, 59, 59);

  return {
    cadenceType: ProductQualityCadenceType.MONTHLY_GOVERNANCE,
    periodStart,
    periodEnd,
    description: `Monthly governance review for ${getMonthName(month)} ${year}`,
  };
}

/**
 * Get next occurrence of a specific weekday and hour
 */
function getNextWeekday(dayOfWeek: number, hour: number): Date {
  const now = new Date();
  const result = new Date(now);

  result.setHours(hour, 0, 0, 0);

  // Calculate days until next occurrence
  const currentDay = result.getDay();
  let daysUntil = dayOfWeek - currentDay;

  if (daysUntil <= 0) {
    daysUntil += 7; // Next week
  }

  result.setDate(result.getDate() + daysUntil);

  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDateRange(start: Date, end: Date): string {
  return `${formatDate(start)} to ${formatDate(end)}`;
}

function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month];
}
