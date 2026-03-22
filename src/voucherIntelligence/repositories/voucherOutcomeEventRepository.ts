/**
 * Voucher Outcome Event Repository
 *
 * Database operations for voucher user signal events
 */

import { randomUUID } from 'crypto';
import {
  VoucherOutcomeSignal,
  VoucherOutcomeEventType,
} from '../types/index.js';

// In-memory storage (replace with actual DB calls in production)
const events = new Map<string, VoucherOutcomeSignal>();

/**
 * Create a new event
 */
export async function createEvent(
  params: {
    outcomeId: string;
    eventType: VoucherOutcomeEventType;
    voucherId?: string;
    eventPayload?: Record<string, unknown>;
    eventOrder?: number;
    sessionId?: string;
    userId?: string;
  }
): Promise<VoucherOutcomeSignal> {
  const event: VoucherOutcomeSignal = {
    id: randomUUID(),
    outcomeId: params.outcomeId,
    eventType: params.eventType,
    voucherId: params.voucherId,
    eventPayload: params.eventPayload,
    eventOrder: params.eventOrder,
    sessionId: params.sessionId,
    userId: params.userId,
    createdAt: new Date(),
  };

  events.set(event.id, event);
  return event;
}

/**
 * Get event by ID
 */
export async function getEventById(id: string): Promise<VoucherOutcomeSignal | null> {
  return events.get(id) || null;
}

/**
 * Get events by outcome ID
 */
export async function getEventsByOutcomeId(
  outcomeId: string
): Promise<VoucherOutcomeSignal[]> {
  return Array.from(events.values())
    .filter(e => e.outcomeId === outcomeId)
    .sort((a, b) => (a.eventOrder || 0) - (b.eventOrder || 0));
}

/**
 * Get events by voucher ID
 */
export async function getEventsByVoucherId(
  voucherId: string,
  options?: { limit?: number }
): Promise<VoucherOutcomeSignal[]> {
  const all = Array.from(events.values())
    .filter(e => e.voucherId === voucherId);

  if (options?.limit) {
    return all.slice(0, options.limit);
  }
  return all;
}

/**
 * Get events by event type
 */
export async function getEventsByEventType(
  eventType: VoucherOutcomeEventType,
  options?: { startDate?: Date; endDate?: Date; limit?: number }
): Promise<VoucherOutcomeSignal[]> {
  let filtered = Array.from(events.values())
    .filter(e => e.eventType === eventType);

  if (options?.startDate) {
    filtered = filtered.filter(e => e.createdAt >= options.startDate!);
  }

  if (options?.endDate) {
    filtered = filtered.filter(e => e.createdAt <= options.endDate!);
  }

  if (options?.limit) {
    return filtered.slice(0, options.limit);
  }

  return filtered;
}

/**
 * Get events in time range
 */
export async function getEventsInTimeRange(
  start: Date,
  end: Date,
  eventType?: VoucherOutcomeEventType
): Promise<VoucherOutcomeSignal[]> {
  return Array.from(events.values())
    .filter(e => {
      const inRange = e.createdAt >= start && e.createdAt <= end;
      const matchesType = !eventType || e.eventType === eventType;
      return inRange && matchesType;
    });
}

/**
 * Get event count by type
 */
export async function getEventCountByType(
  start?: Date,
  end?: Date
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  for (const event of events.values()) {
    if (start && event.createdAt < start) continue;
    if (end && event.createdAt > end) continue;

    counts[event.eventType] = (counts[event.eventType] || 0) + 1;
  }

  return counts;
}

/**
 * Delete event
 */
export async function deleteEvent(id: string): Promise<boolean> {
  return events.delete(id);
}

/**
 * Delete events by outcome ID
 */
export async function deleteEventsByOutcomeId(outcomeId: string): Promise<number> {
  const toDelete = Array.from(events.entries())
    .filter(([, e]) => e.outcomeId === outcomeId);

  for (const [id] of toDelete) {
    events.delete(id);
  }

  return toDelete.length;
}

/**
 * Clear all events (for testing)
 */
export async function clearEvents(): Promise<void> {
  events.clear();
}
