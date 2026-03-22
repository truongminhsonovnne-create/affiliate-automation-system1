/**
 * Multi-Platform Foundation API Serializers
 */

import type { PlatformRegistryRecord, PlatformCapabilitySnapshot, PlatformReadinessReview, PlatformExpansionBacklogItem } from '../types.js';
import type {
  PlatformRegistryDto,
  PlatformCapabilitySnapshotDto,
  PlatformReadinessReviewDto,
  PlatformExpansionBacklogItemDto,
} from './types.js';

/**
 * Serialize platform registry to DTO
 */
export function serializePlatformRegistry(record: PlatformRegistryRecord): PlatformRegistryDto {
  return {
    id: record.id,
    platformKey: record.platformKey,
    platformName: record.platformName,
    platformStatus: record.platformStatus,
    supportLevel: record.supportLevel,
    platformType: record.platformType,
    capabilities: record.capabilityPayload,
    governance: record.governanceConfig,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

/**
 * Serialize capability snapshot to DTO
 */
export function serializeCapabilitySnapshot(snapshot: PlatformCapabilitySnapshot): PlatformCapabilitySnapshotDto {
  return {
    id: snapshot.id,
    platformKey: snapshot.platformKey,
    capabilityArea: snapshot.capabilityArea,
    capabilityStatus: snapshot.capabilityStatus,
    capabilityScore: snapshot.capabilityScore,
    capabilityPayload: snapshot.capabilityPayload,
    createdAt: snapshot.createdAt.toISOString(),
  };
}

/**
 * Serialize readiness review to DTO
 */
export function serializeReadinessReview(review: PlatformReadinessReview): PlatformReadinessReviewDto {
  return {
    id: review.id,
    platformKey: review.platformKey,
    reviewType: review.reviewType,
    readinessStatus: review.readinessStatus,
    readinessScore: review.readinessScore as any,
    blockerCount: review.blockerCount,
    warningCount: review.warningCount,
    reviewPayload: review.reviewPayload,
    createdBy: review.createdBy,
    createdAt: review.createdAt.toISOString(),
    finalizedAt: review.finalizedAt?.toISOString() || null,
  };
}

/**
 * Serialize backlog item to DTO
 */
export function serializeBacklogItem(item: PlatformExpansionBacklogItem): PlatformExpansionBacklogItemDto {
  return {
    id: item.id,
    platformKey: item.platformKey,
    backlogType: item.backlogType,
    backlogStatus: item.backlogStatus,
    priority: item.priority,
    backlogPayload: item.backlogPayload,
    assignedTo: item.assignedTo,
    dueAt: item.dueAt?.toISOString() || null,
    createdAt: item.createdAt.toISOString(),
    completedAt: item.completedAt?.toISOString() || null,
  };
}

/**
 * Serialize platform list with summary
 */
export function serializePlatformList(platforms: PlatformRegistryRecord[]) {
  const summary = {
    total: platforms.length,
    active: platforms.filter(p => p.platformStatus === 'active').length,
    preparing: platforms.filter(p => p.platformStatus === 'preparing').length,
    planned: platforms.filter(p => p.platformStatus === 'planned').length,
    bySupportLevel: {} as Record<string, number>,
  };

  for (const platform of platforms) {
    summary.bySupportLevel[platform.supportLevel] = (summary.bySupportLevel[platform.supportLevel] || 0) + 1;
  }

  return {
    platforms: platforms.map(serializePlatformRegistry),
    summary,
  };
}
