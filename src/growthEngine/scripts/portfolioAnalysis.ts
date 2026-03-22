#!/usr/bin/env node
/**
 * Portfolio Analysis Script
 *
 * Analyzes the growth surface portfolio and generates governance reports.
 */

import { monitoring } from '../integrations/monitoringIntegration';
import {
  GrowthSurfaceType,
  GrowthSurfaceStatus,
  GrowthSurfaceIndexabilityStatus,
} from '../types';

// ============================================================================
// Types
// ============================================================================

interface SurfaceData {
  id: string;
  surfaceType: GrowthSurfaceType;
  pageStatus: GrowthSurfaceStatus;
  indexabilityStatus: GrowthSurfaceIndexabilityStatus;
  qualityScore: number | null;
  usefulnessScore: number | null;
}

interface PortfolioSummary {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  indexable: number;
  nonIndexable: number;
  avgQualityScore: number;
  avgUsefulnessScore: number;
  qualityDistribution: { excellent: number; good: number; acceptable: number; poor: number };
  surfacesNeedingAttention: string[];
}

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Analyze portfolio health
 */
function analyzePortfolio(surfaces: SurfaceData[]): PortfolioSummary {
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let indexable = 0;
  let totalQuality = 0;
  let qualityCount = 0;
  let totalUsefulness = 0;
  let usefulnessCount = 0;
  const surfacesNeedingAttention: string[] = [];

  for (const surface of surfaces) {
    // Count by status
    byStatus[surface.pageStatus] = (byStatus[surface.pageStatus] || 0) + 1;

    // Count by type
    byType[surface.surfaceType] = (byType[surface.surfaceType] || 0) + 1;

    // Indexable count
    if (surface.indexabilityStatus === 'indexable') {
      indexable++;
    }

    // Quality average
    if (surface.qualityScore !== null) {
      totalQuality += surface.qualityScore;
      qualityCount++;
    }

    // Usefulness average
    if (surface.usefulnessScore !== null) {
      totalUsefulness += surface.usefulnessScore;
      usefulnessCount++;
    }

    // Identify surfaces needing attention
    const issues: string[] = [];
    if (surface.pageStatus === 'stale') issues.push('stale');
    if (surface.pageStatus === 'blocked') issues.push('blocked');
    if (surface.indexabilityStatus === 'noindex') issues.push('noindex');
    if (surface.qualityScore !== null && surface.qualityScore < 50) issues.push('low_quality');
    if (surface.usefulnessScore !== null && surface.usefulnessScore < 30) issues.push('low_usefulness');

    if (issues.length > 0) {
      surfacesNeedingAttention.push(`${surface.id} (${issues.join(', ')})`);
    }
  }

  // Quality distribution
  const qualityDistribution = { excellent: 0, good: 0, acceptable: 0, poor: 0 };
  for (const surface of surfaces) {
    if (surface.qualityScore !== null) {
      if (surface.qualityScore >= 90) qualityDistribution.excellent++;
      else if (surface.qualityScore >= 75) qualityDistribution.good++;
      else if (surface.qualityScore >= 60) qualityDistribution.acceptable++;
      else qualityDistribution.poor++;
    }
  }

  return {
    total: surfaces.length,
    byStatus,
    byType,
    indexable,
    nonIndexable: surfaces.length - indexable,
    avgQualityScore: qualityCount > 0 ? Math.round(totalQuality / qualityCount) : 0,
    avgUsefulnessScore: usefulnessCount > 0 ? Math.round(totalUsefulness / usefulnessCount) : 0,
    qualityDistribution,
    surfacesNeedingAttention,
  };
}

/**
 * Generate governance recommendations
 */
function generateRecommendations(summary: PortfolioSummary): string[] {
  const recommendations: string[] = [];

  // Quality recommendations
  if (summary.avgQualityScore < 60) {
    recommendations.push('⚠️  Average quality score is below acceptable threshold. Review quality evaluation process.');
  }

  if (summary.qualityDistribution.poor > summary.total * 0.2) {
    recommendations.push('⚠️  High proportion of poor quality surfaces. Consider blocking or improving.');
  }

  // Indexability recommendations
  if (summary.nonIndexable > summary.total * 0.3) {
    recommendations.push('⚠️  High proportion of non-indexable surfaces. Review SEO governance.');
  }

  // Status recommendations
  if (summary.byStatus['stale']) {
    recommendations.push(`📅 ${summary.byStatus['stale']} surfaces are stale. Schedule refresh.`);
  }

  if (summary.byStatus['blocked']) {
    recommendations.push(`🚫 ${summary.byStatus['blocked']} surfaces are blocked. Review blocking criteria.`);
  }

  // Scaling readiness
  const activeRatio = (summary.byStatus['active'] || 0) / summary.total;
  if (activeRatio < 0.5) {
    recommendations.push('📊 Low active surface ratio. Review generation pipeline.');
  }

  // Positive indicators
  if (summary.avgQualityScore >= 75) {
    recommendations.push('✅ Average quality score is good.');
  }

  if (summary.indexable / summary.total >= 0.8) {
    recommendations.push('✅ Indexability rate is healthy.');
  }

  return recommendations;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('═'.repeat(60));
  console.log('  GROWTH ENGINE PORTFOLIO ANALYSIS');
  console.log('═'.repeat(60));
  console.log();

  // Simulated surface data (would be fetched from database)
  const surfaces: SurfaceData[] = generateMockData();

  // Analyze portfolio
  console.log('Analyzing portfolio...');
  const summary = analyzePortfolio(surfaces);

  // Output summary
  console.log();
  console.log('📊 PORTFOLIO SUMMARY');
  console.log('─'.repeat(40));
  console.log(`Total Surfaces: ${summary.total}`);
  console.log();

  console.log('By Status:');
  for (const [status, count] of Object.entries(summary.byStatus)) {
    const pct = ((count / summary.total) * 100).toFixed(1);
    console.log(`  ${status}: ${count} (${pct}%)`);
  }
  console.log();

  console.log('By Type:');
  for (const [type, count] of Object.entries(summary.byType)) {
    const pct = ((count / summary.total) * 100).toFixed(1);
    console.log(`  ${type}: ${count} (${pct}%)`);
  }
  console.log();

  console.log('📈 QUALITY METRICS');
  console.log('─'.repeat(40));
  console.log(`Average Quality Score: ${summary.avgQualityScore}/100`);
  console.log(`Average Usefulness Score: ${summary.avgUsefulnessScore}/100`);
  console.log(`Indexable: ${summary.indexable} (${((summary.indexable / summary.total) * 100).toFixed(1)}%)`);
  console.log();

  console.log('Quality Distribution:');
  console.log(`  Excellent (90+): ${summary.qualityDistribution.excellent}`);
  console.log(`  Good (75-89): ${summary.qualityDistribution.good}`);
  console.log(`  Acceptable (60-74): ${summary.qualityDistribution.acceptable}`);
  console.log(`  Poor (<60): ${summary.qualityDistribution.poor}`);
  console.log();

  // Recommendations
  console.log('💡 RECOMMENDATIONS');
  console.log('─'.repeat(40));
  const recommendations = generateRecommendations(summary);
  recommendations.forEach(r => console.log(`  ${r}`));
  console.log();

  // Surfaces needing attention
  if (summary.surfacesNeedingAttention.length > 0) {
    console.log('⚠️  SURFACES NEEDING ATTENTION');
    console.log('─'.repeat(40));
    summary.surfacesNeedingAttention.slice(0, 10).forEach(s => console.log(`  - ${s}`));
    if (summary.surfacesNeedingAttention.length > 10) {
      console.log(`  ... and ${summary.surfacesNeedingAttention.length - 10} more`);
    }
    console.log();
  }

  console.log('═'.repeat(60));
  console.log('  Analysis complete');
  console.log('═'.repeat(60));

  // Record metrics
  monitoring.recordMetric('portfolio.total', summary.total);
  monitoring.recordMetric('portfolio.quality_avg', summary.avgQualityScore);
  monitoring.recordMetric('portfolio.usefulness_avg', summary.avgUsefulnessScore);
  monitoring.recordMetric('portfolio.indexable_ratio', (summary.indexable / summary.total) * 100);
}

// ============================================================================
// Mock Data Generator
// ============================================================================

function generateMockData(): SurfaceData[] {
  const surfaceTypes: GrowthSurfaceType[] = [
    'shop_page',
    'category_page',
    'intent_page',
    'tool_entry',
    'discovery_page',
    'ranking_page',
    'guide_page',
  ];

  const statuses: GrowthSurfaceStatus[] = ['pending', 'generating', 'active', 'stale', 'blocked', 'deindexed'];
  const indexabilityStatuses: GrowthSurfaceIndexabilityStatus[] = ['pending', 'indexable', 'noindex', 'canonical_mismatch'];

  const surfaces: SurfaceData[] = [];

  // Generate 150 surfaces
  for (let i = 0; i < 150; i++) {
    const surfaceType = surfaceTypes[Math.floor(Math.random() * surfaceTypes.length)];
    const pageStatus = statuses[Math.floor(Math.random() * statuses.length)];
    const indexabilityStatus = pageStatus === 'active'
      ? indexabilityStatuses[Math.floor(Math.random() * 2)] // Mostly indexable
      : indexabilityStatuses[Math.floor(Math.random() * indexabilityStatuses.length)];

    // Generate quality score (mostly good)
    let qualityScore: number | null = null;
    if (pageStatus === 'active' || pageStatus === 'stale') {
      qualityScore = Math.random() > 0.3 ? Math.floor(Math.random() * 30) + 60 : Math.floor(Math.random() * 40) + 20;
    }

    // Generate usefulness score
    let usefulnessScore: number | null = null;
    if (pageStatus === 'active') {
      usefulnessScore = Math.floor(Math.random() * 40) + 40;
    }

    surfaces.push({
      id: `surface-${i}`,
      surfaceType,
      pageStatus,
      indexabilityStatus,
      qualityScore,
      usefulnessScore,
    });
  }

  return surfaces;
}

main().catch(console.error);
