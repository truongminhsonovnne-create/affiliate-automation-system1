/**
 * Scheduler Module
 *
 * Handles scheduling decisions for publish jobs
 */

import type {
  PublishingChannel,
  PublishScheduleDecision,
  SchedulingOptions,
  ChannelPublishPayload,
  SchedulingMode,
} from './types.js';
import { getChannelPolicy, allowsImmediateScheduling } from './channelPolicies.js';
import {
  SCHEDULING_DEFAULTS,
  SCHEDULING_WINDOWS,
  SLOT_CONFIG,
  getDefaultPriority,
} from './constants.js';
import { log, info, warn, error, debug } from '../utils/logger.js';

// ============================================
// Scheduler
// ============================================

/**
 * Schedule a publish job
 */
export function schedulePublishJob(
  payload: ChannelPublishPayload,
  options?: SchedulingOptions
): PublishScheduleDecision {
  const channel = payload.channel;
  const policy = getChannelPolicy(channel);

  // Determine scheduling mode
  const mode = options?.mode ?? SCHEDULING_DEFAULTS.DEFAULT_MODE;

  // Validate immediate scheduling is allowed
  if (mode === 'immediate' && !allowsImmediateScheduling(channel)) {
    warn(
      { channel },
      'Immediate scheduling not allowed for channel, falling back to delayed'
    );
    return schedulePublishJob(payload, { ...options, mode: 'delayed' });
  }

  switch (mode) {
    case 'immediate':
      return scheduleImmediate(payload, options);

    case 'delayed':
      return scheduleDelayed(payload, options, policy);

    case 'slot_based':
      return scheduleSlotBased(payload, options, policy);

    default:
      return scheduleSlotBased(payload, options, policy);
  }
}

/**
 * Schedule multiple publish jobs
 */
export function schedulePublishJobs(
  payloads: ChannelPublishPayload[],
  options?: SchedulingOptions
): Map<string, PublishScheduleDecision> {
  const results = new Map<string, PublishScheduleDecision>();

  for (const payload of payloads) {
    const decision = schedulePublishJob(payload, options);
    results.set(payload.contentId, decision);
  }

  return results;
}

/**
 * Compute the next available publish slot
 */
export function computeNextPublishSlot(
  channel: PublishingChannel,
  options?: {
    preferredSlot?: Date;
    priority?: number;
  }
): Date {
  const now = new Date();
  const policy = getChannelPolicy(channel);
  const window = SCHEDULING_WINDOWS[channel];

  // If preferred slot is provided and is in the future, use it
  if (options?.preferredSlot && options.preferredSlot > now) {
    const slot = options.preferredSlot;

    // Check if it's within the scheduling window
    if (isWithinSchedulingWindow(slot, window)) {
      return slot;
    }
  }

  // Find next optimal slot
  const nextSlot = findNextOptimalSlot(channel, window, options?.priority);
  return nextSlot;
}

/**
 * Apply scheduling policy to a payload
 */
export function applySchedulingPolicy(
  channel: PublishingChannel,
  payload: ChannelPublishPayload,
  options?: SchedulingOptions
): PublishScheduleDecision {
  return schedulePublishJob(payload, options);
}

// ============================================
// Private Scheduling Functions
// ============================================

/**
 * Schedule for immediate publishing
 */
function scheduleImmediate(
  payload: ChannelPublishPayload,
  options?: SchedulingOptions
): PublishScheduleDecision {
  const now = new Date();

  return {
    scheduled: true,
    scheduledAt: now,
    priority: options?.priority ?? getDefaultPriority(payload.channel),
    mode: 'immediate',
    reason: 'Scheduled for immediate publishing',
    policyUsed: 'immediate',
  };
}

/**
 * Schedule with a delay
 */
function scheduleDelayed(
  payload: ChannelPublishPayload,
  options: SchedulingOptions | undefined,
  policy: ReturnType<typeof getChannelPolicy>
): PublishScheduleDecision {
  const delayMinutes = options?.delayMinutes ?? SCHEDULING_DEFAULTS.DEFAULT_DELAY_MINUTES;
  const now = new Date();

  // Validate delay is within channel constraints
  const minDelay = policy?.schedulingConstraints.minDelayMinutes ?? 10;
  const maxDelay = policy?.schedulingConstraints.maxDelayMinutes ?? 480;

  const validDelay = Math.max(minDelay, Math.min(maxDelay, delayMinutes));

  // Calculate scheduled time
  const scheduledAt = new Date(now.getTime() + validDelay * 60 * 1000);

  // Check if within scheduling window
  const window = SCHEDULING_WINDOWS[payload.channel];
  if (window && !isWithinSchedulingWindow(scheduledAt, window)) {
    // Adjust to next window
    const adjustedTime = adjustToSchedulingWindow(scheduledAt, window);
    return {
      scheduled: true,
      scheduledAt: adjustedTime,
      priority: options?.priority ?? getDefaultPriority(payload.channel),
      mode: 'delayed',
      reason: `Delayed ${validDelay}min, adjusted to within scheduling window`,
      policyUsed: 'delayed_with_window',
    };
  }

  return {
    scheduled: true,
    scheduledAt,
    priority: options?.priority ?? getDefaultPriority(payload.channel),
    mode: 'delayed',
    reason: `Scheduled with ${validDelay} minute delay`,
    policyUsed: 'delayed',
  };
}

/**
 * Schedule based on time slots
 */
function scheduleSlotBased(
  payload: ChannelPublishPayload,
  options: SchedulingOptions | undefined,
  policy: ReturnType<typeof getChannelPolicy>
): PublishScheduleDecision {
  const channel = payload.channel;
  const window = SCHEDULING_WINDOWS[channel];

  // Compute next available slot
  const slot = computeNextPublishSlot(channel, {
    preferredSlot: options?.preferredSlot,
    priority: options?.priority,
  });

  // Determine if immediate or scheduled
  const now = new Date();
  const timeUntilSlot = slot.getTime() - now.getTime();
  const isImmediate = timeUntilSlot <= SLOT_CONFIG.SLOT_DURATION_MINUTES * 60 * 1000;

  if (isImmediate && allowsImmediateScheduling(channel)) {
    return {
      scheduled: true,
      scheduledAt: now,
      priority: options?.priority ?? getDefaultPriority(channel),
      mode: 'immediate',
      reason: 'Scheduled for immediate publishing (within slot)',
      policyUsed: 'slot_based_immediate',
      slotInfo: {
        slotStart: slot,
        slotEnd: new Date(slot.getTime() + SLOT_CONFIG.SLOT_DURATION_MINUTES * 60 * 1000),
        slotIndex: getSlotIndex(slot),
      },
    };
  }

  return {
    scheduled: true,
    scheduledAt: slot,
    priority: options?.priority ?? getDefaultPriority(channel),
    mode: 'slot_based',
    reason: `Scheduled for next available slot`,
    policyUsed: 'slot_based',
    slotInfo: {
      slotStart: slot,
      slotEnd: new Date(slot.getTime() + SLOT_CONFIG.SLOT_DURATION_MINUTES * 60 * 1000),
      slotIndex: getSlotIndex(slot),
    },
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Find the next optimal slot within the scheduling window
 */
function findNextOptimalSlot(
  channel: PublishingChannel,
  window: (typeof SCHEDULING_WINDOWS)[PublishingChannel] | undefined,
  priority?: number
): Date {
  const now = new Date();
  const slotDuration = SLOT_CONFIG.SLOT_DURATION_MINUTES * 60 * 1000;
  const lookahead = SLOT_CONFIG.SLOT_LOOKAHEAD_HOURS * 60 * 60 * 1000;

  // If no window, use any time
  if (!window) {
    return new Date(now.getTime() + SCHEDULING_DEFAULTS.DEFAULT_DELAY_MINUTES * 60 * 1000);
  }

  // Get optimal times
  const optimalTimes = window.optimalSlots;

  // If there are optimal times, find the next one
  if (optimalTimes && optimalTimes.length > 0) {
    for (let i = 0; i < 48; i++) { // Check up to 48 slots (24 hours)
      const candidateTime = new Date(now.getTime() + i * slotDuration);
      const timeString = formatTime(candidateTime);

      if (optimalTimes.includes(timeString)) {
        // Check if within window hours
        const hour = candidateTime.getHours();
        if (hour >= window.startHour && hour <= window.endHour) {
          return candidateTime;
        }
      }
    }
  }

  // Fall back to next available window time
  const nextWindowTime = getNextWindowTime(now, window);
  if (nextWindowTime) {
    return nextWindowTime;
  }

  // Final fallback: schedule with default delay
  return new Date(now.getTime() + SCHEDULING_DEFAULTS.DEFAULT_DELAY_MINUTES * 60 * 1000);
}

/**
 * Get next time within scheduling window
 */
function getNextWindowTime(from: Date, window: { startHour: number; endHour: number }): Date {
  const now = new Date(from);

  // Check if currently within window
  const currentHour = now.getHours();
  if (currentHour >= window.startHour && currentHour <= window.endHour) {
    // Add minimum delay
    return new Date(now.getTime() + SCHEDULING_DEFAULTS.DEFAULT_DELAY_MINUTES * 60 * 1000);
  }

  // Find next window start
  let nextStart = new Date(now);
  nextStart.setHours(window.startHour, 0, 0, 0);

  if (nextStart <= now) {
    // Next day's window
    nextStart.setDate(nextStart.getDate() + 1);
  }

  return nextStart;
}

/**
 * Check if a time is within scheduling window
 */
function isWithinSchedulingWindow(
  time: Date,
  window: { startHour: number; endHour: number } | undefined
): boolean {
  if (!window) return true;

  const hour = time.getHours();
  return hour >= window.startHour && hour <= window.endHour;
}

/**
 * Adjust time to be within scheduling window
 */
function adjustToSchedulingWindow(
  time: Date,
  window: { startHour: number; endHour: number }
): Date {
  const hour = time.getHours();

  if (hour < window.startHour) {
    // Before window starts - move to start
    const adjusted = new Date(time);
    adjusted.setHours(window.startHour, 0, 0, 0);
    return adjusted;
  }

  if (hour > window.endHour) {
    // After window ends - move to next day start
    const adjusted = new Date(time);
    adjusted.setDate(adjusted.getDate() + 1);
    adjusted.setHours(window.startHour, 0, 0, 0);
    return adjusted;
  }

  return time;
}

/**
 * Format time as HH:MM
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Get slot index (for logging/monitoring)
 */
function getSlotIndex(slot: Date): number {
  const startOfDay = new Date(slot);
  startOfDay.setHours(0, 0, 0, 0);
  const slotDuration = SLOT_CONFIG.SLOT_DURATION_MINUTES;
  const minutesSinceMidnight = (slot.getTime() - startOfDay.getTime()) / (60 * 1000);
  return Math.floor(minutesSinceMidnight / slotDuration);
}
