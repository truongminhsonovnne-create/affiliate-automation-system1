/**
 * Platform-Neutral Growth Surface Contract
 *
 * Standardizes growth surfaces/sources across e-commerce platforms.
 */

import type { CommercePlatform } from '../types.js';

// ============================================================
// A. Growth Surface Types
// ============================================================

export type CommerceSurfaceType = 'search' | 'social' | 'display' | 'affiliate' | 'organic' | 'email' | 'referral';

export type CommerceSurfaceStatus = 'active' | 'paused' | 'degraded' | 'archived';

export type CommerceSurfaceHealth = 'healthy' | 'warning' | 'critical';

export interface CommerceSurfaceMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  cost?: number;
  ctr: number;
  cvr: number;
  roas?: number;
}

export interface CommerceSurfaceGovernanceState {
  isCompliant: boolean;
  complianceIssues: string[];
  lastAuditDate?: Date;
  requiresReview: boolean;
}

export interface CommerceSurfaceUsefulness {
  submitRate: number;
  matchRate: number;
  qualityScore: number;
  userSatisfactionScore?: number;
  conversionQualityScore: number;
}

export interface CommerceGrowthSurface {
  surfaceId: string;
  platform: CommercePlatform;
  surfaceType: CommerceSurfaceType;
  surfaceName: string;
  url?: string;
  status: CommerceSurfaceStatus;
  health: CommerceSurfaceHealth;
  metrics: CommerceSurfaceMetrics;
  usefulness: CommerceSurfaceUsefulness;
  governance: CommerceSurfaceGovernanceState;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// B. Entry Surface Types
// ============================================================

export interface CommerceEntrySurface {
  surfaceId: string;
  platform: CommercePlatform;
  entryType: 'paste_link' | 'search' | 'social' | 'email' | 'direct' | 'referral';
  entryUrl: string;
  referrer?: string;
  utmParameters?: Record<string, string>;
  device: 'desktop' | 'mobile' | 'tablet';
  country: string;
  timestamp: Date;
}

export interface CommerceEntrySession {
  sessionId: string;
  platform: CommercePlatform;
  entries: CommerceEntrySurface[];
  totalEntries: number;
  resolvedEntries: number;
  unresolvedEntries: number;
  startTime: Date;
  endTime?: Date;
}

// ============================================================
// C. Growth Analysis
// ============================================================

export interface PlatformGrowthAnalysis {
  platform: CommercePlatform;
  surfaces: CommerceGrowthSurface[];
  aggregateMetrics: CommerceSurfaceMetrics;
  topPerforming: string[];
  underperforming: string[];
  healthSummary: Record<CommerceSurfaceHealth, number>;
  analysisDate: Date;
}

export interface CommerceGrowthRecommendation {
  surfaceId: string;
  recommendation: 'scale' | 'hold' | 'pause' | 'optimize' | 'archive';
  confidence: number;
  rationale: string;
  expectedImpact: {
    revenue?: number;
    conversions?: number;
    cost?: number;
  };
}

// ============================================================
// D. Surface Factory
// ============================================================

/**
 * Create a platform-neutral growth surface
 */
export function createGrowthSurface(
  platform: CommercePlatform,
  surfaceType: CommerceSurfaceType,
  name: string,
  metrics: Partial<CommerceSurfaceMetrics> = {}
): CommerceGrowthSurface {
  const defaultMetrics: CommerceSurfaceMetrics = {
    impressions: 0,
    clicks: 0,
    conversions: 0,
    revenue: 0,
    ctr: 0,
    cvr: 0,
    ...metrics,
  };

  return {
    surfaceId: `${platform}_${surfaceType}_${Date.now()}`,
    platform,
    surfaceType,
    surfaceName: name,
    status: 'active',
    health: 'healthy',
    metrics: defaultMetrics,
    usefulness: {
      submitRate: 0,
      matchRate: 0,
      qualityScore: 0,
      conversionQualityScore: 0,
    },
    governance: {
      isCompliant: true,
      complianceIssues: [],
      requiresReview: false,
    },
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Evaluate surface health based on metrics
 */
export function evaluateSurfaceHealth(metrics: CommerceSurfaceMetrics): CommerceSurfaceHealth {
  // Calculate composite health score
  const ctrHealth = metrics.ctr >= 0.02 ? 1 : metrics.ctr >= 0.01 ? 0.5 : 0;
  const cvrHealth = metrics.cvr >= 0.05 ? 1 : metrics.cvr >= 0.02 ? 0.5 : 0;
  const roasHealth = metrics.roas ? (metrics.roas >= 3 ? 1 : metrics.roas >= 1 ? 0.5 : 0) : 0.5;

  const healthScore = (ctrHealth + cvrHealth + roasHealth) / 3;

  if (healthScore >= 0.75) return 'healthy';
  if (healthScore >= 0.4) return 'warning';
  return 'critical';
}

/**
 * Evaluate surface usefulness
 */
export function evaluateSurfaceUsefulness(
  submitRate: number,
  matchRate: number,
  conversionRate: number
): CommerceSurfaceUsefulness {
  return {
    submitRate,
    matchRate,
    qualityScore: calculateQualityScore(submitRate, matchRate),
    conversionQualityScore: conversionRate,
  };
}

function calculateQualityScore(submitRate: number, matchRate: number): number {
  // Quality is high when both submit rate and match rate are balanced
  // Too high submit rate with low match = low quality (irrelevant suggestions)
  // Low submit rate with high match = good quality (relevant suggestions)
  if (submitRate === 0) return 0;
  const ratio = matchRate / submitRate;
  return Math.min(ratio, 1);
}

// ============================================================
// E. Surface Validation
// ============================================================

export function validateGrowthSurface(surface: CommerceGrowthSurface): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!surface.surfaceId) errors.push('Surface ID is required');
  if (!surface.platform) errors.push('Platform is required');
  if (!surface.surfaceType) errors.push('Surface type is required');
  if (!surface.surfaceName) errors.push('Surface name is required');

  return { isValid: errors.length === 0, errors };
}

export function validateEntrySurface(entry: CommerceEntrySurface): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!entry.surfaceId) errors.push('Surface ID is required');
  if (!entry.platform) errors.push('Platform is required');
  if (!entry.entryType) errors.push('Entry type is required');
  if (!entry.entryUrl) errors.push('Entry URL is required');

  return { isValid: errors.length === 0, errors };
}

// ============================================================
// F. Growth Result
// ============================================================

export interface PlatformGrowthResult<T> {
  success: boolean;
  data?: T;
  platform: CommercePlatform;
  error?: string;
  timestamp: Date;
}
