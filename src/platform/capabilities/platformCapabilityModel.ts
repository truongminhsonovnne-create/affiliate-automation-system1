/**
 * Platform Capability Model
 *
 * Models capability areas for platform readiness evaluation.
 */

import type {
  PlatformCapabilityArea,
  PlatformCapabilityDescriptor,
  PlatformCapabilityStatus
} from '../types.js';
import { CAPABILITY_AREAS, CAPABILITY_STATUS_PRIORITY } from '../constants.js';

/**
 * Build a complete capability model for a platform
 */
export function buildPlatformCapabilityModel(
  platformKey: string,
  capabilities: Partial<Record<PlatformCapabilityArea, PlatformCapabilityDescriptor>>
): PlatformCapabilityDescriptor[] {
  // Get all defined capability areas
  const allAreas = Object.values(CAPABILITY_AREAS) as PlatformCapabilityArea[];

  return allAreas.map(area => {
    const existing = capabilities[area];
    if (existing) {
      return existing;
    }

    // Default capability model (not started)
    return {
      area,
      status: 'not_started',
      score: 0,
      description: getCapabilityDescription(area),
      blockers: [],
      warnings: [],
      dependencies: getCapabilityDependencies(area),
    };
  });
}

/**
 * Get capability areas with their definitions
 */
export function getPlatformCapabilityAreas(): Array<{
  area: PlatformCapabilityArea;
  name: string;
  description: string;
  dependencies: PlatformCapabilityArea[];
  priority: number;
}> {
  return [
    {
      area: 'product_reference_parsing',
      name: 'Product Reference Parsing',
      description: 'Ability to parse and normalize product references (URLs, IDs, codes) from the platform',
      dependencies: [],
      priority: 1,
    },
    {
      area: 'product_context_resolution',
      name: 'Product Context Resolution',
      description: 'Ability to resolve product details (price, seller, category, images) from the platform',
      dependencies: ['product_reference_parsing'],
      priority: 2,
    },
    {
      area: 'promotion_rule_modeling',
      name: 'Promotion Rule Modeling',
      description: 'Ability to model and evaluate vouchers/coupons/promotions from the platform',
      dependencies: ['product_context_resolution'],
      priority: 3,
    },
    {
      area: 'public_flow_support',
      name: 'Public Flow Support',
      description: 'Ability to support public-facing paste-link flow for the platform',
      dependencies: ['product_reference_parsing', 'product_context_resolution'],
      priority: 4,
    },
    {
      area: 'commercial_attribution',
      name: 'Commercial Attribution',
      description: 'Ability to track and attribute commercial outcomes (clicks, conversions, commissions)',
      dependencies: ['public_flow_support', 'promotion_rule_modeling'],
      priority: 5,
    },
    {
      area: 'growth_surface_support',
      name: 'Growth Surface Support',
      description: 'Ability to create and manage growth surfaces for the platform',
      dependencies: ['public_flow_support'],
      priority: 6,
    },
    {
      area: 'ops_governance_support',
      name: 'Operations & Governance Support',
      description: 'Ability to support operational processes and governance for the platform',
      dependencies: ['commercial_attribution'],
      priority: 7,
    },
    {
      area: 'bi_readiness_support',
      name: 'BI & Reporting Support',
      description: 'Ability to generate BI reports and analytics for the platform',
      dependencies: ['commercial_attribution', 'growth_surface_support'],
      priority: 8,
    },
  ];
}

/**
 * Build capability area summary
 */
export function buildCapabilityAreaSummary(
  capabilities: PlatformCapabilityDescriptor[]
): {
  total: number;
  complete: number;
  partial: number;
  inProgress: number;
  notStarted: number;
  averageScore: number;
} {
  const summary = {
    total: capabilities.length,
    complete: 0,
    partial: 0,
    inProgress: 0,
    notStarted: 0,
    averageScore: 0,
  };

  let totalScore = 0;

  for (const cap of capabilities) {
    totalScore += cap.score;

    switch (cap.status) {
      case 'complete':
      case 'verified':
        summary.complete++;
        break;
      case 'partial':
        summary.partial++;
        break;
      case 'in_progress':
        summary.inProgress++;
        break;
      case 'not_started':
      case 'unsupported':
        summary.notStarted++;
        break;
    }
  }

  summary.averageScore = summary.total > 0 ? totalScore / summary.total : 0;

  return summary;
}

/**
 * Get capability description
 */
function getCapabilityDescription(area: PlatformCapabilityArea): string {
  const descriptions: Record<PlatformCapabilityArea, string> = {
    product_reference_parsing: 'Ability to parse and normalize product references',
    product_context_resolution: 'Ability to resolve product details from the platform',
    promotion_rule_modeling: 'Ability to model and evaluate promotions',
    public_flow_support: 'Ability to support public-facing paste-link flow',
    commercial_attribution: 'Ability to track commercial outcomes',
    growth_surface_support: 'Ability to manage growth surfaces',
    ops_governance_support: 'Ability to support operations and governance',
    bi_readiness_support: 'Ability to generate BI reports',
  };
  return descriptions[area] || 'Unknown capability';
}

/**
 * Get capability dependencies
 */
function getCapabilityDependencies(area: PlatformCapabilityArea): PlatformCapabilityArea[] {
  const dependencies: Record<PlatformCapabilityArea, PlatformCapabilityArea[]> = {
    product_reference_parsing: [],
    product_context_resolution: ['product_reference_parsing'],
    promotion_rule_modeling: ['product_context_resolution'],
    public_flow_support: ['product_reference_parsing', 'product_context_resolution'],
    commercial_attribution: ['public_flow_support', 'promotion_rule_modeling'],
    growth_surface_support: ['public_flow_support'],
    ops_governance_support: ['commercial_attribution'],
    bi_readiness_support: ['commercial_attribution', 'growth_surface_support'],
  };
  return dependencies[area] || [];
}

/**
 * Sort capabilities by dependency order (topological sort)
 */
export function sortCapabilitiesByDependency(
  capabilities: PlatformCapabilityDescriptor[]
): PlatformCapabilityDescriptor[] {
  const sorted: PlatformCapabilityDescriptor[] = [];
  const visited = new Set<string>();
  const inProgress = new Set<string>();

  function visit(cap: PlatformCapabilityDescriptor) {
    if (visited.has(cap.area)) return;
    if (inProgress.has(cap.area)) {
      // Circular dependency - skip
      return;
    }

    inProgress.add(cap.area);

    // Visit dependencies first
    for (const dep of cap.dependencies) {
      const depCap = capabilities.find(c => c.area === dep);
      if (depCap) {
        visit(depCap);
      }
    }

    inProgress.delete(cap.area);
    visited.add(cap.area);
    sorted.push(cap);
  }

  for (const cap of capabilities) {
    visit(cap);
  }

  return sorted;
}

/**
 * Detect capability gaps (missing dependencies)
 */
export function detectCapabilityGaps(
  capabilities: PlatformCapabilityDescriptor[]
): Array<{ area: PlatformCapabilityArea; missingDependencies: PlatformCapabilityArea[] }> {
  const gaps: Array<{ area: PlatformCapabilityArea; missingDependencies: PlatformCapabilityArea[] }> = [];

  for (const cap of capabilities) {
    const missingDeps = cap.dependencies.filter(dep => {
      const depCap = capabilities.find(c => c.area === dep);
      return !depCap || depCap.status === 'not_started' || depCap.status === 'unsupported';
    });

    if (missingDeps.length > 0) {
      gaps.push({ area: cap.area, missingDependencies: missingDeps });
    }
  }

  return gaps;
}
