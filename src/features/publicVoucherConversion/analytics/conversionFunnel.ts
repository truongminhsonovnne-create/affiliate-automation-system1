// =============================================================================
// Conversion Funnel Analytics
// Production-grade funnel tracking for conversion optimization
// =============================================================================

import { PublicConversionStep } from '../types';

/**
 * Build conversion funnel step
 */
export function buildConversionFunnelStep(
  step: PublicConversionStep['step']
): PublicConversionStep {
  return {
    step,
    timestamp: Date.now(),
  };
}

/**
 * Record conversion step
 */
export function recordConversionStep(
  steps: PublicConversionStep[],
  newStep: PublicConversionStep
): PublicConversionStep[] {
  // Check if step already recorded
  const existingIndex = steps.findIndex((s) => s.step === newStep.step);

  if (existingIndex >= 0) {
    // Update existing step
    const updated = [...steps];
    updated[existingIndex] = newStep;
    return updated;
  }

  return [...steps, newStep];
}

/**
 * Build voucher flow analytics context
 */
export function buildVoucherFlowAnalyticsContext(params: {
  sessionId: string;
  requestId: string;
  latencyMs: number;
  servedFromCache: boolean;
}): Record<string, unknown> {
  return {
    sessionId: params.sessionId,
    requestId: params.requestId,
    latencyMs: params.latencyMs,
    servedFromCache: params.servedFromCache,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Calculate funnel conversion rate
 */
export function calculateFunnelConversionRate(
  steps: PublicConversionStep[]
): {
  pasteToResolve: number;
  resolveToCopy: number;
  copyToOpen: number;
  overall: number;
} {
  const hasPaste = steps.some((s) => s.step === 'paste');
  const hasResolve = steps.some((s) => s.step === 'resolve_success');
  const hasCopy = steps.some((s) => s.step === 'copy_success');
  const hasOpen = steps.some((s) => s.step === 'open_clicked');

  return {
    pasteToResolve: hasResolve && hasPaste ? 1 : 0,
    resolveToCopy: hasCopy && hasResolve ? 1 : 0,
    copyToOpen: hasOpen && hasCopy ? 1 : 0,
    overall: hasOpen && hasPaste ? 1 : 0,
  };
}
