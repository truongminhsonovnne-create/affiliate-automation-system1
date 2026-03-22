/**
 * Experimentation Types
 *
 * Type definitions for the experimentation framework
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export enum ExperimentType {
  RANKING = 'ranking',
  PRESENTATION = 'presentation',
  COPY = 'copy',
  FALLBACK = 'fallback',
  CTA = 'cta',
  HYBRID = 'hybrid',
}

export enum ExperimentStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  DISABLED = 'disabled',
}

export enum ExperimentScope {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  ADMIN = 'admin',
}

export enum ExperimentTargetSurface {
  PASTE_LINK = 'paste_link',
  VOUCHER_HERO = 'voucher_hero',
  NO_MATCH_FALLBACK = 'no_match_fallback',
  GROWTH_SHOP = 'growth_shop',
  GROWTH_CATEGORY = 'growth_category',
}

export enum AssignmentStrategy {
  RANDOM = 'random',
  HASH = 'hash',
  STICKY = 'sticky',
}

export enum ExposureType {
  RENDER = 'render',
  ACTION = 'action',
  CLICK = 'click',
  COPY = 'copy',
}

export enum OutcomeType {
  COPY_SUCCESS = 'copy_success',
  COPY_FAILURE = 'copy_failure',
  OPEN_SHOPEE = 'open_shopee',
  NO_MATCH = 'no_match',
  RESOLUTION_ERROR = 'resolution_error',
}

export enum TuningControlStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

export enum TuningControlType {
  RANKING_WEIGHT = 'ranking_weight',
  THRESHOLD = 'threshold',
  COUNT_LIMIT = 'count_limit',
  FEATURE_FLAG = 'feature_flag',
}

// ============================================================================
// Core Types
// ============================================================================

export interface ExperimentVariant {
  key: string;
  name: string;
  description?: string;
  weight?: number;
  config: Record<string, unknown>;
}

export interface ExperimentDefinition {
  id: string;
  experimentKey: string;
  experimentName: string;
  experimentType: ExperimentType;
  scope: ExperimentScope;
  status: ExperimentStatus;
  targetSurface: ExperimentTargetSurface;
  hypothesis?: string;
  rolloutPercentage: number;
  assignmentStrategy: AssignmentStrategy;
  variantDefinitions: ExperimentVariant[];
  targetingRules?: TargetingRule[];
  primaryMetric?: string;
  guardrailMetrics?: string[];
  startsAt?: Date;
  endsAt?: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TargetingRule {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'nin' | 'gt' | 'gte' | 'lt' | 'lte';
  value: unknown;
}

export interface ExperimentAssignment {
  id: string;
  experimentId: string;
  subjectKey: string;
  subjectType: 'session' | 'user' | 'request';
  variantKey: string;
  assignmentContext?: Record<string, unknown>;
  assignedAt: Date;
}

export interface ExperimentExposure {
  id: string;
  experimentId: string;
  variantKey: string;
  subjectKey: string;
  surface: ExperimentTargetSurface;
  exposureType: ExposureType;
  exposureContext?: Record<string, unknown>;
  createdAt: Date;
}

export interface ExperimentOutcome {
  id: string;
  experimentId: string;
  variantKey: string;
  subjectKey?: string;
  outcomeType: OutcomeType;
  outcomeValue?: number;
  outcomeContext?: Record<string, unknown>;
  createdAt: Date;
}

// ============================================================================
// Tuning Control Types
// ============================================================================

export interface TuningControlDefinition {
  id: string;
  controlKey: string;
  controlScope: string;
  controlType: TuningControlType;
  status: TuningControlStatus;
  currentValue: unknown;
  defaultValue: unknown;
  validationRules?: TuningControlValidation;
  environmentRules?: EnvironmentRule[];
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TuningControlValidation {
  type: 'range' | 'enum' | 'schema';
  min?: number;
  max?: number;
  allowed?: unknown[];
  schema?: Record<string, unknown>;
}

export interface EnvironmentRule {
  environment: string;
  value: unknown;
}

export interface TuningControlValue {
  key: string;
  value: unknown;
  scope: string;
  environment: string;
}

// ============================================================================
// Decision Types
// ============================================================================

export interface ExperimentRolloutDecision {
  allowed: boolean;
  reason?: string;
  rolloutPercentage?: number;
  shouldRollout?: boolean;
}

export interface ExperimentGuardrailDecision {
  passed: boolean;
  violations: GuardrailViolation[];
  shouldContinue?: boolean;
}

export interface GuardrailViolation {
  metric: string;
  threshold: number;
  actual: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface VariantAssignmentContext {
  experiment: ExperimentDefinition;
  variant: ExperimentVariant;
  subjectKey: string;
  assignmentBucket: number;
  rolloutPercentage: number;
}

// ============================================================================
// Analysis Types
// ============================================================================

export interface ExperimentEvaluationSummary {
  experimentId: string;
  experimentKey: string;
  status: ExperimentStatus;
  variants: VariantPerformance[];
  totalExposures: number;
  totalConversions: number;
  conversionRate: number;
  guardrailResults: GuardrailViolation[];
  recommendation: ExperimentRecommendation;
  analyzedAt: Date;
}

export interface VariantPerformance {
  variantKey: string;
  variantName: string;
  exposures: number;
  conversions: number;
  conversionRate: number;
  delta?: number;
  confidence?: number;
}

export interface ExperimentRecommendation {
  action: 'promote' | 'hold' | 'rollback' | 'continue' | 'disable';
  rationale: string;
  confidence: number;
}

// ============================================================================
// Audit Types
// ============================================================================

export interface RolloutAudit {
  id: string;
  entityType: 'experiment' | 'tuning_control';
  entityId?: string;
  actionType: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  actorId?: string;
  actorRole?: string;
  reason?: string;
  createdAt: Date;
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const ExperimentDefinitionSchema = z.object({
  id: z.string().uuid(),
  experimentKey: z.string().min(1),
  experimentName: z.string().min(1),
  experimentType: z.nativeEnum(ExperimentType),
  scope: z.nativeEnum(ExperimentScope),
  status: z.nativeEnum(ExperimentStatus),
  targetSurface: z.nativeEnum(ExperimentTargetSurface),
  hypothesis: z.string().optional(),
  rolloutPercentage: z.number().min(0).max(100),
  assignmentStrategy: z.nativeEnum(AssignmentStrategy),
  variantDefinitions: z.array(z.object({
    key: z.string(),
    name: z.string(),
    description: z.string().optional(),
    weight: z.number().optional(),
    config: z.record(z.unknown()),
  })),
  targetingRules: z.array(z.object({
    field: z.string(),
    operator: z.enum(['eq', 'neq', 'in', 'nin', 'gt', 'gte', 'lt', 'lte']),
    value: z.unknown(),
  })).optional(),
  primaryMetric: z.string().optional(),
  guardrailMetrics: z.array(z.string()).optional(),
  startsAt: z.date().optional(),
  endsAt: z.date().optional(),
  createdBy: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const TuningControlDefinitionSchema = z.object({
  id: z.string().uuid(),
  controlKey: z.string().min(1),
  controlScope: z.string(),
  controlType: z.nativeEnum(TuningControlType),
  status: z.nativeEnum(TuningControlStatus),
  currentValue: z.unknown(),
  defaultValue: z.unknown(),
  validationRules: z.object({
    type: z.enum(['range', 'enum', 'schema']),
    min: z.number().optional(),
    max: z.number().optional(),
    allowed: z.array(z.unknown()).optional(),
    schema: z.record(z.unknown()).optional(),
  }).optional(),
  environmentRules: z.array(z.object({
    environment: z.string(),
    value: z.unknown(),
  })).optional(),
  updatedBy: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================================================
// Type Guards
// ============================================================================

export function isExperimentType(value: string): value is ExperimentType {
  return Object.values(ExperimentType).includes(value as ExperimentType);
}

export function isExperimentStatus(value: string): value is ExperimentStatus {
  return Object.values(ExperimentStatus).includes(value as ExperimentStatus);
}

export function isValidVariantKey(experiment: ExperimentDefinition, key: string): boolean {
  return experiment.variantDefinitions.some(v => v.key === key);
}
