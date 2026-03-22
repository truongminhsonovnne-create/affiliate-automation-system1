/**
 * Launch Checklist Builder
 * Builds launch hardening checklists
 */

import type {
  LaunchChecklistItem,
  LaunchChecklistStatus,
} from '../types.js';

import { CRITICAL_CHECKLIST_ITEMS, CHECKLIST_CATEGORIES } from '../constants.js';

export interface ChecklistBuildInput {
  includeRuntime?: boolean;
  includePublicFlow?: boolean;
  includeCommercial?: boolean;
  includeGovernance?: boolean;
  includeMultiPlatform?: boolean;
  includeOps?: boolean;
}

/**
 * Build full launch hardening checklist
 */
export async function buildLaunchHardeningChecklist(
  input: ChecklistBuildInput = {}
): Promise<LaunchChecklistItem[]> {
  const items: LaunchChecklistItem[] = [];

  // Runtime hardening
  if (input.includeRuntime !== false) {
    const runtimeItems = await buildRuntimeHardeningChecklist();
    items.push(...runtimeItems);
  }

  // Public flow hardening
  if (input.includePublicFlow !== false) {
    const publicFlowItems = await buildPublicFlowHardeningChecklist();
    items.push(...publicFlowItems);
  }

  // Commercial hardening
  if (input.includeCommercial !== false) {
    const commercialItems = await buildCommercialHardeningChecklist();
    items.push(...commercialItems);
  }

  // Governance hardening
  if (input.includeGovernance !== false) {
    const governanceItems = await buildGovernanceHardeningChecklist();
    items.push(...governanceItems);
  }

  // Multi-platform hardening
  if (input.includeMultiPlatform !== false) {
    const multiPlatformItems = await buildMultiPlatformHardeningChecklist();
    items.push(...multiPlatformItems);
  }

  return items;
}

/**
 * Build runtime hardening checklist
 */
export async function buildRuntimeHardeningChecklist(): Promise<LaunchChecklistItem[]> {
  return [
    {
      itemId: 'runtime_stability_verified',
      itemKey: 'runtime_stability_verified',
      itemLabel: 'Runtime Stability Verified',
      category: CHECKLIST_CATEGORIES.RUNTIME,
      isCritical: true,
      status: 'pending' as LaunchChecklistStatus,
    },
    {
      itemId: 'error_rates_acceptable',
      itemKey: 'error_rates_acceptable',
      itemLabel: 'Error Rates Acceptable',
      category: CHECKLIST_CATEGORIES.RUNTIME,
      isCritical: true,
      status: 'pending' as LaunchChecklistStatus,
    },
    {
      itemId: 'performance_baseline_established',
      itemKey: 'performance_baseline_established',
      itemLabel: 'Performance Baseline Established',
      category: CHECKLIST_CATEGORIES.RUNTIME,
      isCritical: false,
      status: 'pending' as LaunchChecklistStatus,
    },
    {
      itemId: 'memory_leaks_checked',
      itemKey: 'memory_leaks_checked',
      itemLabel: 'Memory Leaks Checked',
      category: CHECKLIST_CATEGORIES.RUNTIME,
      isCritical: false,
      status: 'pending' as LaunchChecklistStatus,
    },
    {
      itemId: 'connection_pool_healthy',
      itemKey: 'connection_pool_healthy',
      itemLabel: 'Connection Pool Healthy',
      category: CHECKLIST_CATEGORIES.RUNTIME,
      isCritical: false,
      status: 'pending' as LaunchChecklistStatus,
    },
  ];
}

/**
 * Build public flow hardening checklist
 */
export async function buildPublicFlowHardeningChecklist(): Promise<LaunchChecklistItem[]> {
  return [
    {
      itemId: 'public_flow_functional',
      itemKey: 'public_flow_functional',
      itemLabel: 'Public Flow Functional',
      category: CHECKLIST_CATEGORIES.PUBLIC_FLOW,
      isCritical: true,
      status: 'pending' as LaunchChecklistStatus,
    },
    {
      itemId: 'paste_link_resolution_works',
      itemKey: 'paste_link_resolution_works',
      itemLabel: 'Paste Link Resolution Works',
      category: CHECKLIST_CATEGORIES.PUBLIC_FLOW,
      isCritical: true,
      status: 'pending' as LaunchChecklistStatus,
    },
    {
      itemId: 'conversion_tracking_verified',
      itemKey: 'conversion_tracking_verified',
      itemLabel: 'Conversion Tracking Verified',
      category: CHECKLIST_CATEGORIES.PUBLIC_FLOW,
      isCritical: true,
      status: 'pending' as LaunchChecklistStatus,
    },
    {
      itemId: 'public_404_handled',
      itemKey: 'public_404_handled',
      itemLabel: 'Public 404 Errors Handled',
      category: CHECKLIST_CATEGORIES.PUBLIC_FLOW,
      isCritical: false,
      status: 'pending' as LaunchChecklistStatus,
    },
    {
      itemId: 'rate_limiting_configured',
      itemKey: 'rate_limiting_configured',
      itemLabel: 'Rate Limiting Configured',
      category: CHECKLIST_CATEGORIES.PUBLIC_FLOW,
      isCritical: false,
      status: 'pending' as LaunchChecklistStatus,
    },
  ];
}

/**
 * Build commercial hardening checklist
 */
export async function buildCommercialHardeningChecklist(): Promise<LaunchChecklistItem[]> {
  return [
    {
      itemId: 'shopee_revenue_safe',
      itemKey: 'shopee_revenue_safe',
      itemLabel: 'Shopee Revenue Safe',
      category: CHECKLIST_CATEGORIES.COMMERCIAL,
      isCritical: true,
      status: 'pending' as LaunchChecklistStatus,
    },
    {
      itemId: 'tiktok_commercial_safe',
      itemKey: 'tiktok_commercial_safe',
      itemLabel: 'TikTok Commercial Safe',
      category: CHECKLIST_CATEGORIES.COMMERCIAL,
      isCritical: true,
      status: 'pending' as LaunchChecklistStatus,
    },
    {
      itemId: 'attribution_accuracy_verified',
      itemKey: 'attribution_accuracy_verified',
      itemLabel: 'Attribution Accuracy Verified',
      category: CHECKLIST_CATEGORIES.COMMERCIAL,
      isCritical: false,
      status: 'pending' as LaunchChecklistStatus,
    },
    {
      itemId: 'pricing_display_correct',
      itemKey: 'pricing_display_correct',
      itemLabel: 'Pricing Display Correct',
      category: CHECKLIST_CATEGORIES.COMMERCIAL,
      isCritical: false,
      status: 'pending' as LaunchChecklistStatus,
    },
  ];
}

/**
 * Build governance hardening checklist
 */
export async function buildGovernanceHardeningChecklist(): Promise<LaunchChecklistItem[]> {
  return [
    {
      itemId: 'quality_gates_passed',
      itemKey: 'quality_gates_passed',
      itemLabel: 'Quality Gates Passed',
      category: CHECKLIST_CATEGORIES.GOVERNANCE,
      isCritical: true,
      status: 'pending' as LaunchChecklistStatus,
    },
    {
      itemId: 'release_readiness_approved',
      itemKey: 'release_readiness_approved',
      itemLabel: 'Release Readiness Approved',
      category: CHECKLIST_CATEGORIES.GOVERNANCE,
      isCritical: true,
      status: 'pending' as LaunchChecklistStatus,
    },
    {
      itemId: 'product_governance_compliant',
      itemKey: 'product_governance_compliant',
      itemLabel: 'Product Governance Compliant',
      category: CHECKLIST_CATEGORIES.GOVERNANCE,
      isCritical: false,
      status: 'pending' as LaunchChecklistStatus,
    },
    {
      itemId: 'security_audit_passed',
      itemKey: 'security_audit_passed',
      itemLabel: 'Security Audit Passed',
      category: CHECKLIST_CATEGORIES.GOVERNANCE,
      isCritical: true,
      status: 'pending' as LaunchChecklistStatus,
    },
  ];
}

/**
 * Build multi-platform hardening checklist
 */
export async function buildMultiPlatformHardeningChecklist(): Promise<LaunchChecklistItem[]> {
  return [
    {
      itemId: 'shopee_production_safe',
      itemKey: 'shopee_production_safe',
      itemLabel: 'Shopee Production Safe',
      category: CHECKLIST_CATEGORIES.MULTI_PLATFORM,
      isCritical: true,
      status: 'pending' as LaunchChecklistStatus,
    },
    {
      itemId: 'tiktok_preview_safe',
      itemKey: 'tiktok_preview_safe',
      itemLabel: 'TikTok Preview Safe',
      category: CHECKLIST_CATEGORIES.MULTI_PLATFORM,
      isCritical: true,
      status: 'pending' as LaunchChecklistStatus,
    },
    {
      itemId: 'platform_parity_acceptable',
      itemKey: 'platform_parity_acceptable',
      itemLabel: 'Platform Parity Acceptable',
      category: CHECKLIST_CATEGORIES.MULTI_PLATFORM,
      isCritical: false,
      status: 'pending' as LaunchChecklistStatus,
    },
    {
      itemId: 'rollback_procedures_tested',
      itemKey: 'rollback_procedures_tested',
      itemLabel: 'Rollback Procedures Tested',
      category: CHECKLIST_CATEGORIES.MULTI_PLATFORM,
      isCritical: true,
      status: 'pending' as LaunchChecklistStatus,
    },
    {
      itemId: 'feature_flag_cleanup_planned',
      itemKey: 'feature_flag_cleanup_planned',
      itemLabel: 'Feature Flag Cleanup Planned',
      category: CHECKLIST_CATEGORIES.MULTI_PLATFORM,
      isCritical: false,
      status: 'pending' as LaunchChecklistStatus,
    },
  ];
}

/**
 * Get critical checklist items
 */
export function getCriticalChecklistItems(): string[] {
  return CRITICAL_CHECKLIST_ITEMS;
}

/**
 * Check if item is critical
 */
export function isChecklistItemCritical(itemId: string): boolean {
  return CRITICAL_CHECKLIST_ITEMS.includes(itemId);
}
