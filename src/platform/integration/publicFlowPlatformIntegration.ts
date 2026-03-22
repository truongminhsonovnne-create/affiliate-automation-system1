/**
 * Public Flow Platform Integration
 *
 * Integrates public paste-link flow with multi-platform foundation.
 */

import type { CommercePlatform } from '../types.js';
import type { CommerceEntrySurface } from '../contracts/growth.js';
import { normalizeCommerceProductReference } from '../contracts/productReference.js';

/**
 * Resolve public platform context from input
 */
export function resolvePublicPlatformContext(input: string): {
  platform: CommercePlatform | null;
  reference: string;
  isValid: boolean;
  errors: string[];
} {
  const result = normalizeCommerceProductReference(input);

  if (!result.success) {
    return {
      platform: null,
      reference: input,
      isValid: false,
      errors: result.errors,
    };
  }

  return {
    platform: result.platform || null,
    reference: input,
    isValid: true,
    errors: [],
  };
}

/**
 * Build platform-aware public flow state
 */
export function buildPlatformAwarePublicFlowState(params: {
  platform: CommercePlatform;
  input: string;
  device: 'desktop' | 'mobile' | 'tablet';
  country: string;
  referrer?: string;
}): {
  isSupported: boolean;
  platform: CommercePlatform;
  entrySurface: Omit<CommerceEntrySurface, 'timestamp'>;
  supportLevel: 'none' | 'discovery' | 'reference' | 'context' | 'promotion' | 'full';
} {
  const supportLevels: Record<CommercePlatform, 'none' | 'discovery' | 'reference' | 'context' | 'promotion' | 'full'> = {
    shopee: 'full',
    tiktok_shop: 'none',
    lazada: 'none',
    tokopedia: 'none',
    generic: 'none',
  };

  const supportLevel = supportLevels[params.platform];

  return {
    isSupported: supportLevel !== 'none',
    platform: params.platform,
    entrySurface: {
      surfaceId: `public_${params.platform}`,
      platform: params.platform,
      entryType: 'paste_link',
      entryUrl: params.input,
      referrer: params.referrer,
      device: params.device,
      country: params.country,
    },
    supportLevel,
  };
}

/**
 * Evaluate public flow platform support
 */
export function evaluatePublicFlowPlatformSupport(platform: CommercePlatform): {
  isSupported: boolean;
  supportLevel: string;
  missing: string[];
  ready: boolean;
} {
  const supportMatrix: Record<CommercePlatform, { level: string; missing: string[] }> = {
    shopee: {
      level: 'full',
      missing: [],
    },
    tiktok_shop: {
      level: 'none',
      missing: [
        'product_reference_parsing',
        'product_context_resolution',
        'public_flow_ui',
        'attribution_tracking',
      ],
    },
    lazada: {
      level: 'none',
      missing: [
        'product_reference_parsing',
        'product_context_resolution',
      ],
    },
    tokopedia: {
      level: 'none',
      missing: [
        'product_reference_parsing',
        'product_context_resolution',
      ],
    },
    generic: {
      level: 'none',
      missing: ['platform_implementation_required'],
    },
  };

  const support = supportMatrix[platform];

  return {
    isSupported: support.level !== 'none',
    supportLevel: support.level,
    missing: support.missing,
    ready: support.level === 'full',
  };
}
