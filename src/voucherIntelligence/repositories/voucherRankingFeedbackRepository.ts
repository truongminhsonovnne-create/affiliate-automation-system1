/**
 * Voucher Ranking Feedback Repository
 */

import { randomUUID } from 'crypto';
import { VoucherRankingFeedbackRecord, FeedbackType, FeedbackSource, Platform } from '../types/index.js';

const feedbackRecords = new Map<string, VoucherRankingFeedbackRecord>();

export async function createFeedbackRecord(params: {
  platform: Platform;
  voucherId?: string;
  feedbackType: FeedbackType;
  feedbackScore?: number;
  feedbackContext: Record<string, unknown>;
  source: FeedbackSource;
  metadata?: Record<string, unknown>;
}): Promise<VoucherRankingFeedbackRecord> {
  const record: VoucherRankingFeedbackRecord = {
    id: randomUUID(),
    platform: params.platform,
    voucherId: params.voucherId,
    feedbackType: params.feedbackType,
    feedbackScore: params.feedbackScore,
    feedbackContext: params.feedbackContext,
    source: params.source,
    metadata: params.metadata,
    createdAt: new Date(),
  };
  feedbackRecords.set(record.id, record);
  return record;
}

export async function getFeedbackByVoucherId(voucherId: string): Promise<VoucherRankingFeedbackRecord[]> {
  return Array.from(feedbackRecords.values()).filter(f => f.voucherId === voucherId);
}

export async function getFeedbackByPlatform(platform: Platform): Promise<VoucherRankingFeedbackRecord[]> {
  return Array.from(feedbackRecords.values()).filter(f => f.platform === platform);
}

export async function getRecentFeedback(limit: number = 100): Promise<VoucherRankingFeedbackRecord[]> {
  return Array.from(feedbackRecords.values())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}
