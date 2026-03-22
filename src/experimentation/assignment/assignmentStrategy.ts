/**
 * Assignment Strategy
 *
 * Deterministic experiment assignment logic
 */

import { randomUUID } from 'crypto';
import {
  ExperimentDefinition,
  ExperimentVariant,
  VariantAssignmentContext,
} from '../types/index.js';
import { ASSIGNMENT_CONFIG } from '../constants/index.js';

// ============================================================================
// Types
// ============================================================================

export interface AssignmentInput {
  experiment: ExperimentDefinition;
  subjectKey: string;
  context?: Record<string, unknown>;
}

export interface AssignmentResult {
  success: boolean;
  variant?: ExperimentVariant;
  bucket?: number;
  reason?: string;
}

// ============================================================================
// Main Assignment Function
// ============================================================================

/**
 * Assign a subject to a variant deterministically
 */
export function assignExperimentVariant(input: AssignmentInput): AssignmentResult {
  const { experiment, subjectKey, context } = input;

  // Check if experiment is running
  if (experiment.status !== 'running') {
    return {
      success: false,
      reason: `Experiment status is ${experiment.status}, not running`,
    };
  }

  // Check rollout percentage
  if (!isInRollout(experiment.rolloutPercentage)) {
    return {
      success: false,
      reason: 'Subject not in rollout percentage',
    };
  }

  // Compute bucket
  const bucket = computeAssignmentBucket(subjectKey, experiment.experimentKey);

  // Check if bucket is within rollout
  if (bucket >= experiment.rolloutPercentage) {
    return {
      success: false,
      bucket,
      reason: 'Subject bucket outside rollout range',
    };
  }

  // Assign variant based on strategy
  const variant = assignVariantByStrategy(experiment, bucket);

  if (!variant) {
    return {
      success: false,
      bucket,
      reason: 'Failed to assign variant',
    };
  }

  return {
    success: true,
    variant,
    bucket,
  };
}

/**
 * Compute deterministic bucket for subject
 */
export function computeAssignmentBucket(subjectKey: string, experimentKey: string): number {
  const combined = `${experimentKey}:${subjectKey}:${ASSIGNMENT_CONFIG.HASH_SALT}`;
  const hash = hashString(combined);
  const bucket = hash % ASSIGNMENT_CONFIG.BUCKET_COUNT;
  return Math.floor((bucket / ASSIGNMENT_CONFIG.BUCKET_COUNT) * 100);
}

/**
 * Check if subject is in rollout percentage
 */
export function isInRollout(rolloutPercentage: number): boolean {
  return rolloutPercentage > 0;
}

/**
 * Assign variant based on strategy
 */
function assignVariantByStrategy(
  experiment: ExperimentDefinition,
  bucket: number
): ExperimentVariant | null {
  const variants = experiment.variantDefinitions;

  if (variants.length === 0) {
    return null;
  }

  // Simple random-like but deterministic based on bucket
  const variantIndex = bucket % variants.length;
  return variants[variantIndex];
}

/**
 * Build experiment assignment context
 */
export function buildExperimentAssignment(
  experiment: ExperimentDefinition,
  variant: ExperimentVariant,
  subjectKey: string,
  bucket: number
): VariantAssignmentContext {
  return {
    experiment,
    variant,
    subjectKey,
    assignmentBucket: bucket,
    rolloutPercentage: experiment.rolloutPercentage,
  };
}

// ============================================================================
// Eligibility Checking
// ============================================================================

/**
 * Check if subject is eligible for experiment
 */
export function isSubjectEligibleForExperiment(
  experiment: ExperimentDefinition,
  context: {
    environment?: string;
    surface?: string;
    platform?: string;
    isLoggedIn?: boolean;
    hasUsedTool?: boolean;
  }
): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Check status
  if (experiment.status !== 'running') {
    reasons.push(`Experiment status is ${experiment.status}`);
  }

  // Check time window
  const now = new Date();
  if (experiment.startsAt && now < experiment.startsAt) {
    reasons.push('Experiment has not started yet');
  }
  if (experiment.endsAt && now > experiment.endsAt) {
    reasons.push('Experiment has ended');
  }

  // Check scope
  if (experiment.scope === 'internal' && context.isLoggedIn === false) {
    reasons.push('Experiment requires internal users');
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Simple hash function for deterministic assignment
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Validate experiment variant definitions
 */
export function validateVariantDefinitions(variants: ExperimentVariant[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (variants.length < 2) {
    errors.push('Experiment must have at least 2 variants');
  }

  if (variants.length > 10) {
    errors.push('Experiment cannot have more than 10 variants');
  }

  const keys = new Set<string>();
  for (const variant of variants) {
    if (!variant.key) {
      errors.push('Variant key is required');
    }
    if (keys.has(variant.key)) {
      errors.push(`Duplicate variant key: ${variant.key}`);
    }
    keys.add(variant.key);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get control variant (first one)
 */
export function getControlVariant(experiment: ExperimentDefinition): ExperimentVariant | null {
  return experiment.variantDefinitions[0] || null;
}

/**
 * Get treatment variants (all except control)
 */
export function getTreatmentVariants(experiment: ExperimentDefinition): ExperimentVariant[] {
  return experiment.variantDefinitions.slice(1);
}
