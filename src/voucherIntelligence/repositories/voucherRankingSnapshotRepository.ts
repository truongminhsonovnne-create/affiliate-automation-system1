/**
 * Voucher Ranking Snapshot Repository
 */

import { randomUUID } from 'crypto';
import { VoucherRankingSnapshot, RankingWeights } from '../types/index.js';

const snapshots = new Map<string, VoucherRankingSnapshot>();

export async function createSnapshot(params: {
  rankingVersion: string;
  scoringWeights: RankingWeights;
  rankingRules?: Record<string, unknown>;
  policyMetadata?: Record<string, unknown>;
  createdBy?: string;
}): Promise<VoucherRankingSnapshot> {
  const snapshot: VoucherRankingSnapshot = {
    id: randomUUID(),
    rankingVersion: params.rankingVersion,
    scoringWeights: params.scoringWeights,
    rankingRules: params.rankingRules,
    policyMetadata: params.policyMetadata,
    createdBy: params.createdBy,
    createdAt: new Date(),
  };
  snapshots.set(snapshot.id, snapshot);
  return snapshot;
}

export async function getLatestSnapshot(): Promise<VoucherRankingSnapshot | null> {
  const all = Array.from(snapshots.values());
  if (all.length === 0) return null;
  return all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
}

export async function getSnapshotByVersion(version: string): Promise<VoucherRankingSnapshot | null> {
  return Array.from(snapshots.values()).find(s => s.rankingVersion === version) || null;
}

export async function getAllSnapshots(): Promise<VoucherRankingSnapshot[]> {
  return Array.from(snapshots.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
