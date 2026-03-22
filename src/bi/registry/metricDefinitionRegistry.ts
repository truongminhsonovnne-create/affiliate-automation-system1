/**
 * Metric Definition Registry
 *
 * Production-grade registry for metric definitions and lineage.
 */

import { getSupabaseClient, type SupabaseClient } from '../../db/supabaseClient.js';
import type { MetricDefinitionRecord, MetricLineageModel, BiResult } from '../types.js';
import { BI_ERRORS } from '../constants.js';
import { logger } from '../../utils/logger.js';

/**
 * Metric Definition Registry
 *
 * Manages metric definitions and their lineage.
 */
export class MetricDefinitionRegistry {
  private supabase: SupabaseClient;
  private cache: Map<string, MetricDefinitionRecord> = new Map();

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? getSupabaseClient();
  }

  /**
   * Get metric definition by key
   */
  async getMetricDefinition(metricKey: string): Promise<BiResult<MetricDefinitionRecord>> {
    // Check cache first
    if (this.cache.has(metricKey)) {
      return { success: true, data: this.cache.get(metricKey)! };
    }

    try {
      const { data, error } = await this.supabase
        .from('metric_definition_registry')
        .select('*')
        .eq('metric_key', metricKey)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        return { success: false, error: `${BI_ERRORS.METRIC_NOT_FOUND}: ${metricKey}` };
      }

      const record = this.mapToDomain(data);
      this.cache.set(metricKey, record);

      return { success: true, data: record };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ msg: 'Error getting metric definition', error: errorMessage, metricKey });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get all metric definitions
   */
  async getAllMetricDefinitions(): Promise<BiResult<MetricDefinitionRecord[]>> {
    try {
      const { data, error } = await this.supabase
        .from('metric_definition_registry')
        .select('*')
        .eq('status', 'active')
        .order('metric_category', { ascending: true });

      if (error) {
        return { success: false, error: error.message };
      }

      const records = (data ?? []).map(this.mapToDomain);

      // Update cache
      for (const record of records) {
        this.cache.set(record.key, record);
      }

      return { success: true, data: records };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Register new metric definition
   */
  async registerMetricDefinition(input: {
    metricKey: string;
    metricName: string;
    metricCategory: string;
    metricDefinition: string;
    lineage: MetricLineageModel;
    unit?: string;
  }): Promise<BiResult<MetricDefinitionRecord>> {
    try {
      const { data, error } = await this.supabase
        .from('metric_definition_registry')
        .insert({
          metric_key: input.metricKey,
          metric_name: input.metricName,
          metric_category: input.metricCategory,
          metric_definition: input.metricDefinition,
          lineage_payload: input.lineage,
          unit: input.unit,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      const record = this.mapToDomain(data);
      this.cache.set(record.key, record);

      return { success: true, data: record };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Validate metric registry integrity
   */
  async validateMetricRegistry(): Promise<BiResult<{
    total: number;
    byCategory: Record<string, number>;
    issues: string[];
  }>> {
    try {
      const allMetrics = await this.getAllMetricDefinitions();

      if (!allMetrics.success || !allMetrics.data) {
        return { success: false, error: allMetrics.error ?? 'Failed to get metrics' };
      }

      const byCategory: Record<string, number> = {};
      const issues: string[] = [];

      for (const metric of allMetrics.data) {
        byCategory[metric.category] = (byCategory[metric.category] ?? 0) + 1;

        // Validate lineage
        if (!metric.lineage.source || !metric.lineage.calculation) {
          issues.push(`Missing lineage for metric: ${metric.key}`);
        }
      }

      return {
        success: true,
        data: {
          total: allMetrics.data.length,
          byCategory,
          issues,
        },
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Build metric lineage summary
   */
  buildMetricLineageSummary(metrics: MetricDefinitionRecord[]): {
    bySource: Record<string, string[]>;
    byCalculation: Record<string, string[]>;
    dependencies: Record<string, string[]>;
  } {
    const bySource: Record<string, string[]> = {};
    const byCalculation: Record<string, string[]> = {};
    const dependencies: Record<string, string[]> = {};

    for (const metric of metrics) {
      // By source
      const source = metric.lineage.source;
      if (!bySource[source]) bySource[source] = [];
      bySource[source].push(metric.key);

      // By calculation
      const calc = metric.lineage.calculation;
      if (!byCalculation[calc]) byCalculation[calc] = [];
      byCalculation[calc].push(metric.key);

      // Dependencies
      if (metric.lineage.dependencies?.length) {
        dependencies[metric.key] = metric.lineage.dependencies;
      }
    }

    return { bySource, byCalculation, dependencies };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Map database to domain
   */
  private mapToDomain(data: Record<string, unknown>): MetricDefinitionRecord {
    return {
      id: data.id as string,
      key: data.metric_key as string,
      name: data.metric_name as string,
      category: data.metric_category as MetricDefinitionRecord['category'],
      definition: data.metric_definition as string,
      lineage: data.lineage_payload as MetricLineageModel,
      unit: data.unit as string | null,
      status: data.status as 'active' | 'deprecated' | 'superseded',
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}

// ============================================================
// Factory
// ============================================================

let registry: MetricDefinitionRegistry | null = null;

export function getMetricDefinitionRegistry(): MetricDefinitionRegistry {
  if (!registry) {
    registry = new MetricDefinitionRegistry();
  }
  return registry;
}

// ============================================================
// Direct Exports
// ============================================================

export async function getMetricDefinition(metricKey: string): Promise<BiResult<MetricDefinitionRecord>> {
  return getMetricDefinitionRegistry().getMetricDefinition(metricKey);
}

export async function getAllMetricDefinitions(): Promise<BiResult<MetricDefinitionRecord[]>> {
  return getMetricDefinitionRegistry().getAllMetricDefinitions();
}

export async function registerMetricDefinition(input: {
  metricKey: string;
  metricName: string;
  metricCategory: string;
  metricDefinition: string;
  lineage: MetricLineageModel;
  unit?: string;
}): Promise<BiResult<MetricDefinitionRecord>> {
  return getMetricDefinitionRegistry().registerMetricDefinition(input);
}

export async function validateMetricRegistry(): Promise<BiResult<{
  total: number;
  byCategory: Record<string, number>;
  issues: string[];
}>> {
  return getMetricDefinitionRegistry().validateMetricRegistry();
}

export function buildMetricLineageSummary(metrics: MetricDefinitionRecord[]): ReturnType<MetricDefinitionRegistry['buildMetricLineageSummary']> {
  return getMetricDefinitionRegistry().buildMetricLineageSummary(metrics);
}
