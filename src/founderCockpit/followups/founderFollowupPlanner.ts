/**
 * Founder Followup Planner
 */

import type { OperatingFollowupRecord } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export async function buildFounderFollowups(decisions: string[]): Promise<OperatingFollowupRecord[]> {
  return decisions.map(id => ({
    id: uuidv4(),
    sourceType: 'decision',
    sourceId: id,
    status: 'pending' as const,
    priority: 'medium' as const,
    payload: {},
    createdAt: new Date(),
  }));
}

export async function buildImmediateFollowups(): Promise<OperatingFollowupRecord[]> {
  return [];
}

export async function buildNextWeekFollowups(): Promise<OperatingFollowupRecord[]> {
  return [];
}

export async function buildStrategicFollowups(): Promise<OperatingFollowupRecord[]> {
  return [];
}
