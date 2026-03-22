/**
 * Rate Limit Policy Configuration
 * 
 * Defines different rate limit policies per route/cost tier.
 */

import type { PublicRateLimitConfig } from '../types.js';

// =============================================================================
// Route Cost Tiers
// =============================================================================

export enum RouteCostTier {
  /** Lightweight: health checks, static data */
  LOW = 'low',
  
  /** Medium: standard API calls */
  MEDIUM = 'medium',
  
  /** High: expensive operations like AI/crawl/compute */
  HIGH = 'high',
}

// =============================================================================
// Policy Configuration
// =============================================================================

export interface RateLimitPolicy {
  /** Policy name */
  name: string;
  
  /** Cost tier */
  tier: RouteCostTier;
  
  /** Maximum requests per window */
  maxRequests: number;
  
  /** Window size in seconds */
  windowSeconds: number;
  
  /** Enable soft blocking */
  softBlockEnabled: boolean;
  
  /** Soft block threshold (0.0-1.0) */
  softBlockThreshold: number;
  
  /** Burst allowance */
  burstAllowance: number;
  
  /** Cooldown seconds after limit hit */
  cooldownSeconds: number;
}

// =============================================================================
// Default Policies
// =============================================================================

export const RATE_LIMIT_POLICIES: Record<RouteCostTier, RateLimitPolicy> = {
  [RouteCostTier.LOW]: {
    name: 'low-cost',
    tier: RouteCostTier.LOW,
    maxRequests: 300,
    windowSeconds: 60,
    softBlockEnabled: true,
    softBlockThreshold: 0.9,
    burstAllowance: 20,
    cooldownSeconds: 10,
  },
  
  [RouteCostTier.MEDIUM]: {
    name: 'medium-cost',
    tier: RouteCostTier.MEDIUM,
    maxRequests: 60,
    windowSeconds: 60,
    softBlockEnabled: true,
    softBlockThreshold: 0.8,
    burstAllowance: 10,
    cooldownSeconds: 30,
  },
  
  [RouteCostTier.HIGH]: {
    name: 'high-cost',
    tier: RouteCostTier.HIGH,
    maxRequests: 20,
    windowSeconds: 60,
    softBlockEnabled: true,
    softBlockThreshold: 0.7,
    burstAllowance: 3,
    cooldownSeconds: 60,
  },
};

// =============================================================================
// Route to Policy Mapping
// =============================================================================

interface RoutePolicyMapping {
  pattern: RegExp;
  policy: RateLimitPolicy;
}

// Define route patterns and their policies
const ROUTE_POLICIES: RoutePolicyMapping[] = [
  // Health check - LOW cost
  { pattern: /^\/health$/, policy: RATE_LIMIT_POLICIES[RouteCostTier.LOW] },
  { pattern: /^\/api\/v1\/health$/, policy: RATE_LIMIT_POLICIES[RouteCostTier.LOW] },
  
  // Resolution endpoints - HIGH cost (AI/compute intensive)
  { pattern: /^\/api\/v1\/resolve$/, policy: RATE_LIMIT_POLICIES[RouteCostTier.HIGH] },
  { pattern: /^\/api\/v1\/voucher\/resolve$/, policy: RATE_LIMIT_POLICIES[RouteCostTier.HIGH] },
  { pattern: /^\/api\/v1\/analyze$/, policy: RATE_LIMIT_POLICIES[RouteCostTier.HIGH] },
  
  // Standard API - MEDIUM cost
  { pattern: /^\/api\/v1\//, policy: RATE_LIMIT_POLICIES[RouteCostTier.MEDIUM] },
  
  // Default - MEDIUM
  { pattern: /./, policy: RATE_LIMIT_POLICIES[RouteCostTier.MEDIUM] },
];

/**
 * Get policy for a given route path
 */
export function getPolicyForRoute(path: string): RateLimitPolicy {
  for (const mapping of ROUTE_POLICIES) {
    if (mapping.pattern.test(path)) {
      return mapping.policy;
    }
  }
  
  return RATE_LIMIT_POLICIES[RouteCostTier.MEDIUM];
}

/**
 * Convert policy to config for rate limiter.
 * Uses PublicRateLimitConfig (the public-facing subset of RateLimitPolicy).
 */
export function policyToConfig(policy: RateLimitPolicy): Partial<PublicRateLimitConfig> {
  return {
    maxRequests: policy.maxRequests,
    windowSeconds: policy.windowSeconds,
    softBlockEnabled: policy.softBlockEnabled,
    softBlockThreshold: policy.softBlockThreshold,
  };
}

/**
 * Get cost tier for route
 */
export function getCostTier(path: string): RouteCostTier {
  return getPolicyForRoute(path).tier;
}
