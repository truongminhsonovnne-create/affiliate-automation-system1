/**
 * Platform Parity Gap Detector
 * Detects and classifies parity gaps between platforms
 */

import type {
  PlatformKey,
  PlatformParityGap,
  PlatformParityGapArea,
  PlatformParityGapSeverity,
  PlatformParityGapStatus,
  PlatformParityScope,
  CrossPlatformMetricComparison,
  PlatformCapabilityMatrix,
} from '../types.js';

import { PlatformParityGapSeverity as Severity } from '../types.js';
import { SCOPE_TO_DRIFT_THRESHOLD } from '../constants.js';

export interface GapDetectionConfig {
  minSeverityForAlert?: PlatformParityGapSeverity;
  enableAutoEscalation?: boolean;
  allowPlatformSpecificInScopes?: PlatformParityScope[];
}

export interface GapDetectionResult {
  detectedGaps: PlatformParityGap[];
  operationalGaps: PlatformParityGap[];
  biGaps: PlatformParityGap[];
  governanceGaps: PlatformParityGap[];
  commercialGaps: PlatformParityGap[];
  summary: GapDetectionSummary;
}

export interface GapDetectionSummary {
  totalGaps: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  shopeeSpecificGaps: number;
  tiktokSpecificGaps: number;
  crossPlatformGaps: number;
}

/**
 * Detect all platform parity gaps
 */
export async function detectPlatformParityGaps(
  shopeeCapabilities: PlatformCapabilityMatrix,
  tiktokCapabilities: PlatformCapabilityMatrix,
  crossPlatformMetrics: CrossPlatformMetricComparison[],
  config?: GapDetectionConfig
): Promise<GapDetectionResult> {
  const gaps: PlatformParityGap[] = [];

  // Detect operational gaps
  const operationalGaps = await detectOperationalParityGaps(
    shopeeCapabilities,
    tiktokCapabilities,
    crossPlatformMetrics,
    config
  );
  gaps.push(...operationalGaps);

  // Detect BI gaps
  const biGaps = await detectBiParityGaps(
    shopeeCapabilities,
    tiktokCapabilities,
    crossPlatformMetrics,
    config
  );
  gaps.push(...biGaps);

  // Detect governance gaps
  const governanceGaps = await detectGovernanceParityGaps(
    shopeeCapabilities,
    tiktokCapabilities,
    crossPlatformMetrics,
    config
  );
  gaps.push(...governanceGaps);

  // Detect commercial gaps
  const commercialGaps = await detectCommercialParityGaps(
    shopeeCapabilities,
    tiktokCapabilities,
    crossPlatformMetrics,
    config
  );
  gaps.push(...commercialGaps);

  // Build summary
  const summary = buildGapDetectionSummary(gaps);

  return {
    detectedGaps: gaps,
    operationalGaps,
    biGaps,
    governanceGaps,
    commercialGaps,
    summary,
  };
}

/**
 * Detect operational parity gaps
 */
export async function detectOperationalParityGaps(
  shopeeCapabilities: PlatformCapabilityMatrix,
  tiktokCapabilities: PlatformCapabilityMatrix,
  crossPlatformMetrics: CrossPlatformMetricComparison[],
  config?: GapDetectionConfig
): Promise<PlatformParityGap[]> {
  const gaps: PlatformParityGap[] = [];
  const scope: PlatformParityScope = 'operational';

  // Check capability gaps
  for (const [area, shopeeLevel] of Object.entries(shopeeCapabilities.capabilities)) {
    const tiktokLevel = tiktokCapabilities.capabilities[area as PlatformParityScope];

    if (!tiktokLevel || shopeeLevel !== tiktokLevel) {
      const gap = createCapabilityGap(
        area as PlatformParityGapArea,
        'tiktok_shop',
        shopeeLevel,
        tiktokLevel,
        scope
      );
      if (gap) gaps.push(gap);
    }
  }

  // Check metric drift gaps
  const operationalMetrics = crossPlatformMetrics.filter((m) => m.isDrift);
  const driftThreshold = SCOPE_TO_DRIFT_THRESHOLD[scope];

  for (const metric of operationalMetrics) {
    if (Math.abs(metric.differencePercent) > driftThreshold) {
      gaps.push(createMetricGap(
        metric.metricKey,
        metric,
        scope,
        'tiktok_shop'
      ));
    }
  }

  // Check for specific operational gaps based on capabilities
  const tiktokOps = tiktokCapabilities.capabilities.operational;

  if (tiktokOps !== shopeeCapabilities.capabilities.operational) {
    gaps.push({
      id: generateGapId(),
      platformKey: 'tiktok_shop',
      gapArea: 'crawler_infrastructure',
      gapStatus: 'open',
      severity: Severity.HIGH,
      gapPayload: {
        scope,
        description: 'TikTok Shop operational capability differs from Shopee',
        shopeeCapability: shopeeCapabilities.capabilities.operational,
        tiktokCapability: tiktokOps,
      },
      createdAt: new Date(),
    });
  }

  return gaps;
}

/**
 * Detect BI parity gaps
 */
export async function detectBiParityGaps(
  shopeeCapabilities: PlatformCapabilityMatrix,
  tiktokCapabilities: PlatformCapabilityMatrix,
  crossPlatformMetrics: CrossPlatformMetricComparison[],
  config?: GapDetectionConfig
): Promise<PlatformParityGap[]> {
  const gaps: PlatformParityGap[] = [];
  const scope: PlatformParityScope = 'bi_analytics';

  // Check BI-related capability gaps
  const biAreas: PlatformParityGapArea[] = [
    'commercial_attribution',
    'growth_analytics',
    'founder_cockpit',
    'executive_reporting',
    'operator_dashboard',
  ];

  for (const area of biAreas) {
    const shopeeLevel = shopeeCapabilities.capabilities.bi_analytics;
    const tiktokLevel = tiktokCapabilities.capabilities.bi_analytics;

    if (shopeeLevel !== tiktokLevel) {
      gaps.push({
        id: generateGapId(),
        platformKey: 'tiktok_shop',
        gapArea: area,
        gapStatus: 'open',
        severity: Severity.MEDIUM,
        gapPayload: {
          scope,
          description: `BI analytics parity gap in ${area}`,
          shopeeCapability: shopeeLevel,
          tiktokCapability: tiktokLevel,
        },
        createdAt: new Date(),
      });
    }
  }

  // Check for missing BI metrics
  const shopeeMetricKeys = new Set(crossPlatformMetrics.map((m) => m.metricKey));
  const expectedMetrics = ['totalRevenue', 'conversionRate', 'attributedSales'];

  for (const metric of expectedMetrics) {
    if (!shopeeMetricKeys.has(metric)) {
      gaps.push({
        id: generateGapId(),
        platformKey: 'tiktok_shop',
        gapArea: 'commercial_attribution',
        gapStatus: 'open',
        severity: Severity.MEDIUM,
        gapPayload: {
          scope,
          description: `Missing commercial metric: ${metric}`,
          metric,
        },
        createdAt: new Date(),
      });
    }
  }

  return gaps;
}

/**
 * Detect governance parity gaps
 */
export async function detectGovernanceParityGaps(
  shopeeCapabilities: PlatformCapabilityMatrix,
  tiktokCapabilities: PlatformCapabilityMatrix,
  crossPlatformMetrics: CrossPlatformMetricComparison[],
  config?: GapDetectionConfig
): Promise<PlatformParityGap[]> {
  const gaps: PlatformParityGap[] = [];
  const scope: PlatformParityScope = 'governance';

  // Check governance capability gaps
  const governanceAreas: PlatformParityGapArea[] = [
    'platform_policies',
    'governance_process',
    'release_readiness',
    'enablement_decision',
    'backlog_management',
  ];

  const shopeeGov = shopeeCapabilities.capabilities.governance;
  const tiktokGov = tiktokCapabilities.capabilities.governance;

  for (const area of governanceAreas) {
    if (shopeeGov !== tiktokGov) {
      gaps.push({
        id: generateGapId(),
        platformKey: 'tiktok_shop',
        gapArea: area,
        gapStatus: 'open',
        severity: Severity.MEDIUM,
        gapPayload: {
          scope,
          description: `Governance parity gap in ${area}`,
          shopeeCapability: shopeeGov,
          tiktokCapability: tiktokGov,
        },
        createdAt: new Date(),
      });
    }
  }

  // Check for governance metric drift
  const governanceMetrics = crossPlatformMetrics.filter((m) =>
    ['releaseReadinessScore', 'enablementRiskScore', 'governanceCompliance'].includes(m.metricKey)
  );

  for (const metric of governanceMetrics) {
    if (metric.isDrift) {
      gaps.push({
        id: generateGapId(),
        platformKey: 'tiktok_shop',
        gapArea: 'governance_process',
        gapStatus: 'open',
        severity: mapDriftToSeverity(metric.differencePercent),
        gapPayload: {
          scope,
          description: `Governance metric drift: ${metric.metricKey}`,
          metric,
        },
        createdAt: new Date(),
      });
    }
  }

  return gaps;
}

/**
 * Detect commercial parity gaps
 */
export async function detectCommercialParityGaps(
  shopeeCapabilities: PlatformCapabilityMatrix,
  tiktokCapabilities: PlatformCapabilityMatrix,
  crossPlatformMetrics: CrossPlatformMetricComparison[],
  config?: GapDetectionResult
): Promise<PlatformParityGap[]> {
  const gaps: PlatformParityGap[] = [];
  const scope: PlatformParityScope = 'commercial';

  // Check commercial capability gaps
  const shopeeComm = shopeeCapabilities.capabilities.commercial;
  const tiktokComm = tiktokCapabilities.capabilities.commercial;

  if (shopeeComm !== tiktokComm) {
    gaps.push({
      id: generateGapId(),
      platformKey: 'tiktok_shop',
      gapArea: 'conversion_tracking',
      gapStatus: 'open',
      severity: Severity.HIGH,
      gapPayload: {
        scope,
        description: 'Commercial tracking parity gap between platforms',
        shopeeCapability: shopeeComm,
        tiktokCapability: tiktokComm,
      },
      createdAt: new Date(),
    });
  }

  // Check commercial metric drift
  const commercialMetrics = crossPlatformMetrics.filter((m) =>
    ['totalRevenue', 'conversionRate', 'avgOrderValue', 'attributedSales'].includes(m.metricKey)
  );

  for (const metric of commercialMetrics) {
    if (metric.isDrift && Math.abs(metric.differencePercent) > 0.25) {
      gaps.push({
        id: generateGapId(),
        platformKey: 'tiktok_shop',
        gapArea: 'commercial_attribution',
        gapStatus: 'open',
        severity: Severity.HIGH,
        gapPayload: {
          scope,
          description: `Significant commercial metric drift: ${metric.metricKey}`,
          metric,
        },
        createdAt: new Date(),
      });
    }
  }

  return gaps;
}

/**
 * Create a capability-based gap
 */
function createCapabilityGap(
  area: PlatformParityGapArea,
  platformKey: PlatformKey,
  shopeeLevel: string,
  tiktokLevel: string | undefined,
  scope: PlatformParityScope
): PlatformParityGap | null {
  if (shopeeLevel === tiktokLevel || !tiktokLevel) return null;

  return {
    id: generateGapId(),
    platformKey,
    gapArea: area,
    gapStatus: 'open',
    severity: Severity.MEDIUM,
    gapPayload: {
      scope,
      description: `Capability gap in ${area}`,
      shopeeLevel,
      tiktokLevel,
    },
    createdAt: new Date(),
  };
}

/**
 * Create a metric-based gap
 */
function createMetricGap(
  metricKey: string,
  metric: CrossPlatformMetricComparison,
  scope: PlatformParityScope,
  platformKey: PlatformKey
): PlatformParityGap {
  return {
    id: generateGapId(),
    platformKey,
    gapArea: inferGapAreaFromMetric(metricKey),
    gapStatus: 'open',
    severity: mapDriftToSeverity(metric.differencePercent),
    gapPayload: {
      scope,
      description: `Metric drift detected: ${metricKey}`,
      metric,
    },
    createdAt: new Date(),
  };
}

/**
 * Map drift percentage to severity
 */
function mapDriftToSeverity(driftPercent: number): PlatformParityGapSeverity {
  const absDrift = Math.abs(driftPercent);
  if (absDrift >= 0.5) return Severity.CRITICAL;
  if (absDrift >= 0.3) return Severity.HIGH;
  if (absDrift >= 0.15) return Severity.MEDIUM;
  return Severity.LOW;
}

/**
 * Infer gap area from metric key
 */
function inferGapAreaFromMetric(metricKey: string): PlatformParityGapArea {
  const metricToAreaMap: Record<string, PlatformParityGapArea> = {
    totalProducts: 'crawler_infrastructure',
    activeProducts: 'crawler_infrastructure',
    errorRate: 'error_handling',
    crawlSuccessRate: 'crawler_infrastructure',
    avgResponseTime: 'crawler_infrastructure',
    dataQualityScore: 'data_quality',
    totalRevenue: 'commercial_attribution',
    conversionRate: 'commercial_attribution',
    avgOrderValue: 'commercial_attribution',
    attributedSales: 'commercial_attribution',
    discoveredProducts: 'product_discovery',
    discoverySuccessRate: 'product_discovery',
    uniqueProductsFound: 'product_discovery',
    detailExtractionSuccess: 'product_detail_extraction',
    mediaQualityScore: 'product_detail_extraction',
    attributeCompleteness: 'product_detail_extraction',
    enrichmentSuccessRate: 'ai_enrichment',
    aiProcessingTime: 'ai_enrichment',
    enrichmentQualityScore: 'ai_enrichment',
    releaseReadinessScore: 'release_readiness',
    enablementRiskScore: 'enablement_decision',
    backlogCount: 'backlog_management',
    governanceCompliance: 'governance_process',
  };

  return metricToAreaMap[metricKey] ?? 'data_quality';
}

/**
 * Build gap detection summary
 */
function buildGapDetectionSummary(gaps: PlatformParityGap[]): GapDetectionSummary {
  return {
    totalGaps: gaps.length,
    criticalCount: gaps.filter((g) => g.severity === Severity.CRITICAL).length,
    highCount: gaps.filter((g) => g.severity === Severity.HIGH).length,
    mediumCount: gaps.filter((g) => g.severity === Severity.MEDIUM).length,
    lowCount: gaps.filter((g) => g.severity === Severity.LOW).length,
    shopeeSpecificGaps: gaps.filter((g) => g.platformKey === 'shopee').length,
    tiktokSpecificGaps: gaps.filter((g) => g.platformKey === 'tiktok_shop').length,
    crossPlatformGaps: gaps.filter((g) => g.platformKey === 'both').length,
  };
}

function generateGapId(): string {
  return `gap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
