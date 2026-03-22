/**
 * Growth Platform Integration
 *
 * Integrates growth engine with multi-platform foundation.
 */

import type { CommercePlatform } from '../types.js';
import type { CommerceGrowthSurface } from '../contracts/growth.js';

/**
 * Build platform-aware growth surface context
 */
export function buildPlatformAwareGrowthSurfaceContext(params: {
  platform: CommercePlatform;
  surfaceType: string;
  surfaceName: string;
}): {
  platform: CommercePlatform;
  surfaceType: string;
  surfaceName: string;
  isSupported: boolean;
} {
  const isSupported = params.platform === 'shopee'; // Only Shopee is supported for now

  return {
    platform: params.platform,
    surfaceType: params.surfaceType,
    surfaceName: params.surfaceName,
    isSupported,
  };
}

/**
 * Evaluate growth surface platform support
 */
export function evaluateGrowthSurfacePlatformSupport(platform: CommercePlatform): {
  isSupported: boolean;
  surfaceTypes: string[];
  missing: string[];
  ready: boolean;
} {
  const supportMatrix: Record<CommercePlatform, { supported: boolean; types: string[]; missing: string[] }> = {
    shopee: {
      supported: true,
      types: ['search', 'social', 'affiliate', 'organic'],
      missing: [],
    },
    tiktok_shop: {
      supported: false,
      types: [],
      missing: [
        'surface_discovery',
        'surface_creation',
        'surface_tracking',
      ],
    },
    lazada: {
      supported: false,
      types: [],
      missing: ['implementation_required'],
    },
    tokopedia: {
      supported: false,
      types: [],
      missing: ['implementation_required'],
    },
    generic: {
      supported: false,
      types: [],
      missing: ['platform_implementation_required'],
    },
  };

  const support = supportMatrix[platform];

  return {
    isSupported: support.supported,
    surfaceTypes: support.types,
    missing: support.missing,
    ready: support.supported && support.missing.length === 0,
  };
}

/**
 * Build platform expansion surface signals
 */
export function buildPlatformExpansionSurfaceSignals(platform: CommercePlatform): {
  platform: CommercePlatform;
  signals: Array<{ type: string; message: string; severity: 'info' | 'warning' | 'critical' }>;
} {
  const signals: Array<{ type: string; message: string; severity: 'info' | 'warning' | 'critical' }> = [];

  switch (platform) {
    case 'shopee':
      signals.push({
        type: 'platform_active',
        message: 'Shopee is fully operational',
        severity: 'info',
      });
      break;

    case 'tiktok_shop':
      signals.push({
        type: 'platform_not_ready',
        message: 'TikTok Shop growth surfaces not implemented',
        severity: 'critical',
      });
      signals.push({
        type: 'capability_gap',
        message: 'Surface creation requires implementation',
        severity: 'warning',
      });
      break;

    default:
      signals.push({
        type: 'platform_unknown',
        message: `Platform ${platform} not registered`,
        severity: 'warning',
      });
  }

  return {
    platform,
    signals,
  };
}
