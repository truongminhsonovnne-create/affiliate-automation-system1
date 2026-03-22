/**
 * Platform-Neutral Commercial Contract
 *
 * Standardizes commercial actions, attribution, and outcomes across e-commerce platforms.
 */

import type { CommercePlatform } from '../types.js';

// ============================================================
// A. Commercial Action Types
// ============================================================

export type CommerceActionType = 'click' | 'view' | 'add_to_cart' | 'purchase' | 'share' | 'review';

export type CommerceAttributionModel = 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'position_based';

export interface CommerceOutboundAction {
  actionId: string;
  actionType: CommerceActionType;
  platform: CommercePlatform;
  surfaceId: string;
  referenceId: string;
  userId?: string;
  sessionId: string;
  attributionId?: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

export interface CommerceClickAttribution {
  clickId: string;
  platform: CommercePlatform;
  surfaceId: string;
  referenceId: string;
  attributionModel: CommerceAttributionModel;
  attributedTo: {
    surfaceId: string;
    touchpoint: string;
    timestamp: Date;
  }[];
  clickUrl: string;
  landingPage?: string;
  timestamp: Date;
}

export interface CommerceConversionOutcome {
  conversionId: string;
  platform: CommercePlatform;
  orderId: string;
  products: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalValue: number;
  currency: string;
  attributionId?: string;
  conversionType: 'sale' | 'lead' | 'signup';
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  timestamp: Date;
}

export interface CommerceCommissionOutcome {
  commissionId: string;
  platform: CommercePlatform;
  conversionId: string;
  affiliateId: string;
  commissionType: 'percentage' | 'fixed' | 'tiered';
  commissionRate?: number;
  commissionAmount: number;
  currency: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  payoutDate?: Date;
  timestamp: Date;
}

// ============================================================
// B. Attribution Context
// ============================================================

export interface CommerceAttributionContext {
  platform: CommercePlatform;
  userId?: string;
  sessionId: string;
  attributionModel: CommerceAttributionModel;
  touchpoints: CommerceAttributionTouchpoint[];
  conversionWindow: {
    start: Date;
    end: Date;
  };
}

export interface CommerceAttributionTouchpoint {
  touchpointId: string;
  surfaceId: string;
  platform: CommercePlatform;
  action: CommerceActionType;
  timestamp: Date;
  value?: number;
}

export interface CommerceAttributionLineage {
  conversionId: string;
  attributionModel: CommerceAttributionModel;
  attributedValue: number;
  attributionBreakdown: Array<{
    surfaceId: string;
    touchpointId: string;
    value: number;
    percentage: number;
  }>;
  attributionScore: number;
  calculatedAt: Date;
}

// ============================================================
// C. Attribution Calculation
// ============================================================

/**
 * Calculate attribution based on model
 */
export function calculateAttribution(
  context: CommerceAttributionContext,
  conversionValue: number
): CommerceAttributionLineage {
  const touchpoints = context.touchpoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  let breakdown: CommerceAttributionLineage['attributionBreakdown'];
  let attributionScore = 0;

  switch (context.attributionModel) {
    case 'first_touch':
      breakdown = calculateFirstTouch(touchpoints, conversionValue);
      attributionScore = touchpoints.length > 0 ? 0.8 : 0;
      break;

    case 'last_touch':
      breakdown = calculateLastTouch(touchpoints, conversionValue);
      attributionScore = touchpoints.length > 0 ? 0.85 : 0;
      break;

    case 'linear':
      breakdown = calculateLinear(touchpoints, conversionValue);
      attributionScore = 0.7;
      break;

    case 'time_decay':
      breakdown = calculateTimeDecay(touchpoints, conversionValue);
      attributionScore = 0.75;
      break;

    case 'position_based':
      breakdown = calculatePositionBased(touchpoints, conversionValue);
      attributionScore = 0.8;
      break;

    default:
      breakdown = calculateLastTouch(touchpoints, conversionValue);
      attributionScore = 0.5;
  }

  return {
    conversionId: context.sessionId,
    attributionModel: context.attributionModel,
    attributedValue: conversionValue,
    attributionBreakdown: breakdown,
    attributionScore,
    calculatedAt: new Date(),
  };
}

function calculateFirstTouch(
  touchpoints: CommerceAttributionTouchpoint[],
  value: number
): CommerceAttributionLineage['attributionBreakdown'] {
  if (touchpoints.length === 0) return [];

  const first = touchpoints[0];
  return [{
    surfaceId: first.surfaceId,
    touchpointId: first.touchpointId,
    value,
    percentage: 100,
  }];
}

function calculateLastTouch(
  touchpoints: CommerceAttributionTouchpoint[],
  value: number
): CommerceAttributionLineage['attributionBreakdown'] {
  if (touchpoints.length === 0) return [];

  const last = touchpoints[touchpoints.length - 1];
  return [{
    surfaceId: last.surfaceId,
    touchpointId: last.touchpointId,
    value,
    percentage: 100,
  }];
}

function calculateLinear(
  touchpoints: CommerceAttributionTouchpoint[],
  value: number
): CommerceAttributionLineage['attributionBreakdown'] {
  if (touchpoints.length === 0) return [];

  const valuePerTouch = value / touchpoints.length;
  return touchpoints.map(tp => ({
    surfaceId: tp.surfaceId,
    touchpointId: tp.touchpointId,
    value: valuePerTouch,
    percentage: (valuePerTouch / value) * 100,
  }));
}

function calculateTimeDecay(
  touchpoints: CommerceAttributionTouchpoint[],
  value: number
): CommerceAttributionLineage['attributionBreakdown'] {
  if (touchpoints.length === 0) return [];

  const decayFactor = 0.5; // 7-day half-life
  const now = new Date();

  // Calculate weights based on time decay
  const totalWeight = touchpoints.reduce((sum, tp) => {
    const daysAgo = (now.getTime() - tp.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    const weight = Math.pow(decayFactor, daysAgo / 7);
    return sum + weight;
  }, 0);

  return touchpoints.map(tp => {
    const daysAgo = (now.getTime() - tp.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    const weight = Math.pow(decayFactor, daysAgo / 7);
    const attributedValue = (weight / totalWeight) * value;

    return {
      surfaceId: tp.surfaceId,
      touchpointId: tp.touchpointId,
      value: attributedValue,
      percentage: (attributedValue / value) * 100,
    };
  });
}

function calculatePositionBased(
  touchpoints: CommerceAttributionTouchpoint[],
  value: number
): CommerceAttributionLineage['attributionBreakdown'] {
  if (touchpoints.length === 0) return [];
  if (touchpoints.length === 1) return calculateFirstTouch(touchpoints, value);

  const firstWeight = 0.4;
  const lastWeight = 0.4;
  const middleWeight = 0.2 / (touchpoints.length - 2);

  return touchpoints.map((tp, index) => {
    let weight: number;
    if (index === 0) {
      weight = firstWeight;
    } else if (index === touchpoints.length - 1) {
      weight = lastWeight;
    } else {
      weight = middleWeight;
    }

    return {
      surfaceId: tp.surfaceId,
      touchpointId: tp.touchpointId,
      value: weight * value,
      percentage: weight * 100,
    };
  });
}

// ============================================================
// D. Commercial Validation
// ============================================================

export function validateOutboundAction(action: CommerceOutboundAction): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!action.actionId) errors.push('Action ID is required');
  if (!action.actionType) errors.push('Action type is required');
  if (!action.platform) errors.push('Platform is required');
  if (!action.surfaceId) errors.push('Surface ID is required');
  if (!action.referenceId) errors.push('Reference ID is required');
  if (!action.sessionId) errors.push('Session ID is required');

  return { isValid: errors.length === 0, errors };
}

export function validateConversionOutcome(outcome: CommerceConversionOutcome): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!outcome.conversionId) errors.push('Conversion ID is required');
  if (!outcome.platform) errors.push('Platform is required');
  if (!outcome.orderId) errors.push('Order ID is required');
  if (!outcome.products || outcome.products.length === 0) errors.push('Products are required');
  if (!outcome.totalValue) errors.push('Total value is required');

  return { isValid: errors.length === 0, errors };
}

// ============================================================
// E. Commercial Result
// ============================================================

export interface PlatformCommercialResult<T> {
  success: boolean;
  data?: T;
  platform: CommercePlatform;
  error?: string;
  timestamp: Date;
}
