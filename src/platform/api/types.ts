/**
 * Multi-Platform Foundation API Types - DTOs
 */

import type { PlatformRegistryRecord, PlatformCapabilitySnapshot, PlatformReadinessReview, PlatformExpansionBacklogItem, PlatformExpansionRecommendation } from '../types.js';

// Platform Registry DTOs
export interface PlatformRegistryDto {
  id: string;
  platformKey: string;
  platformName: string;
  platformStatus: string;
  supportLevel: string;
  platformType: string;
  capabilities: Record<string, unknown>;
  governance: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformRegistryListDto {
  platforms: PlatformRegistryDto[];
  summary: {
    total: number;
    active: number;
    preparing: number;
    planned: number;
    bySupportLevel: Record<string, number>;
  };
}

// Capability DTOs
export interface PlatformCapabilitySnapshotDto {
  id: string;
  platformKey: string;
  capabilityArea: string;
  capabilityStatus: string;
  capabilityScore: number | null;
  capabilityPayload: Record<string, unknown>;
  createdAt: string;
}

export interface PlatformCapabilityListDto {
  platformKey: string;
  capabilities: PlatformCapabilitySnapshotDto[];
  summary: {
    total: number;
    complete: number;
    partial: number;
    inProgress: number;
    notStarted: number;
    averageScore: number;
  };
}

// Readiness DTOs
export interface PlatformReadinessReviewDto {
  id: string;
  platformKey: string;
  reviewType: string;
  readinessStatus: string;
  readinessScore: Record<string, number> | null;
  blockerCount: number;
  warningCount: number;
  reviewPayload: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
  finalizedAt: string | null;
}

export interface PlatformReadinessSummaryDto {
  platformKey: string;
  status: string;
  score: Record<string, number>;
  blockers: Array<{ title: string; description: string; severity: string }>;
  warnings: Array<{ title: string; description: string; severity: string }>;
  summary: string;
}

// Backlog DTOs
export interface PlatformExpansionBacklogItemDto {
  id: string;
  platformKey: string;
  backlogType: string;
  backlogStatus: string;
  priority: string;
  backlogPayload: Record<string, unknown>;
  assignedTo: string | null;
  dueAt: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface PlatformExpansionBacklogDto {
  platformKey: string;
  items: PlatformExpansionBacklogItemDto[];
  summary: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    byPriority: Record<string, number>;
  };
}

// Decision Support DTOs
export interface PlatformDecisionSupportDto {
  platformKey: string;
  recommendation: string;
  confidence: number;
  readinessScore: Record<string, number>;
  summary: string;
  blockers: Array<{ title: string; description: string; category: string }>;
  warnings: Array<{ title: string; description: string; category: string }>;
  prerequisites: string[];
  risks: string[];
  nextSteps: string[];
}

// Foundation Report DTOs
export interface MultiPlatformFoundationReportDto {
  platforms: {
    total: number;
    active: number;
    preparing: number;
    planned: number;
    bySupportLevel: Record<string, number>;
  };
  tiktokShopReadiness: {
    status: string;
    score: Record<string, number>;
    blockers: number;
    warnings: number;
  };
  backlog: {
    total: number;
    pending: number;
    overdue: number;
  };
}

// Request/Response Types
export interface RegisterPlatformRequest {
  platformKey: string;
  platformName: string;
  platformType?: string;
}

export interface UpdatePlatformStatusRequest {
  status: string;
}

export interface RunReadinessReviewRequest {
  reviewType: 'initial' | 'incremental' | 'pre_launch' | 'post_launch' | 'quarterly';
}

export interface CompleteBacklogItemRequest {
  completedBy?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
  };
}

export type PlatformRegistryResponse = ApiResponse<PlatformRegistryDto>;
export type PlatformListResponse = ApiResponse<PlatformRegistryListDto>;
export type CapabilityListResponse = ApiResponse<PlatformCapabilityListDto>;
export type ReadinessReviewResponse = ApiResponse<PlatformReadinessReviewDto>;
export type BacklogResponse = ApiResponse<PlatformExpansionBacklogDto>;
export type DecisionSupportResponse = ApiResponse<PlatformDecisionSupportDto>;
export type FoundationReportResponse = ApiResponse<MultiPlatformFoundationReportDto>;
