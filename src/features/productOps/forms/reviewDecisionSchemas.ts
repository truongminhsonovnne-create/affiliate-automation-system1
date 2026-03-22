/**
 * Review Decision Schemas
 *
 * Zod schemas for validating review decision inputs
 */

import { z } from 'zod';
import { DECISION_CONFIG } from '../constants';

// ============================================================================
// Decision Rationale Schema
// ============================================================================

export const decisionRationaleSchema = z
  .string()
  .min(
    DECISION_CONFIG.RATIONALE_MIN_LENGTH,
    `Rationale must be at least ${DECISION_CONFIG.RATIONALE_MIN_LENGTH} characters`
  )
  .max(
    DECISION_CONFIG.RATIONALE_MAX_LENGTH,
    `Rationale must not exceed ${DECISION_CONFIG.RATIONALE_MAX_LENGTH} characters`
  )
  .optional();

// ============================================================================
// Accept Decision Schema
// ============================================================================

export const acceptDecisionSchema = z.object({
  caseId: z.string().min(1, 'Case ID is required'),
  decisionType: z.literal('accept'),
  rationale: decisionRationaleSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// Reject Decision Schema
// ============================================================================

export const rejectDecisionSchema = z.object({
  caseId: z.string().min(1, 'Case ID is required'),
  decisionType: z.literal('reject'),
  rationale: decisionRationaleSchema.min(
    DECISION_CONFIG.RATIONALE_MIN_LENGTH,
    'Rationale is required for rejection'
  ),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// Defer Decision Schema
// ============================================================================

export const deferDecisionSchema = z.object({
  caseId: z.string().min(1, 'Case ID is required'),
  decisionType: z.literal('defer'),
  rationale: decisionRationaleSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// Needs More Evidence Decision Schema
// ============================================================================

export const needsMoreEvidenceDecisionSchema = z.object({
  caseId: z.string().min(1, 'Case ID is required'),
  decisionType: z.literal('needs_more_evidence'),
  rationale: decisionRationaleSchema.min(
    DECISION_CONFIG.RATIONALE_MIN_LENGTH,
    'Rationale is required when requesting more evidence'
  ),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// Close Decision Schema
// ============================================================================

export const closeDecisionSchema = z.object({
  caseId: z.string().min(1, 'Case ID is required'),
  decisionType: z.literal('close'),
  rationale: decisionRationaleSchema.min(
    DECISION_CONFIG.RATIONALE_MIN_LENGTH,
    'Rationale is required when closing a case'
  ),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// Generic Decision Schema
// ============================================================================

export const reviewDecisionSchema = z.discriminatedUnion('decisionType', [
  acceptDecisionSchema,
  rejectDecisionSchema,
  deferDecisionSchema,
  needsMoreEvidenceDecisionSchema,
  closeDecisionSchema,
]);

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validate decision input based on decision type
 */
export function validateDecisionInput(input: {
  decisionType: string;
  rationale?: string;
}): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate rationale based on decision type
  if (input.decisionType === 'reject' || input.decisionType === 'close') {
    if (!input.rationale || input.rationale.length < DECISION_CONFIG.RATIONALE_MIN_LENGTH) {
      errors.push(
        `Rationale is required and must be at least ${DECISION_CONFIG.RATIONALE_MIN_LENGTH} characters for this action`
      );
    }
  }

  if (input.decisionType === 'needs_more_evidence') {
    if (!input.rationale || input.rationale.length < DECISION_CONFIG.RATIONALE_MIN_LENGTH) {
      errors.push(
        'Please specify what additional evidence is needed'
      );
    }
  }

  // Validate rationale length
  if (input.rationale && input.rationale.length > DECISION_CONFIG.RATIONALE_MAX_LENGTH) {
    errors.push(
      `Rationale must not exceed ${DECISION_CONFIG.RATIONALE_MAX_LENGTH} characters`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if rationale is required for a decision type
 */
export function isRationaleRequired(decisionType: string): boolean {
  return ['reject', 'close', 'needs_more_evidence'].includes(decisionType);
}

/**
 * Get validation message for decision type
 */
export function getDecisionValidationMessage(decisionType: string): string {
  switch (decisionType) {
    case 'reject':
      return `Please provide a rationale for rejecting this case (minimum ${DECISION_CONFIG.RATIONALE_MIN_LENGTH} characters)`;
    case 'close':
      return `Please provide a rationale for closing this case (minimum ${DECISION_CONFIG.RATIONALE_MIN_LENGTH} characters)`;
    case 'needs_more_evidence':
      return 'Please specify what additional evidence is needed';
    default:
      return 'Please provide a rationale for this decision';
  }
}
