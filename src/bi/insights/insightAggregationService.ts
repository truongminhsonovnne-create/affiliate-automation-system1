/**
 * Insight Aggregation Service
 */

import type { BiInsightSummary } from '../types.js';

export class InsightAggregationService {
  async aggregateBiInsights(startDate: Date, endDate: Date): Promise<BiInsightSummary[]> {
    const insights: BiInsightSummary[] = [];

    const growthInsights = await this.collectGrowthInsights(startDate, endDate);
    if (growthInsights) insights.push(growthInsights);

    const commercialInsights = await this.collectCommercialInsights(startDate, endDate);
    if (commercialInsights) insights.push(commercialInsights);

    const qualityInsights = await this.collectQualityInsights(startDate, endDate);
    if (qualityInsights) insights.push(qualityInsights);

    return insights;
  }

  private async collectGrowthInsights(startDate: Date, endDate: Date): Promise<BiInsightSummary | null> {
    return {
      category: 'growth',
      insights: [
        { type: 'neutral', title: 'Growth metrics', description: 'Collected from growth integration', affectedEntities: [] },
      ],
      generatedAt: new Date(),
    };
  }

  private async collectCommercialInsights(startDate: Date, endDate: Date): Promise<BiInsightSummary | null> {
    return {
      category: 'commercial',
      insights: [
        { type: 'neutral', title: 'Commercial metrics', description: 'Collected from commercial integration', affectedEntities: [] },
      ],
      generatedAt: new Date(),
    };
  }

  private async collectQualityInsights(startDate: Date, endDate: Date): Promise<BiInsightSummary | null> {
    return {
      category: 'quality',
      insights: [
        { type: 'neutral', title: 'Quality metrics', description: 'Collected from quality integration', affectedEntities: [] },
      ],
      generatedAt: new Date(),
    };
  }

  async collectGovernanceInsights(): Promise<BiInsightSummary> {
    return {
      category: 'governance',
      insights: [],
      generatedAt: new Date(),
    };
  }
}

let service: InsightAggregationService | null = null;
export function getInsightAggregationService(): InsightAggregationService {
  if (!service) service = new InsightAggregationService();
  return service;
}

export async function aggregateBiInsights(startDate: Date, endDate: Date): Promise<BiInsightSummary[]> {
  return getInsightAggregationService().aggregateBiInsights(startDate, endDate);
}
