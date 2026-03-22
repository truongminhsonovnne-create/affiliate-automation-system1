/**
 * BI API Types
 */

import type {
  ExecutiveScorecardDto,
  ExecutiveScorecardPackDto,
  OperatorBiViewDto,
  StrategicDecisionRecommendationDto,
  BiAlertDto,
  MetricDefinitionDto,
} from '../types.js';

/**
 * Executive scorecard pack response
 */
export interface ExecutiveScorecardPackResponse {
  success: boolean;
  data?: ExecutiveScorecardPackDto;
  error?: string;
}

/**
 * Operator BI view response
 */
export interface OperatorBiViewResponse {
  success: boolean;
  data?: OperatorBiViewDto;
  error?: string;
}

/**
 * Decision support response
 */
export interface DecisionSupportResponse {
  success: boolean;
  data?: StrategicDecisionRecommendationDto[];
  error?: string;
}

/**
 * Alerts response
 */
export interface AlertsResponse {
  success: boolean;
  data?: BiAlertDto[];
  error?: string;
}

/**
 * Metric definition response
 */
export interface MetricDefinitionResponse {
  success: boolean;
  data?: MetricDefinitionDto;
  error?: string;
}

/**
 * Date range request
 */
export interface DateRangeRequest {
  startDate: string;
  endDate: string;
}

/**
 * Scorecard build request
 */
export interface ScorecardBuildRequest extends DateRangeRequest {
  types?: string[];
}
