/**
 * Commercial Event Model
 *
 * Production-grade commercial event building and validation.
 * Privacy-safe, typed, with clear lineage.
 */

import { z } from 'zod';
import type {
  CommercialEventType,
  CommercialPlatform,
  GrowthSurfaceType,
  CreateFunnelEventInput,
  CommercialFunnelEvent,
} from '../types.js';

/**
 * Schema for validating commercial event types
 */
export const CommercialEventTypeSchema = z.enum([
  'public_page_view',
  'growth_surface_view',
  'paste_link_submit',
  'resolution_request',
  'resolution_success',
  'resolution_no_match',
  'best_voucher_view',
  'candidate_voucher_view',
  'voucher_copy_success',
  'voucher_copy_failure',
  'open_shopee_click',
  'affiliate_link_click',
  'downstream_conversion_reported',
  'downstream_commission_reported',
]);

/**
 * Schema for creating funnel events
 */
export const CreateFunnelEventSchema = z.object({
  sessionId: z.string().uuid().optional(),
  eventType: CommercialEventTypeSchema,
  platform: z.enum(['public', 'admin', 'api', 'internal']).default('public'),
  voucherId: z.string().uuid().optional(),
  resolutionRequestId: z.string().uuid().optional(),
  surfaceType: z.string().optional(),
  surfaceId: z.string().optional(),
  experimentContext: z.record(z.unknown()).default({}),
  eventPayload: z.record(z.unknown()).default({}),
  eventTime: z.date().optional(),
});

/**
 * Validate commercial event
 */
export function validateCommercialEvent(data: unknown): CreateFunnelEventInput {
  const result = CreateFunnelEventSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid commercial event: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Build a base commercial event
 */
export function buildCommercialEvent(
  eventType: CommercialEventType,
  options?: {
    sessionId?: string;
    platform?: CommercialPlatform;
    voucherId?: string;
    resolutionRequestId?: string;
    surfaceType?: GrowthSurfaceType;
    surfaceId?: string;
    experimentContext?: Record<string, unknown>;
    eventPayload?: Record<string, unknown>;
    eventTime?: Date;
  }
): CreateFunnelEventInput {
  return validateCommercialEvent({
    eventType,
    sessionId: options?.sessionId,
    platform: options?.platform ?? 'public',
    voucherId: options?.voucherId,
    resolutionRequestId: options?.resolutionRequestId,
    surfaceType: options?.surfaceType,
    surfaceId: options?.surfaceId,
    experimentContext: options?.experimentContext ?? {},
    eventPayload: options?.eventPayload ?? {},
    eventTime: options?.eventTime ?? new Date(),
  });
}

/**
 * Build paste_link_submit event
 */
export function buildPasteLinkSubmitEvent(
  options: {
    sessionId?: string;
    platform?: CommercialPlatform;
    surfaceType?: GrowthSurfaceType;
    surfaceId?: string;
    experimentContext?: Record<string, unknown>;
  } & (
    | { resolutionRequestId: string; voucherId?: string }
    | { resolutionRequestId?: string; voucherId?: string }
  )
): CreateFunnelEventInput {
  return buildCommercialEvent('paste_link_submit', {
    sessionId: options.sessionId,
    platform: options.platform,
    resolutionRequestId: options.resolutionRequestId,
    voucherId: options.voucherId,
    surfaceType: options.surfaceType,
    surfaceId: options.surfaceId,
    experimentContext: options.experimentContext,
    eventPayload: {
      submittedAt: new Date().toISOString(),
    },
  });
}

/**
 * Build resolution_success event
 */
export function buildResolutionSuccessEvent(
  options: {
    sessionId?: string;
    platform?: CommercialPlatform;
    resolutionRequestId: string;
    voucherId?: string;
    surfaceType?: GrowthSurfaceType;
    surfaceId?: string;
    experimentContext?: Record<string, unknown>;
  }
): CreateFunnelEventInput {
  return buildCommercialEvent('resolution_success', {
    sessionId: options.sessionId,
    platform: options.platform,
    resolutionRequestId: options.resolutionRequestId,
    voucherId: options.voucherId,
    surfaceType: options.surfaceType,
    surfaceId: options.surfaceId,
    experimentContext: options.experimentContext,
    eventPayload: {
      resolvedAt: new Date().toISOString(),
      hasVoucher: !!options.voucherId,
    },
  });
}

/**
 * Build resolution_no_match event
 */
export function buildResolutionNoMatchEvent(
  options: {
    sessionId?: string;
    platform?: CommercialPlatform;
    resolutionRequestId: string;
    surfaceType?: GrowthSurfaceType;
    surfaceId?: string;
    experimentContext?: Record<string, unknown>;
  }
): CreateFunnelEventInput {
  return buildCommercialEvent('resolution_no_match', {
    sessionId: options.sessionId,
    platform: options.platform,
    resolutionRequestId: options.resolutionRequestId,
    surfaceType: options.surfaceType,
    surfaceId: options.surfaceId,
    experimentContext: options.experimentContext,
    eventPayload: {
      resolvedAt: new Date().toISOString(),
    },
  });
}

/**
 * Build voucher_copy_success event
 */
export function buildVoucherCopyEvent(
  options: {
    sessionId?: string;
    platform?: CommercialPlatform;
    voucherId: string;
    resolutionRequestId?: string;
    surfaceType?: GrowthSurfaceType;
    surfaceId?: string;
    experimentContext?: Record<string, unknown>;
  }
): CreateFunnelEventInput {
  return buildCommercialEvent('voucher_copy_success', {
    sessionId: options.sessionId,
    platform: options.platform,
    voucherId: options.voucherId,
    resolutionRequestId: options.resolutionRequestId,
    surfaceType: options.surfaceType,
    surfaceId: options.surfaceId,
    experimentContext: options.experimentContext,
    eventPayload: {
      copiedAt: new Date().toISOString(),
    },
  });
}

/**
 * Build voucher_copy_failure event
 */
export function buildVoucherCopyFailureEvent(
  options: {
    sessionId?: string;
    platform?: CommercialPlatform;
    voucherId: string;
    failureReason?: string;
    surfaceType?: GrowthSurfaceType;
    surfaceId?: string;
    experimentContext?: Record<string, unknown>;
  }
): CreateFunnelEventInput {
  return buildCommercialEvent('voucher_copy_failure', {
    sessionId: options.sessionId,
    platform: options.platform,
    voucherId: options.voucherId,
    surfaceType: options.surfaceType,
    surfaceId: options.surfaceId,
    experimentContext: options.experimentContext,
    eventPayload: {
      failedAt: new Date().toISOString(),
      failureReason: options.failureReason ?? 'unknown',
    },
  });
}

/**
 * Build open_shopee_click event
 */
export function buildOpenShopeeClickEvent(
  options: {
    sessionId?: string;
    platform?: CommercialPlatform;
    voucherId: string;
    surfaceType?: GrowthSurfaceType;
    surfaceId?: string;
    experimentContext?: Record<string, unknown>;
  }
): CreateFunnelEventInput {
  return buildCommercialEvent('open_shopee_click', {
    sessionId: options.sessionId,
    platform: options.platform,
    voucherId: options.voucherId,
    surfaceType: options.surfaceType,
    surfaceId: options.surfaceId,
    experimentContext: options.experimentContext,
    eventPayload: {
      clickedAt: new Date().toISOString(),
      targetUrl: 'shopee',
    },
  });
}

/**
 * Build affiliate_link_click event
 */
export function buildAffiliateClickEvent(
  options: {
    sessionId?: string;
    platform?: CommercialPlatform;
    voucherId?: string;
    clickKey: string;
    surfaceType?: GrowthSurfaceType;
    surfaceId?: string;
    experimentContext?: Record<string, unknown>;
  }
): CreateFunnelEventInput {
  return buildCommercialEvent('affiliate_link_click', {
    sessionId: options.sessionId,
    platform: options.platform,
    voucherId: options.voucherId,
    surfaceType: options.surfaceType,
    surfaceId: options.surfaceId,
    experimentContext: options.experimentContext,
    eventPayload: {
      clickedAt: new Date().toISOString(),
      clickKey: options.clickKey,
    },
  });
}

/**
 * Build downstream_conversion_reported event
 */
export function buildDownstreamConversionEvent(
  options: {
    sessionId?: string;
    platform?: CommercialPlatform;
    voucherId?: string;
    clickKey?: string;
    externalConversionId?: string;
    revenue?: number;
    commission?: number;
    surfaceType?: GrowthSurfaceType;
    surfaceId?: string;
    experimentContext?: Record<string, unknown>;
  }
): CreateFunnelEventInput {
  return buildCommercialEvent('downstream_conversion_reported', {
    sessionId: options.sessionId,
    platform: options.platform,
    voucherId: options.voucherId,
    surfaceType: options.surfaceType,
    surfaceId: options.surfaceId,
    experimentContext: options.experimentContext,
    eventPayload: {
      conversionTime: new Date().toISOString(),
      externalConversionId: options.externalConversionId,
      revenue: options.revenue,
      commission: options.commission,
      clickKey: options.clickKey,
    },
  });
}

/**
 * Build downstream_commission_reported event
 */
export function buildDownstreamCommissionEvent(
  options: {
    sessionId?: string;
    platform?: CommercialPlatform;
    voucherId?: string;
    clickKey?: string;
    externalConversionId?: string;
    commission?: number;
    surfaceType?: GrowthSurfaceType;
    surfaceId?: string;
    experimentContext?: Record<string, unknown>;
  }
): CreateFunnelEventInput {
  return buildCommercialEvent('downstream_commission_reported', {
    sessionId: options.sessionId,
    platform: options.platform,
    voucherId: options.voucherId,
    surfaceType: options.surfaceType,
    surfaceId: options.surfaceId,
    experimentContext: options.experimentContext,
    eventPayload: {
      commissionTime: new Date().toISOString(),
      externalConversionId: options.externalConversionId,
      commission: options.commission,
      clickKey: options.clickKey,
    },
  });
}

/**
 * Build public_page_view event
 */
export function buildPublicPageViewEvent(
  options: {
    sessionId?: string;
    platform?: CommercialPlatform;
    surfaceType?: GrowthSurfaceType;
    surfaceId?: string;
    experimentContext?: Record<string, unknown>;
  }
): CreateFunnelEventInput {
  return buildCommercialEvent('public_page_view', {
    sessionId: options.sessionId,
    platform: options.platform,
    surfaceType: options.surfaceType,
    surfaceId: options.surfaceId,
    experimentContext: options.experimentContext,
    eventPayload: {
      viewedAt: new Date().toISOString(),
    },
  });
}

/**
 * Build growth_surface_view event
 */
export function buildGrowthSurfaceViewEvent(
  options: {
    sessionId?: string;
    platform?: CommercialPlatform;
    surfaceType: GrowthSurfaceType;
    surfaceId: string;
    experimentContext?: Record<string, unknown>;
  }
): CreateFunnelEventInput {
  return buildCommercialEvent('growth_surface_view', {
    sessionId: options.sessionId,
    platform: options.platform,
    surfaceType: options.surfaceType,
    surfaceId: options.surfaceId,
    experimentContext: options.experimentContext,
    eventPayload: {
      viewedAt: new Date().toISOString(),
    },
  });
}

/**
 * Build best_voucher_view event
 */
export function buildBestVoucherViewEvent(
  options: {
    sessionId?: string;
    platform?: CommercialPlatform;
    voucherId: string;
    surfaceType?: GrowthSurfaceType;
    surfaceId?: string;
    experimentContext?: Record<string, unknown>;
  }
): CreateFunnelEventInput {
  return buildCommercialEvent('best_voucher_view', {
    sessionId: options.sessionId,
    platform: options.platform,
    voucherId: options.voucherId,
    surfaceType: options.surfaceType,
    surfaceId: options.surfaceId,
    experimentContext: options.experimentContext,
    eventPayload: {
      viewedAt: new Date().toISOString(),
    },
  });
}

/**
 * Build candidate_voucher_view event
 */
export function buildCandidateVoucherViewEvent(
  options: {
    sessionId?: string;
    platform?: CommercialPlatform;
    voucherId: string;
    rank?: number;
    surfaceType?: GrowthSurfaceType;
    surfaceId?: string;
    experimentContext?: Record<string, unknown>;
  }
): CreateFunnelEventInput {
  return buildCommercialEvent('candidate_voucher_view', {
    sessionId: options.sessionId,
    platform: options.platform,
    voucherId: options.voucherId,
    surfaceType: options.surfaceType,
    surfaceId: options.surfaceId,
    experimentContext: options.experimentContext,
    eventPayload: {
      viewedAt: new Date().toISOString(),
      rank: options.rank ?? 1,
    },
  });
}

/**
 * Get event type metadata
 */
export function getEventTypeMetadata(eventType: CommercialEventType): {
  stage: string;
  weight: number;
  isConversion: boolean;
  isRevenue: boolean;
} {
  const metadata: Record<CommercialEventType, { stage: string; weight: number; isConversion: boolean; isRevenue: boolean }> = {
    public_page_view: { stage: 'entry', weight: 0.05, isConversion: false, isRevenue: false },
    growth_surface_view: { stage: 'entry', weight: 0.05, isConversion: false, isRevenue: false },
    paste_link_submit: { stage: 'engagement', weight: 0.10, isConversion: false, isRevenue: false },
    resolution_request: { stage: 'resolution', weight: 0.10, isConversion: false, isRevenue: false },
    resolution_success: { stage: 'resolution', weight: 0.15, isConversion: true, isRevenue: false },
    resolution_no_match: { stage: 'resolution', weight: 0.05, isConversion: false, isRevenue: false },
    best_voucher_view: { stage: 'presentation', weight: 0.10, isConversion: false, isRevenue: false },
    candidate_voucher_view: { stage: 'presentation', weight: 0.05, isConversion: false, isRevenue: false },
    voucher_copy_success: { stage: 'conversion', weight: 0.20, isConversion: true, isRevenue: false },
    voucher_copy_failure: { stage: 'conversion', weight: 0.05, isConversion: false, isRevenue: false },
    open_shopee_click: { stage: 'downstream', weight: 0.10, isConversion: true, isRevenue: false },
    affiliate_link_click: { stage: 'downstream', weight: 0.10, isConversion: true, isRevenue: false },
    downstream_conversion_reported: { stage: 'revenue', weight: 0.25, isConversion: true, isRevenue: true },
    downstream_commission_reported: { stage: 'revenue', weight: 0.25, isConversion: true, isRevenue: true },
  };

  return metadata[eventType];
}

/**
 * Check if event type indicates a positive conversion
 */
export function isPositiveConversionEvent(eventType: CommercialEventType): boolean {
  return ['resolution_success', 'voucher_copy_success', 'open_shopee_click', 'affiliate_link_click', 'downstream_conversion_reported'].includes(eventType);
}

/**
 * Check if event type indicates a revenue event
 */
export function isRevenueEvent(eventType: CommercialEventType): boolean {
  return ['downstream_conversion_reported', 'downstream_commission_reported'].includes(eventType);
}
