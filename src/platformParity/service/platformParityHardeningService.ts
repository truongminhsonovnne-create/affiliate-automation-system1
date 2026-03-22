/**
 * Platform Parity Hardening Service
 * Main orchestrator for parity hardening operations
 */

import type {
  PlatformKey,
  PlatformParityLevel,
  PlatformParityScope,
  PlatformCapabilityMatrix,
  CrossPlatformMetricComparison,
  PlatformParityGap,
  PlatformExceptionRecord,
  UnifiedBiSurface,
  UnifiedGovernanceSurface,
  ParityHardeningDecisionSupport,
} from '../types.js';

import { PlatformParityLevel as Level } from '../types.js';

import { PLATFORM_CAPABILITY_DEFAULTS, DEFAULT_COMPARISON_WINDOW_HOURS } from '../constants.js';

// Repositories
import * as snapshotRepo from '../repositories/platformParitySnapshotRepository.js';
import * as gapRepo from '../repositories/platformParityGapRepository.js';
import * as exceptionRepo from '../repositories/platformExceptionRepository.js';
import * as auditRepo from '../repositories/unifiedSurfaceAuditRepository.js';

// Domain services
import { buildPlatformParityModel, buildPlatformParitySummary } from '../model/platformParityModel.js';
import { detectPlatformParityGaps } from '../gaps/platformParityGapDetector.js';
import { buildCrossPlatformComparison } from '../comparison/crossPlatformComparisonService.js';
import { buildParityDecisionSupport } from '../decisionSupport/parityDecisionSupportService.js';
import { buildParityBacklog } from '../backlog/parityBacklogService.js';

// Unified view builders
import { buildUnifiedPlatformOpsOverview, buildUnifiedProductOpsView, buildUnifiedCommercialOpsView, buildUnifiedGrowthOpsView, buildUnifiedReleaseOpsView } from '../unifiedViews/unifiedOpsViewBuilder.js';
import { buildUnifiedExecutiveBiSurface, buildUnifiedOperatorBiSurface, buildUnifiedFounderBiSurface } from '../unifiedViews/unifiedBiSurfaceBuilder.js';
import { buildUnifiedGovernanceSurface } from '../unifiedViews/unifiedGovernanceSurfaceBuilder.js';

export interface PlatformParityHardeningInput {
  shopeeMetrics: Record<string, number>;
  tiktokMetrics: Record<string, number>;
  snapshotWindowStart?: Date;
  snapshotWindowEnd?: Date;
}

export interface UnifiedOpsSurfacePack {
  overview: ReturnType<typeof buildUnifiedPlatformOpsOverview> extends Promise<infer R> ? R : never;
  productOps: ReturnType<typeof buildUnifiedProductOpsView> extends Promise<infer R> ? R : never;
  commercialOps: ReturnType<typeof buildUnifiedCommercialOpsView> extends Promise<infer R> ? R : never;
  growthOps: ReturnType<typeof buildUnifiedGrowthOpsView> extends Promise<infer R> ? R : never;
  releaseOps: ReturnType<typeof buildUnifiedReleaseOpsView> extends Promise<infer R> ? R : never;
}

export interface UnifiedBiSurfacePack {
  executive: UnifiedBiSurface;
  operator: UnifiedBiSurface;
  founder: UnifiedBiSurface;
}

export interface UnifiedGovernanceSurfacePack {
  governance: UnifiedGovernanceSurface;
}

/**
 * Run full platform parity hardening cycle
 */
export async function runPlatformParityHardeningCycle(
  input: PlatformParityHardeningInput
): Promise<{
  parityModel: ReturnType<typeof buildPlatformParityModel> extends Promise<infer R> ? R : never;
  decisionSupport: ParityHardeningDecisionSupport;
  snapshotId: string;
  gapsDetected: number;
  backlogCreated: number;
}> {
  const { shopeeMetrics, tiktokMetrics, snapshotWindowStart, snapshotWindowEnd } = input;

  // Set default window if not provided
  const windowStart = snapshotWindowStart ?? new Date(Date.now() - DEFAULT_COMPARISON_WINDOW_HOURS * 60 * 60 * 1000);
  const windowEnd = snapshotWindowEnd ?? new Date();

  // Step 1: Get current platform capabilities
  const shopeeCapabilities = buildCapabilityMatrix('shopee', shopeeMetrics);
  const tiktokCapabilities = buildCapabilityMatrix('tiktok_shop', tiktokMetrics);

  // Step 2: Get existing data
  const [openGaps, activeExceptions] = await Promise.all([
    gapRepo.getOpenGaps(),
    exceptionRepo.getActiveExceptions(),
  ]);

  // Step 3: Build cross-platform metrics and detect gaps
  const crossPlatformMetrics = await buildCrossPlatformMetrics(shopeeMetrics, tiktokMetrics);
  const gapDetectionResult = await detectPlatformParityGaps(
    shopeeCapabilities,
    tiktokCapabilities,
    crossPlatformMetrics
  );

  // Step 4: Create new gaps if any detected
  let gapsCreated = 0;
  for (const gap of gapDetectionResult.detectedGaps) {
    try {
      await gapRepo.createPlatformParityGap(gap);
      gapsCreated++;

      // Audit the gap detection
      await auditRepo.createAuditEntry({
        entityType: 'platform_parity_gap',
        entityId: gap.id,
        auditAction: 'gap_detected',
        rationale: `Gap detected in ${gap.gapArea} with severity ${gap.severity}`,
      });
    } catch (error) {
      console.error(`Failed to create gap: ${error}`);
    }
  }

  // Step 5: Build parity model
  const allGaps = [...openGaps, ...gapDetectionResult.detectedGaps];
  const parityModel = await buildPlatformParityModel({
    shopeeCapabilities: shopeeCapabilities.capabilities,
    tiktokCapabilities: tiktokCapabilities.capabilities,
    openGaps: allGaps,
    activeExceptions,
    crossPlatformMetrics,
  });

  // Step 6: Build decision support
  const decisionSupport = await buildParityDecisionSupport({
    currentParityLevel: parityModel.overallParityLevel,
    openGaps: allGaps,
    activeExceptions,
    crossPlatformMetrics,
    platformCapabilities: {
      shopee: shopeeCapabilities.capabilities,
      tiktok_shop: tiktokCapabilities.capabilities,
    },
    snapshotWindow: { start: windowStart, end: windowEnd },
  });

  // Step 7: Create parity backlog from gaps
  const backlog = await buildParityBacklog(allGaps);
  const backlogCreated = backlog.length;

  // Step 8: Persist snapshot
  const snapshot = await snapshotRepo.createPlatformParitySnapshot({
    snapshotWindowStart: windowStart,
    snapshotWindowEnd: windowEnd,
    parityScope: 'operational',
    parityPayload: {
      parityLevel: parityModel.overallParityLevel,
      scopeModels: parityModel.scopeModels,
      gapSummary: gapDetectionResult.summary,
      decisionSupport: {
        recommendationsCount: decisionSupport.recommendations.length,
        criticalGaps: decisionSupport.riskSummary.criticalGaps,
      },
    },
  });

  return {
    parityModel,
    decisionSupport,
    snapshotId: snapshot.id,
    gapsDetected: gapsCreated,
    backlogCreated,
  };
}

/**
 * Build unified ops surface pack
 */
export async function buildUnifiedOpsSurfacePack(
  input: PlatformParityHardeningInput
): Promise<UnifiedOpsSurfacePack> {
  const { shopeeMetrics, tiktokMetrics } = input;

  const lastSyncTimes: Record<PlatformKey, Date> = {
    shopee: new Date(),
    tiktok_shop: new Date(),
  };

  const crossPlatformMetrics = await buildCrossPlatformMetrics(shopeeMetrics, tiktokMetrics);

  const baseInput = {
    shopeeMetrics,
    tiktokMetrics,
    crossPlatformMetrics,
    lastSyncTimes,
  };

  const [overview, productOps, commercialOps, growthOps, releaseOps] = await Promise.all([
    buildUnifiedPlatformOpsOverview(baseInput),
    buildUnifiedProductOpsView(baseInput),
    buildUnifiedCommercialOpsView(baseInput),
    buildUnifiedGrowthOpsView(baseInput),
    buildUnifiedReleaseOpsView(baseInput),
  ]);

  return { overview, productOps, commercialOps, growthOps, releaseOps };
}

/**
 * Build unified BI surface pack
 */
export async function buildUnifiedBiSurfacePack(
  input: PlatformParityHardeningInput
): Promise<UnifiedBiSurfacePack> {
  const { shopeeMetrics, tiktokMetrics } = input;

  const crossPlatformMetrics = await buildCrossPlatformMetrics(shopeeMetrics, tiktokMetrics);

  const [executive, operator, founder] = await Promise.all([
    buildUnifiedExecutiveBiSurface({
      shopeeMetrics,
      tiktokMetrics,
      crossPlatformMetrics,
      period: 'month',
    }),
    buildUnifiedOperatorBiSurface({
      shopeeMetrics,
      tiktokMetrics,
      crossPlatformMetrics,
    }),
    buildUnifiedFounderBiSurface({
      shopeeMetrics,
      tiktokMetrics,
      crossPlatformMetrics,
      strategicPeriod: 'quarter',
    }),
  ]);

  return { executive, operator, founder };
}

/**
 * Build unified governance surface pack
 */
export async function buildUnifiedGovernanceSurfacePack(
  input: PlatformParityHardeningInput
): Promise<UnifiedGovernanceSurfacePack> {
  const { shopeeMetrics, tiktokMetrics } = input;

  const [openGaps, activeExceptions] = await Promise.all([
    gapRepo.getOpenGaps(),
    exceptionRepo.getActiveExceptions(),
  ]);

  const governance = await buildUnifiedGovernanceSurface({
    shopeeMetrics,
    tiktokMetrics,
    openGaps,
    activeExceptions,
  });

  return { governance };
}

/**
 * Build platform parity decision support report
 */
export async function buildPlatformParityDecisionSupportReport(
  input: PlatformParityHardeningInput
): Promise<ParityHardeningDecisionSupport> {
  const { shopeeMetrics, tiktokMetrics } = input;

  const shopeeCapabilities = buildCapabilityMatrix('shopee', shopeeMetrics);
  const tiktokCapabilities = buildCapabilityMatrix('tiktok_shop', tiktokMetrics);

  const [openGaps, activeExceptions] = await Promise.all([
    gapRepo.getOpenGaps(),
    exceptionRepo.getActiveExceptions(),
  ]);

  const crossPlatformMetrics = await buildCrossPlatformMetrics(shopeeMetrics, tiktokMetrics);

  const parityModel = await buildPlatformParityModel({
    shopeeCapabilities: shopeeCapabilities.capabilities,
    tiktokCapabilities: tiktokCapabilities.capabilities,
    openGaps,
    activeExceptions,
    crossPlatformMetrics,
  });

  return buildParityDecisionSupport({
    currentParityLevel: parityModel.overallParityLevel,
    openGaps,
    activeExceptions,
    crossPlatformMetrics,
    platformCapabilities: {
      shopee: shopeeCapabilities.capabilities,
      tiktok_shop: tiktokCapabilities.capabilities,
    },
    snapshotWindow: {
      start: new Date(Date.now() - DEFAULT_COMPARISON_WINDOW_HOURS * 60 * 60 * 1000),
      end: new Date(),
    },
  });
}

// Helper functions

function buildCapabilityMatrix(
  platform: PlatformKey,
  metrics: Record<string, number>
): PlatformCapabilityMatrix {
  // Use defaults with potential overrides from metrics
  const defaults = PLATFORM_CAPABILITY_DEFAULTS[platform];

  // Determine capability levels based on metrics
  const capabilities: Record<PlatformParityScope, PlatformParityLevel> = {
    operational: determineCapabilityLevel(metrics, 'operational'),
    commercial: determineCapabilityLevel(metrics, 'commercial'),
    technical: determineCapabilityLevel(metrics, 'technical'),
    governance: determineCapabilityLevel(metrics, 'governance'),
    product_ops: determineCapabilityLevel(metrics, 'product_ops'),
    bi_analytics: determineCapabilityLevel(metrics, 'bi_analytics'),
    consumer_experience: determineCapabilityLevel(metrics, 'consumer_experience'),
    publishing: determineCapabilityLevel(metrics, 'publishing'),
    discovery: determineCapabilityLevel(metrics, 'discovery'),
    detail: determineCapabilityLevel(metrics, 'detail'),
    enrichment: determineCapabilityLevel(metrics, 'enrichment'),
  };

  return {
    platform,
    capabilities,
    lastUpdated: new Date(),
  };
}

function determineCapabilityLevel(metrics: Record<string, number>, scope: PlatformParityScope): PlatformParityLevel {
  // Simplified logic - in production would be more sophisticated
  const scopeMetrics: Record<PlatformParityScope, string[]> = {
    operational: ['errorRate', 'crawlSuccessRate', 'avgResponseTime'],
    commercial: ['totalRevenue', 'conversionRate', 'attributedSales'],
    technical: ['dataQualityScore'],
    governance: ['releaseReadinessScore', 'governanceCompliance'],
    product_ops: ['discoveredProducts', 'detailExtractionSuccess', 'enrichmentSuccessRate'],
    bi_analytics: ['totalProducts', 'activeProducts', 'growthRates'],
    consumer_experience: [],
    publishing: [],
    discovery: ['discoverySuccessRate', 'discoveredProducts'],
    detail: ['detailExtractionSuccess', 'mediaQualityScore', 'attributeCompleteness'],
    enrichment: ['enrichmentSuccessRate', 'enrichmentQualityScore'],
  };

  const relevantMetrics = scopeMetrics[scope] ?? [];
  if (relevantMetrics.length === 0) {
    return Level.UNKNOWN;
  }

  // Check if we have metrics for this scope
  const hasMetrics = relevantMetrics.some((m) => metrics[m] !== undefined);
  if (!hasMetrics) {
    return Level.UNKNOWN;
  }

  // Determine level based on metric values (simplified)
  const values = relevantMetrics.map((m) => metrics[m] ?? 0);
  const avgValue = values.reduce((a, b) => a + b, 0) / values.length;

  if (avgValue >= 0.9) return Level.FULL_PARITY;
  if (avgValue >= 0.75) return Level.OPERATIONAL_PARITY;
  if (avgValue >= 0.6) return Level.REPORTING_PARITY;
  if (avgValue >= 0.4) return Level.GOVERNANCE_PARITY;

  return Level.PARTIAL_PARITY;
}

async function buildCrossPlatformMetrics(
  shopeeMetrics: Record<string, number>,
  tiktokMetrics: Record<string, number>
): Promise<CrossPlatformMetricComparison[]> {
  const scopes: PlatformParityScope[] = [
    'operational',
    'commercial',
    'technical',
    'governance',
    'product_ops',
    'bi_analytics',
    'discovery',
    'detail',
    'enrichment',
  ];

  const allMetrics: CrossPlatformMetricComparison[] = [];

  for (const scope of scopes) {
    const comparison = await buildCrossPlatformComparison({
      comparisonScope: scope,
      shopeeMetrics,
      tiktokMetrics,
      driftThresholds: {},
    });
    allMetrics.push(...comparison.metrics);
  }

  return allMetrics;
}
