/**
 * Public Flow Parity Integration
 * Integrates public platform support states into parity layer
 */

import type {
  PlatformKey,
} from '../types.js';

export interface PublicFlowInput {
  shopeePublicFlowStatus: PublicFlowStatus;
  tiktokPublicFlowStatus: PublicFlowStatus;
}

export interface PublicFlowStatus {
  platform: PlatformKey;
  isEnabled: boolean;
  supportState: 'production' | 'preview' | 'sandbox' | 'disabled';
  featureFlags: Record<string, boolean>;
  lastUpdated: Date;
}

export interface SupportStateDrift {
  area: string;
  shopeeState: string;
  tiktokState: string;
  driftDetected: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Build public flow parity inputs
 */
export async function buildPublicFlowParityInputs(
  input: PublicFlowInput
): Promise<{
  shopee: PublicFlowStatus;
  tiktok: PublicFlowStatus;
  isParity: boolean;
  driftSummary: string;
}> {
  const { shopeePublicFlowStatus, tiktokPublicFlowStatus } = input;

  // Check if states are in parity
  const isParity = shopeePublicFlowStatus.supportState === tiktokPublicFlowStatus.supportState;

  // Build drift summary
  let driftSummary = '';
  if (isParity) {
    driftSummary = `Both platforms are in ${shopeePublicFlowStatus.supportState} state.`;
  } else {
    driftSummary = `State drift detected: Shopee is ${shopeePublicFlowStatus.supportState}, TikTok Shop is ${tiktokPublicFlowStatus.supportState}.`;
  }

  return {
    shopee: shopeePublicFlowStatus,
    tiktok: tiktokPublicFlowStatus,
    isParity,
    driftSummary,
  };
}

/**
 * Build support state drift summary
 */
export async function buildSupportStateDriftSummary(
  shopeeStatus: PublicFlowStatus,
  tiktokStatus: PublicFlowStatus
): Promise<{
  drifts: SupportStateDrift[];
  overallDriftSeverity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}> {
  const drifts: SupportStateDrift[] = [];

  // Check overall state drift
  if (shopeeStatus.supportState !== tiktokStatus.supportState) {
    drifts.push({
      area: 'overall_support_state',
      shopeeState: shopeeStatus.supportState,
      tiktokState: tiktokStatus.supportState,
      driftDetected: true,
      severity: mapStateDriftSeverity(shopeeStatus.supportState, tiktokStatus.supportState),
    });
  }

  // Check feature flag drifts
  const allFlags = new Set([
    ...Object.keys(shopeeStatus.featureFlags),
    ...Object.keys(tiktokStatus.featureFlags),
  ]);

  for (const flag of allFlags) {
    const shopeeEnabled = shopeeStatus.featureFlags[flag] ?? false;
    const tiktokEnabled = tiktokStatus.featureFlags[flag] ?? false;

    if (shopeeEnabled !== tiktokEnabled) {
      drifts.push({
        area: `feature_flag:${flag}`,
        shopeeState: shopeeEnabled ? 'enabled' : 'disabled',
        tiktokState: tiktokEnabled ? 'enabled' : 'disabled',
        driftDetected: true,
        severity: 'medium',
      });
    }
  }

  // Determine overall severity
  const overallDriftSeverity = determineOverallDriftSeverity(drifts);

  // Generate recommendation
  let recommendation = '';
  if (drifts.length === 0) {
    recommendation = 'Public flows are in parity. No action required.';
  } else if (overallDriftSeverity === 'critical' || overallDriftSeverity === 'high') {
    recommendation = 'Significant drift detected. Prioritize alignment of public flow states.';
  } else {
    recommendation = 'Minor drift detected. Monitor and address in upcoming cycle.';
  }

  return { drifts, overallDriftSeverity, recommendation };
}

/**
 * Build cross-platform consumer support summary
 */
export async function buildCrossPlatformConsumerSupportSummary(
  shopeeStatus: PublicFlowStatus,
  tiktokStatus: PublicFlowStatus
): Promise<{
  shopeeConsumerJourney: ConsumerJourneyState;
  tiktokConsumerJourney: ConsumerJourneyState;
  parityAssessment: string;
}> {
  const shopeeConsumerJourney = mapToConsumerJourney(shopeeStatus);
  const tiktokConsumerJourney = mapToConsumerJourney(tiktokStatus);

  // Assess parity
  const journeyParity = assessJourneyParity(shopeeConsumerJourney, tiktokConsumerJourney);

  return {
    shopeeConsumerJourney: shopeeConsumerJourney,
    tiktokConsumerJourney: tiktokConsumerJourney,
    parityAssessment: journeyParity,
  };
}

export interface ConsumerJourneyState {
  canDiscover: boolean;
  canViewDetail: boolean;
  canAddToCart: boolean;
  canCheckout: boolean;
  canTrackOrder: boolean;
}

// Helper functions

function mapStateDriftSeverity(
  shopeeState: string,
  tiktokState: string
): 'critical' | 'high' | 'medium' | 'low' {
  const stateHierarchy = {
    production: 4,
    preview: 3,
    sandbox: 2,
    disabled: 1,
  };

  const shopeeLevel = stateHierarchy[shopeeState as keyof typeof stateHierarchy] ?? 0;
  const tiktokLevel = stateHierarchy[tiktokState as keyof typeof stateHierarchy] ?? 0;
  const diff = Math.abs(shopeeLevel - tiktokLevel);

  if (diff >= 3) return 'critical';
  if (diff >= 2) return 'high';
  if (diff >= 1) return 'medium';
  return 'low';
}

function determineOverallDriftSeverity(drifts: SupportStateDrift[]): 'none' | 'low' | 'medium' | 'high' | 'critical' {
  if (drifts.length === 0) return 'none';

  const severities = drifts.map((d) => d.severity);
  if (severities.includes('critical')) return 'critical';
  if (severities.includes('high')) return 'high';
  if (severities.includes('medium')) return 'medium';
  return 'low';
}

function mapToConsumerJourney(status: PublicFlowStatus): ConsumerJourneyState {
  // Map public flow status to consumer journey stages
  const isEnabled = status.isEnabled;
  const state = status.supportState;

  return {
    canDiscover: isEnabled && (state === 'production' || state === 'preview'),
    canViewDetail: isEnabled && (state === 'production' || state === 'preview'),
    canAddToCart: isEnabled && state === 'production',
    canCheckout: isEnabled && state === 'production',
    canTrackOrder: isEnabled && state === 'production',
  };
}

function assessJourneyParity(
  shopee: ConsumerJourneyState,
  tiktok: ConsumerJourneyState
): string {
  const differences: string[] = [];

  if (shopee.canDiscover !== tiktok.canDiscover) {
    differences.push('discovery');
  }
  if (shopee.canViewDetail !== tiktok.canViewDetail) {
    differences.push('detail view');
  }
  if (shopee.canAddToCart !== tiktok.canAddToCart) {
    differences.push('add to cart');
  }
  if (shopee.canCheckout !== tiktok.canCheckout) {
    differences.push('checkout');
  }
  if (shopee.canTrackOrder !== tiktok.canTrackOrder) {
    differences.push('order tracking');
  }

  if (differences.length === 0) {
    return 'Consumer journeys are in parity across both platforms.';
  }

  return `Consumer journey parity gaps: ${differences.join(', ')}.`;
}
