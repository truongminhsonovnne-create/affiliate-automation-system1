/**
 * Commercial Platform Integration
 *
 * Integrates commercial attribution with multi-platform foundation.
 */

import type { CommercePlatform } from '../types.js';
import type { CommerceAttributionLineage } from '../contracts/commercial.js';

/**
 * Build platform-aware commercial context
 */
export function buildPlatformAwareCommercialContext(params: {
  platform: CommercePlatform;
  sessionId: string;
  userId?: string;
  attributionModel?: string;
}): {
  platform: CommercePlatform;
  sessionId: string;
  userId?: string;
  attributionModel: string;
} {
  return {
    platform: params.platform,
    sessionId: params.sessionId,
    userId: params.userId,
    attributionModel: params.attributionModel || 'last_touch',
  };
}

/**
 * Build platform-aware attribution lineage
 */
export function buildPlatformAwareAttributionLineage(params: {
  platform: CommercePlatform;
  conversionId: string;
  attributionModel: string;
  touchpoints: Array<{ surfaceId: string; value: number; timestamp: Date }>;
}): CommerceAttributionLineage {
  const totalValue = params.touchpoints.reduce((sum, tp) => sum + tp.value, 0);

  return {
    conversionId: params.conversionId,
    attributionModel: params.attributionModel as any,
    attributedValue: totalValue,
    attributionBreakdown: params.touchpoints.map(tp => ({
      surfaceId: tp.surfaceId,
      touchpointId: `${tp.surfaceId}_${tp.timestamp.getTime()}`,
      value: tp.value,
      percentage: totalValue > 0 ? (tp.value / totalValue) * 100 : 0,
    })),
    attributionScore: 0.8,
    calculatedAt: new Date(),
  };
}

/**
 * Evaluate platform commercial support
 */
export function evaluatePlatformCommercialSupport(platform: CommercePlatform): {
  isSupported: boolean;
  attributionModels: string[];
  missing: string[];
  ready: boolean;
} {
  const supportMatrix: Record<CommercePlatform, { supported: boolean; models: string[]; missing: string[] }> = {
    shopee: {
      supported: true,
      models: ['first_touch', 'last_touch', 'linear', 'time_decay', 'position_based'],
      missing: [],
    },
    tiktok_shop: {
      supported: false,
      models: [],
      missing: [
        'click_tracking',
        'conversion_tracking',
        'commission_calculation',
        'attribution_modeling',
      ],
    },
    lazada: {
      supported: false,
      models: [],
      missing: ['implementation_required'],
    },
    tokopedia: {
      supported: false,
      models: [],
      missing: ['implementation_required'],
    },
    generic: {
      supported: false,
      models: [],
      missing: ['platform_specific_implementation_required'],
    },
  };

  const support = supportMatrix[platform];

  return {
    isSupported: support.supported,
    attributionModels: support.models,
    missing: support.missing,
    ready: support.supported && support.missing.length === 0,
  };
}
