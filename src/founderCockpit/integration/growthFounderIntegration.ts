/**
 * Growth Founder Integration
 *
 * Integrates growth engine signals into founder cockpit.
 */

export interface GrowthFounderSignal {
  totalSessions: number;
  submitRate: number;
  conversionRate: number;
  activeSurfaces: number;
  pausedSurfaces: number;
  scalingSignals: ScalingSignal[];
}

export interface ScalingSignal {
  surfaceId: string;
  surfaceName: string;
  status: 'scaling' | 'stable' | 'degrading' | 'paused';
  health: 'healthy' | 'warning' | 'critical';
  recommendation: 'scale' | 'hold' | 'pause' | 'retune';
}

export interface GrowthRisk {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedEntities: string[];
  recommendation: string;
}

/**
 * Collect growth signals from growth engine
 */
export async function collectFounderGrowthSignals(): Promise<GrowthFounderSignal> {
  // In production, this would call growth engine services
  return {
    totalSessions: 15000,
    submitRate: 0.08,
    conversionRate: 0.05,
    activeSurfaces: 12,
    pausedSurfaces: 3,
    scalingSignals: [
      {
        surfaceId: 'surface-001',
        surfaceName: 'Tech Coupons UK',
        status: 'scaling',
        health: 'healthy',
        recommendation: 'scale',
      },
      {
        surfaceId: 'surface-002',
        surfaceName: 'Fashion Deals',
        status: 'degrading',
        health: 'warning',
        recommendation: 'retune',
      },
    ],
  };
}

/**
 * Build growth scaling summary for founder
 */
export async function buildFounderGrowthScalingSummary(): Promise<{
  activeSurfaces: number;
  pausedSurfaces: number;
  scalingRecommendation: string;
  surfacesToScale: string[];
  surfacesToPause: string[];
  surfacesToRetune: string[];
}> {
  const signals = await collectFounderGrowthSignals();

  const surfacesToScale = signals.scalingSignals
    .filter(s => s.recommendation === 'scale')
    .map(s => s.surfaceName);

  const surfacesToPause = signals.scalingSignals
    .filter(s => s.recommendation === 'pause')
    .map(s => s.surfaceName);

  const surfacesToRetune = signals.scalingSignals
    .filter(s => s.recommendation === 'retune')
    .map(s => s.surfaceName);

  return {
    activeSurfaces: signals.activeSurfaces,
    pausedSurfaces: signals.pausedSurfaces,
    scalingRecommendation: surfacesToScale.length > 0 ? 'Continue scaling' : 'Hold current position',
    surfacesToScale,
    surfacesToPause,
    surfacesToRetune,
  };
}

/**
 * Build growth risks summary for founder
 */
export async function buildFounderGrowthRiskSummary(): Promise<GrowthRisk[]> {
  const signals = await collectFounderGrowthSignals();
  const risks: GrowthRisk[] = [];

  // Check for critical surfaces
  const criticalSurfaces = signals.scalingSignals.filter(s => s.health === 'critical');
  if (criticalSurfaces.length > 0) {
    risks.push({
      category: 'surface_health',
      severity: 'critical',
      description: `${criticalSurfaces.length} surfaces in critical health`,
      affectedEntities: criticalSurfaces.map(s => s.surfaceName),
      recommendation: 'Immediate review required',
    });
  }

  // Check for degrading trends
  const degradingSurfaces = signals.scalingSignals.filter(s => s.status === 'degrading');
  if (degradingSurfaces.length > 0) {
    risks.push({
      category: 'surface_degradation',
      severity: 'high',
      description: `${degradingSurfaces.length} surfaces showing degradation`,
      affectedEntities: degradingSurfaces.map(s => s.surfaceName),
      recommendation: 'Review and retune parameters',
    });
  }

  // Check submit rate
  if (signals.submitRate < 0.05) {
    risks.push({
      category: 'submit_rate',
      severity: 'medium',
      description: 'Submit rate below healthy threshold',
      affectedEntities: [],
      recommendation: 'Review user experience and voucher relevance',
    });
  }

  return risks;
}

/**
 * Get growth trend summary
 */
export async function getGrowthTrendSummary(): Promise<{
  sessions: { current: number; previous: number; changePercent: number };
  submitRate: { current: number; previous: number; changePercent: number };
  conversionRate: { current: number; previous: number; changePercent: number };
}> {
  return {
    sessions: { current: 15000, previous: 14000, changePercent: 7.1 },
    submitRate: { current: 0.08, previous: 0.075, changePercent: 6.7 },
    conversionRate: { current: 0.05, previous: 0.048, changePercent: 4.2 },
  };
}
