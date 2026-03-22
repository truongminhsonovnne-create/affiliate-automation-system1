/**
 * Experimentation API Types
 */

export interface ExperimentDto {
  id: string;
  experimentKey: string;
  experimentName: string;
  status: string;
  rolloutPercentage: number;
  variants: Array<{ key: string; name: string }>;
}

export interface ExperimentSummaryDto {
  total: number;
  active: number;
  paused: number;
}

export interface TuningControlDto {
  controlKey: string;
  controlScope: string;
  status: string;
  currentValue: unknown;
}

export interface ExperimentAnalysisDto {
  experimentKey: string;
  variants: Array<{
    key: string;
    exposures: number;
    conversions: number;
    conversionRate: number;
  }>;
}
