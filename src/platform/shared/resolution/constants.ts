/**
 * Platform Support State Constants
 *
 * Constants for platform support states, phases, and gate evaluation.
 */

/**
 * Platform identifiers
 */
export const PLATFORMS = {
  SHOPEE: 'shopee',
  TIKTOK_SHOP: 'tiktok_shop',
  LAZADA: 'lazada',
  TOKOPEDIA: 'tokopedia',
} as const;

export type Platform = (typeof PLATFORMS)[keyof typeof PLATFORMS];

/**
 * Platform Support States - ordered by capability level
 */
export const SUPPORT_STATES = {
  UNSUPPORTED: 'unsupported',
  NOT_READY: 'not_ready',
  SANDBOX_ONLY: 'sandbox_only',
  GATED: 'gated',
  PARTIALLY_SUPPORTED: 'partially_supported',
  SUPPORTED: 'supported',
  PRODUCTION_ENABLED: 'production_enabled',
} as const;

/**
 * Support state capability levels (higher = more capable)
 */
export const SUPPORT_STATE_LEVELS: Record<string, number> = {
  [SUPPORT_STATES.UNSUPPORTED]: 0,
  [SUPPORT_STATES.NOT_READY]: 1,
  [SUPPORT_STATES.SANDBOX_ONLY]: 2,
  [SUPPORT_STATES.GATED]: 3,
  [SUPPORT_STATES.PARTIALLY_SUPPORTED]: 4,
  [SUPPORT_STATES.SUPPORTED]: 5,
  [SUPPORT_STATES.PRODUCTION_ENABLED]: 6,
};

/**
 * Platform Enablement Phases
 */
export const ENABLEMENT_PHASES = {
  DISABLED: 'disabled',
  INTERNAL_ONLY: 'internal_only',
  SANDBOX_PREVIEW: 'sandbox_preview',
  LIMITED_PUBLIC_PREVIEW: 'limited_public_preview',
  PRODUCTION_CANDIDATE: 'production_candidate',
  PRODUCTION_ENABLED: 'production_enabled',
} as const;

/**
 * Enablement phase levels (higher = more enabled)
 */
export const ENABLEMENT_PHASE_LEVELS: Record<string, number> = {
  [ENABLEMENT_PHASES.DISABLED]: 0,
  [ENABLEMENT_PHASES.INTERNAL_ONLY]: 1,
  [ENABLEMENT_PHASES.SANDBOX_PREVIEW]: 2,
  [ENABLEMENT_PHASES.LIMITED_PUBLIC_PREVIEW]: 3,
  [ENABLEMENT_PHASES.PRODUCTION_CANDIDATE]: 4,
  [ENABLEMENT_PHASES.PRODUCTION_ENABLED]: 5,
};

/**
 * Gate evaluation thresholds
 */
export const GATE_THRESHOLDS = {
  // Quality scores (0-100)
  MIN_QUALITY_FOR_PRODUCTION: 60,
  MIN_QUALITY_FOR_SANDBOX: 30,
  MIN_QUALITY_FOR_SUPPORTED: 50,

  // Error rates (0-1)
  MAX_ERROR_RATE_FOR_PRODUCTION: 0.1,
  MAX_ERROR_RATE_FOR_SANDBOX: 0.2,
  MAX_ERROR_RATE_FOR_SUPPORTED: 0.15,

  // Health scores (0-1)
  MIN_HEALTH_FOR_PRODUCTION: 0.7,
  MIN_HEALTH_FOR_SANDBOX: 0.4,
  MIN_HEALTH_FOR_SUPPORTED: 0.6,

  // Success rates (0-1)
  MIN_SUCCESS_RATE_FOR_PRODUCTION: 0.85,
  MIN_SUCCESS_RATE_FOR_SANDBOX: 0.7,
  MIN_SUCCESS_RATE_FOR_SUPPORTED: 0.8,
} as const;

/**
 * Resolution route decisions
 */
export const ROUTE_DECISIONS = {
  PRODUCTION: 'production',
  SANDBOX: 'sandbox',
  GATED: 'gated',
  BLOCKED: 'blocked',
} as const;

/**
 * Resolution statuses
 */
export const RESOLUTION_STATUS = {
  SUCCESS: 'success',
  FAILED: 'failed',
  THROTTLED: 'throttled',
  GATED: 'gated',
  BLOCKED: 'blocked',
  UNAVAILABLE: 'unavailable',
} as const;

/**
 * User-facing support level text
 */
export const SUPPORT_LEVEL_TEXT: Record<string, string> = {
  [SUPPORT_STATES.UNSUPPORTED]: 'This platform is not currently supported',
  [SUPPORT_STATES.NOT_READY]: 'This platform is not yet ready for resolution',
  [SUPPORT_STATES.SANDBOX_ONLY]: 'This platform is in sandbox mode',
  [SUPPORT_STATES.GATED]: 'This platform has limited access',
  [SUPPORT_STATES.PARTIALLY_SUPPORTED]: 'This platform has partial support',
  [SUPPORT_STATES.SUPPORTED]: 'This platform is fully supported',
  [SUPPORT_STATES.PRODUCTION_ENABLED]: 'This platform is fully enabled',
};

/**
 * Default gate configurations per platform
 */
export const DEFAULT_GATE_CONFIGS: Record<string, {
  sandboxMaxRequestsPerHour: number;
  sandboxMaxRequestsPerDay: number;
  productionMaxRequestsPerHour: number;
  productionMaxRequestsPerDay: number;
}> = {
  [PLATFORMS.SHOPEE]: {
    sandboxMaxRequestsPerHour: 100,
    sandboxMaxRequestsPerDay: 1000,
    productionMaxRequestsPerHour: 5000,
    productionMaxRequestsPerDay: 100000,
  },
  [PLATFORMS.TIKTOK_SHOP]: {
    sandboxMaxRequestsPerHour: 50,
    sandboxMaxRequestsPerDay: 500,
    productionMaxRequestsPerHour: 1000,
    productionMaxRequestsPerDay: 50000,
  },
  [PLATFORMS.LAZADA]: {
    sandboxMaxRequestsPerHour: 50,
    sandboxMaxRequestsPerDay: 500,
    productionMaxRequestsPerHour: 1000,
    productionMaxRequestsPerDay: 50000,
  },
  [PLATFORMS.TOKOPEDIA]: {
    sandboxMaxRequestsPerHour: 50,
    sandboxMaxRequestsPerDay: 500,
    productionMaxRequestsPerHour: 1000,
    productionMaxRequestsPerDay: 50000,
  },
};

/**
 * Default platform states
 */
export const DEFAULT_PLATFORM_STATES: Record<string, {
  supportState: string;
  enablementPhase: string;
  domainReady: boolean;
  dataFoundationReady: boolean;
  acquisitionReady: boolean;
  resolutionReady: boolean;
  governanceApproved: boolean;
}> = {
  [PLATFORMS.SHOPEE]: {
    supportState: SUPPORT_STATES.PRODUCTION_ENABLED,
    enablementPhase: ENABLEMENT_PHASES.PRODUCTION_ENABLED,
    domainReady: true,
    dataFoundationReady: true,
    acquisitionReady: true,
    resolutionReady: true,
    governanceApproved: true,
  },
  [PLATFORMS.TIKTOK_SHOP]: {
    supportState: SUPPORT_STATES.SANDBOX_ONLY,
    enablementPhase: ENABLEMENT_PHASES.SANDBOX_PREVIEW,
    domainReady: true,
    dataFoundationReady: true,
    acquisitionReady: true,
    resolutionReady: false,
    governanceApproved: false,
  },
  [PLATFORMS.LAZADA]: {
    supportState: SUPPORT_STATES.NOT_READY,
    enablementPhase: ENABLEMENT_PHASES.DISABLED,
    domainReady: false,
    dataFoundationReady: false,
    acquisitionReady: false,
    resolutionReady: false,
    governanceApproved: false,
  },
  [PLATFORMS.TOKOPEDIA]: {
    supportState: SUPPORT_STATES.NOT_READY,
    enablementPhase: ENABLEMENT_PHASES.DISABLED,
    domainReady: false,
    dataFoundationReady: false,
    acquisitionReady: false,
    resolutionReady: false,
    governanceApproved: false,
  },
};

/**
 * Resolution type to feature mapping
 */
export const RESOLUTION_TYPE_FEATURES: Record<string, string[]> = {
  promotion: ['promotion_resolution', 'promotion_validation'],
  product: ['product_resolution', 'product_details'],
  seller: ['seller_resolution', 'seller_details'],
};

/**
 * Check if a support state allows production resolution
 */
export function canUseProduction(state: string): boolean {
  return [
    SUPPORT_STATES.PARTIALLY_SUPPORTED,
    SUPPORT_STATES.SUPPORTED,
    SUPPORT_STATES.PRODUCTION_ENABLED,
  ].includes(state);
}

/**
 * Check if a support state allows sandbox resolution
 */
export function canUseSandbox(state: string): boolean {
  return [
    SUPPORT_STATES.SANDBOX_ONLY,
    SUPPORT_STATES.GATED,
    SUPPORT_STATES.PARTIALLY_SUPPORTED,
    SUPPORT_STATES.SUPPORTED,
    SUPPORT_STATES.PRODUCTION_ENABLED,
  ].includes(state);
}

/**
 * Check if a support state allows any resolution
 */
export function canResolve(state: string): boolean {
  return canUseSandbox(state);
}

/**
 * Get the recommended route based on support state
 */
export function getRecommendedRoute(supportState: string): string {
  if (canUseProduction(supportState)) {
    return ROUTE_DECISIONS.PRODUCTION;
  }
  if (canUseSandbox(supportState)) {
    return ROUTE_DECISIONS.SANDBOX;
  }
  return ROUTE_DECISIONS.BLOCKED;
}

/**
 * Get support state display properties
 */
export function getSupportStateDisplay(state: string): {
  label: string;
  color: string;
  description: string;
  badge: string;
} {
  switch (state) {
    case SUPPORT_STATES.UNSUPPORTED:
      return {
        label: 'Unsupported',
        color: 'gray',
        description: 'This platform is not supported',
        badge: 'gray',
      };
    case SUPPORT_STATES.NOT_READY:
      return {
        label: 'Not Ready',
        color: 'red',
        description: 'Platform identified but not ready',
        badge: 'red',
      };
    case SUPPORT_STATES.SANDBOX_ONLY:
      return {
        label: 'Sandbox Only',
        color: 'yellow',
        description: 'Available in sandbox mode only',
        badge: 'yellow',
      };
    case SUPPORT_STATES.GATED:
      return {
        label: 'Gated',
        color: 'orange',
        description: 'Limited access with approval',
        badge: 'orange',
      };
    case SUPPORT_STATES.PARTIALLY_SUPPORTED:
      return {
        label: 'Partially Supported',
        color: 'blue',
        description: 'Some features supported',
        badge: 'blue',
      };
    case SUPPORT_STATES.SUPPORTED:
      return {
        label: 'Supported',
        color: 'green',
        description: 'Fully supported in production',
        badge: 'green',
      };
    case SUPPORT_STATES.PRODUCTION_ENABLED:
      return {
        label: 'Production Enabled',
        color: 'green',
        description: 'Full production support enabled',
        badge: 'green',
      };
    default:
      return {
        label: 'Unknown',
        color: 'gray',
        description: 'Unknown support state',
        badge: 'gray',
      };
  }
}
