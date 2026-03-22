/**
 * Multi-Platform Foundation - Core Types
 *
 * Production-grade type definitions for:
 * - Platform registry and status
 * - Platform capabilities and readiness
 * - Platform expansion backlog
 * - Platform governance
 */

import type { ExecutiveScorecard } from '../bi/types.js';

// ============================================================
// A. Platform Types
// ============================================================

export type CommercePlatform = 'shopee' | 'tiktok_shop' | 'lazada' | 'tokopedia' | 'generic';

export type PlatformStatus = 'planned' | 'preparing' | 'ready' | 'beta' | 'active' | 'deprecated' | 'sunset';

export type PlatformSupportLevel = 'none' | 'discovery' | 'reference' | 'context' | 'promotion' | 'full';

export type PlatformType = 'marketplace' | 'social_commerce' | 'super_app' | 'hybrid';

// ============================================================
// B. Capability Types
// ============================================================

export type PlatformCapabilityArea =
  | 'product_reference_parsing'
  | 'product_context_resolution'
  | 'promotion_rule_modeling'
  | 'public_flow_support'
  | 'commercial_attribution'
  | 'growth_surface_support'
  | 'ops_governance_support'
  | 'bi_readiness_support';

export type PlatformCapabilityStatus =
  | 'not_started'
  | 'in_progress'
  | 'partial'
  | 'complete'
  | 'verified'
  | 'unsupported';

export interface PlatformCapabilityDescriptor {
  area: PlatformCapabilityArea;
  status: PlatformCapabilityStatus;
  score: number; // 0-1
  description: string;
  blockers: string[];
  warnings: string[];
  dependencies: PlatformCapabilityArea[];
}

export interface PlatformCapabilitySnapshot {
  id: string;
  platformKey: string;
  capabilityArea: PlatformCapabilityArea;
  capabilityStatus: PlatformCapabilityStatus;
  capabilityScore: number | null;
  capabilityPayload: Record<string, unknown>;
  createdAt: Date;
}

// ============================================================
// C. Readiness Types
// ============================================================

export type PlatformReadinessStatus = 'not_ready' | 'hold' | 'proceed_cautiously' | 'ready' | 'verified';

export type PlatformReadinessReviewType = 'initial' | 'incremental' | 'pre_launch' | 'post_launch' | 'quarterly';

export interface PlatformReadinessScore {
  overall: number;
  domainModel: number;
  parserReference: number;
  productContext: number;
  promotionRules: number;
  publicFlow: number;
  commercialAttribution: number;
  governance: number;
}

export interface PlatformReadinessReview {
  id: string;
  platformKey: string;
  reviewType: PlatformReadinessReviewType;
  readinessStatus: PlatformReadinessStatus;
  readinessScore: PlatformReadinessScore | null;
  blockerCount: number;
  warningCount: number;
  reviewPayload: Record<string, unknown>;
  createdBy: string | null;
  createdAt: Date;
  finalizedAt: Date | null;
}

export interface PlatformBlocker {
  id: string;
  category: PlatformCapabilityArea;
  severity: 'critical' | 'high' | 'medium';
  title: string;
  description: string;
  blockingCapabilities: PlatformCapabilityArea[];
}

export interface PlatformWarning {
  id: string;
  category: PlatformCapabilityArea;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  affectedAreas: PlatformCapabilityArea[];
}

// ============================================================
// D. Registry Types
// ============================================================

export interface PlatformGovernanceConfig {
  requiresApproval: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  complianceRequirements: string[];
  monitoringEnabled: boolean;
}

export interface PlatformRegistryRecord {
  id: string;
  platformKey: string;
  platformName: string;
  platformStatus: PlatformStatus;
  supportLevel: PlatformSupportLevel;
  platformType: PlatformType;
  capabilityPayload: Record<string, unknown>;
  governanceConfig: PlatformGovernanceConfig | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// E. Backlog Types
// ============================================================

export type PlatformBacklogType =
  | 'capability_gap'
  | 'integration_work'
  | 'testing'
  | 'documentation'
  | 'governance'
  | 'infrastructure';

export type PlatformBacklogStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';

export type PlatformBacklogPriority = 'critical' | 'high' | 'medium' | 'low';

export interface PlatformExpansionBacklogItem {
  id: string;
  platformKey: string;
  backlogType: PlatformBacklogType;
  backlogStatus: PlatformBacklogStatus;
  priority: PlatformBacklogPriority;
  backlogPayload: {
    title: string;
    description: string;
    capabilityArea?: PlatformCapabilityArea;
    estimatedEffort?: string;
    dependencies?: string[];
  };
  assignedTo: string | null;
  dueAt: Date | null;
  createdAt: Date;
  completedAt: Date | null;
}

// ============================================================
// F. Audit Types
// ============================================================

export type PlatformAuditAction =
  | 'platform_registered'
  | 'platform_status_changed'
  | 'capability_updated'
  | 'readiness_review_completed'
  | 'backlog_item_created'
  | 'backlog_item_completed'
  | 'expansion_approved'
  | 'expansion_rejected'
  | 'expansion_holded';

export interface PlatformGovernanceAudit {
  id: string;
  platformKey: string;
  entityType: string;
  entityId: string | null;
  auditAction: PlatformAuditAction;
  actorId: string | null;
  actorRole: string | null;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  rationale: string | null;
  createdAt: Date;
}

// ============================================================
// G. Decision Support Types
// ============================================================

export interface PlatformExpansionRecommendation {
  recommendation: 'proceed' | 'hold' | 'not_ready';
  confidence: number;
  readinessScore: PlatformReadinessScore;
  summary: string;
  blockers: PlatformBlocker[];
  warnings: PlatformWarning[];
  prerequisites: string[];
  risks: string[];
  nextSteps: string[];
}

export interface PlatformPrerequisiteItem {
  capabilityArea: PlatformCapabilityArea;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedEffort: string;
}

// ============================================================
// H. TikTok Shop Specific Types
// ============================================================

export interface TikTokShopReadinessFramework {
  core: {
    productReference: PlatformCapabilityDescriptor;
    productContext: PlatformCapabilityDescriptor;
    promotionRules: PlatformCapabilityDescriptor;
  };
  operational: {
    commercialAttribution: PlatformCapabilityDescriptor;
    opsGovernance: PlatformCapabilityDescriptor;
  };
  userExperience: {
    publicFlow: PlatformCapabilityDescriptor;
    growthSurface: PlatformCapabilityDescriptor;
  };
  overall: PlatformReadinessStatus;
}

// ============================================================
// I. Adapter Types
// ============================================================

export interface PlatformAdapterHealth {
  isHealthy: boolean;
  errors: string[];
  warnings: string[];
  lastCheck: Date;
}

export interface PlatformAdapterResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  platform: CommercePlatform;
  timestamp: Date;
}

// ============================================================
// J. API Types
// ============================================================

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

export interface PlatformCapabilitySnapshotDto {
  id: string;
  platformKey: string;
  capabilityArea: string;
  capabilityStatus: string;
  capabilityScore: number | null;
  capabilityPayload: Record<string, unknown>;
  createdAt: string;
}

export interface PlatformReadinessReviewDto {
  id: string;
  platformKey: string;
  reviewType: string;
  readinessStatus: string;
  readinessScore: PlatformReadinessScore | null;
  blockerCount: number;
  warningCount: number;
  reviewPayload: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
  finalizedAt: string | null;
}

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

export interface PlatformDecisionSupportDto {
  platformKey: string;
  recommendation: string;
  confidence: number;
  readinessScore: PlatformReadinessScore;
  summary: string;
  blockers: Array<{ title: string; description: string }>;
  warnings: Array<{ title: string; description: string }>;
  prerequisites: string[];
  risks: string[];
  nextSteps: string[];
}

// ============================================================
// K. Utility Types
// ============================================================

export interface PlatformResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PlatformQueryParams {
  platformKey?: string;
  status?: PlatformStatus;
  supportLevel?: PlatformSupportLevel;
  limit?: number;
  offset?: number;
}
