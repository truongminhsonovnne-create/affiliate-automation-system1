/**
 * Operator Actions UI Layer - Type Definitions
 * Production-grade typed interfaces for operator action management
 */

import { z } from 'zod';

// =============================================================================
// ACTION TYPES
// =============================================================================

/** All available operator action types */
export const OPERATOR_ACTION_TYPES = {
  // Publish Job Actions
  RETRY_PUBLISH_JOB: 'RETRY_PUBLISH_JOB',
  CANCEL_PUBLISH_JOB: 'CANCEL_PUBLISH_JOB',
  UNLOCK_PUBLISH_JOB: 'UNLOCK_PUBLISH_JOB',

  // Dead Letter Actions
  REQUEUE_DEAD_LETTER: 'REQUEUE_DEAD_LETTER',
  RESOLVE_DEAD_LETTER: 'RESOLVE_DEAD_LETTER',

  // Manual Operations
  TRIGGER_FLASH_SALE_CRAWL: 'TRIGGER_FLASH_SALE_CRAWL',
  TRIGGER_SEARCH_CRAWL: 'TRIGGER_SEARCH_CRAWL',
  TRIGGER_AI_ENRICHMENT: 'TRIGGER_AI_ENRICHMENT',
  TRIGGER_PUBLISH_PREPARATION: 'TRIGGER_PUBLISH_PREPARATION',
  TRIGGER_PUBLISHER_RUN: 'TRIGGER_PUBLISHER_RUN',
} as const;

export type OperatorActionType = typeof OPERATOR_ACTION_TYPES[keyof typeof OPERATOR_ACTION_TYPES];

/** Action type categories for grouping */
export type OperatorActionCategory =
  | 'publish_job'
  | 'dead_letter'
  | 'manual_operation'
  | 'bulk_operation';

export const OPERATOR_ACTION_CATEGORIES: Record<OperatorActionType, OperatorActionCategory> = {
  [OPERATOR_ACTION_TYPES.RETRY_PUBLISH_JOB]: 'publish_job',
  [OPERATOR_ACTION_TYPES.CANCEL_PUBLISH_JOB]: 'publish_job',
  [OPERATOR_ACTION_TYPES.UNLOCK_PUBLISH_JOB]: 'publish_job',
  [OPERATOR_ACTION_TYPES.REQUEUE_DEAD_LETTER]: 'dead_letter',
  [OPERATOR_ACTION_TYPES.RESOLVE_DEAD_LETTER]: 'dead_letter',
  [OPERATOR_ACTION_TYPES.TRIGGER_FLASH_SALE_CRAWL]: 'manual_operation',
  [OPERATOR_ACTION_TYPES.TRIGGER_SEARCH_CRAWL]: 'manual_operation',
  [OPERATOR_ACTION_TYPES.TRIGGER_AI_ENRICHMENT]: 'manual_operation',
  [OPERATOR_ACTION_TYPES.TRIGGER_PUBLISH_PREPARATION]: 'manual_operation',
  [OPERATOR_ACTION_TYPES.TRIGGER_PUBLISHER_RUN]: 'manual_operation',
};

// =============================================================================
// SEVERITY LEVELS
// =============================================================================

/** Severity levels for operator actions - affects UI styling and confirmation */
export const OPERATOR_ACTION_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  DESTRUCTIVE: 'destructive',
  CRITICAL: 'critical',
} as const;

export type OperatorActionSeverity = typeof OPERATOR_ACTION_SEVERITY[keyof typeof OPERATOR_ACTION_SEVERITY];

/** Map action type to default severity */
export const ACTION_DEFAULT_SEVERITY: Record<OperatorActionType, OperatorActionSeverity> = {
  [OPERATOR_ACTION_TYPES.RETRY_PUBLISH_JOB]: OPERATOR_ACTION_SEVERITY.WARNING,
  [OPERATOR_ACTION_TYPES.CANCEL_PUBLISH_JOB]: OPERATOR_ACTION_SEVERITY.DESTRUCTIVE,
  [OPERATOR_ACTION_TYPES.UNLOCK_PUBLISH_JOB]: OPERATOR_ACTION_SEVERITY.WARNING,
  [OPERATOR_ACTION_TYPES.REQUEUE_DEAD_LETTER]: OPERATOR_ACTION_SEVERITY.WARNING,
  [OPERATOR_ACTION_TYPES.RESOLVE_DEAD_LETTER]: OPERATOR_ACTION_SEVERITY.WARNING,
  [OPERATOR_ACTION_TYPES.TRIGGER_FLASH_SALE_CRAWL]: OPERATOR_ACTION_SEVERITY.INFO,
  [OPERATOR_ACTION_TYPES.TRIGGER_SEARCH_CRAWL]: OPERATOR_ACTION_SEVERITY.INFO,
  [OPERATOR_ACTION_TYPES.TRIGGER_AI_ENRICHMENT]: OPERATOR_ACTION_SEVERITY.INFO,
  [OPERATOR_ACTION_TYPES.TRIGGER_PUBLISH_PREPARATION]: OPERATOR_ACTION_SEVERITY.INFO,
  [OPERATOR_ACTION_TYPES.TRIGGER_PUBLISHER_RUN]: OPERATOR_ACTION_SEVERITY.WARNING,
};

// =============================================================================
// CAPABILITY DEFINITIONS
// =============================================================================

/** Operator capability levels */
export const OPERATOR_CAPABILITIES = {
  READONLY: 'readonly',
  OPERATE: 'operate',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;

export type OperatorCapability = typeof OPERATOR_CAPABILITIES[keyof typeof OPERATOR_CAPABILITIES];

/** Required capability for each action type */
export const ACTION_REQUIRED_CAPABILITY: Partial<Record<OperatorActionType, OperatorCapability>> = {
  [OPERATOR_ACTION_TYPES.RETRY_PUBLISH_JOB]: OPERATOR_CAPABILITIES.OPERATE,
  [OPERATOR_ACTION_TYPES.CANCEL_PUBLISH_JOB]: OPERATOR_CAPABILITIES.ADMIN,
  [OPERATOR_ACTION_TYPES.UNLOCK_PUBLISH_JOB]: OPERATOR_CAPABILITIES.OPERATE,
  [OPERATOR_ACTION_TYPES.REQUEUE_DEAD_LETTER]: OPERATOR_ACTION_CAPABILITIES.OPERATE,
  [OPERATOR_ACTION_TYPES.RESOLVE_DEAD_LETTER]: OPERATOR_CAPABILITIES.OPERATE,
  [OPERATOR_ACTION_TYPES.TRIGGER_FLASH_SALE_CRAWL]: OPERATOR_CAPABILITIES.OPERATE,
  [OPERATOR_ACTION_TYPES.TRIGGER_SEARCH_CRAWL]: OPERATOR_CAPABILITIES.OPERATE,
  [OPERATOR_ACTION_TYPES.TRIGGER_AI_ENRICHMENT]: OPERATOR_CAPABILITIES.OPERATE,
  [OPERATOR_ACTION_TYPES.TRIGGER_PUBLISH_PREPARATION]: OPERATOR_CAPABILITIES.OPERATE,
  [OPERATOR_ACTION_TYPES.TRIGGER_PUBLISHER_RUN]: OPERATOR_CAPABILITIES.ADMIN,
};

// =============================================================================
// TARGET TYPES
// =============================================================================

/** Target entity types for operator actions */
export const OPERATOR_TARGET_TYPES = {
  PUBLISH_JOB: 'publish_job',
  DEAD_LETTER: 'dead_letter',
  PRODUCT: 'product',
  CRAWL_JOB: 'crawl_job',
  PIPELINE: 'pipeline',
} as const;

export type OperatorTargetType = typeof OPERATOR_TARGET_TYPES[keyof typeof OPERATOR_TARGET_TYPES];

// =============================================================================
// ACTION CONTEXT
// =============================================================================

/** Context passed to actions for validation and UI */
export interface OperatorActionContext {
  /** Current user performing the action */
  actor: OperatorActor;

  /** Type of action being performed */
  actionType: OperatorActionType;

  /** Target entity type */
  targetType: OperatorTargetType;

  /** Target entity ID */
  targetId: string;

  /** Current state of the target entity (if available) */
  targetState?: Record<string, unknown>;

  /** Additional metadata for the action */
  metadata?: Record<string, unknown>;

  /** Timestamp when action was initiated */
  timestamp?: Date;
}

/** Actor performing the action */
export interface OperatorActor {
  /** Unique identifier for the actor */
  id: string;

  /** Display name */
  name: string;

  /** Email for audit purposes */
  email: string;

  /** Role/capability level */
  capability: OperatorCapability;

  /** Additional role identifiers */
  roles?: string[];
}

// =============================================================================
// ELIGIBILITY & GUARDS
// =============================================================================

/** Eligibility result for showing/executing an action */
export interface OperatorActionEligibility {
  /** Whether the action is eligible */
  eligible: boolean;

  /** Reason if not eligible */
  reason?: string;

  /** Warnings to display even if eligible */
  warnings?: string[];

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/** Guard result with detailed information */
export interface OperatorActionGuardResult {
  /** Whether the guard passes */
  passed: boolean;

  /** Guard name */
  guard: string;

  /** Reason if guard fails */
  reason?: string;

  /** Warnings generated by the guard */
  warnings?: string[];

  /** Severity of the guard result */
  severity?: OperatorActionSeverity;

  /** Metadata from the guard */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// MUTATION INPUTS & RESULTS
// =============================================================================

/** Base input for operator action mutations */
export interface OperatorActionMutationInput {
  /** Action type */
  actionType: OperatorActionType;

  /** Target entity ID */
  targetId: string;

  /** Optional payload for the action */
  payload?: Record<string, unknown>;

  /** Reason/notes for the action */
  reason?: string;

  /** Correlation ID for tracking */
  correlationId?: string;
}

/** Base result from operator action mutations */
export interface OperatorActionMutationResult {
  /** Whether the mutation was successful */
  success: boolean;

  /** Action type that was executed */
  actionType: OperatorActionType;

  /** Target entity ID */
  targetId: string;

  /** Result message */
  message?: string;

  /** Updated state of the target */
  updatedState?: Record<string, unknown>;

  /** Correlation ID */
  correlationId?: string;

  /** Timestamp of the mutation */
  timestamp?: Date;
}

// =============================================================================
// CONFIRMATION MODEL
// =============================================================================

/** Model for confirmation dialog */
export interface OperatorActionConfirmationModel {
  /** Unique identifier for this confirmation */
  id: string;

  /** Action type */
  actionType: OperatorActionType;

  /** Dialog title */
  title: string;

  /** Summary of the action */
  summary: string;

  /** Detailed description */
  description?: string;

  /** Warnings to display */
  warnings: string[];

  /** Consequences of the action */
  consequences: string[];

  /** Severity level */
  severity: OperatorActionSeverity;

  /** Confirm button label */
  confirmLabel: string;

  /** Cancel button label */
  cancelLabel: string;

  /** Target entity metadata for display */
  targetMetadata?: Record<string, unknown>;

  /** Whether the action requires typing target ID to confirm */
  requireTypingConfirmation?: boolean;

  /** String that user must type to confirm */
  typingConfirmationText?: string;

  /** Additional context */
  context?: OperatorActionContext;
}

// =============================================================================
// FEEDBACK MODEL
// =============================================================================

/** Feedback model for action results */
export interface OperatorActionFeedbackModel {
  /** Feedback type */
  type: 'success' | 'error' | 'warning' | 'info';

  /** Action type */
  actionType: OperatorActionType;

  /** Title message */
  title: string;

  /** Detailed message */
  message: string;

  /** Additional hints for the user */
  hints?: string[];

  /** Whether to show retry option */
  showRetry?: boolean;

  /** Whether to show refresh option */
  showRefresh?: boolean;

  /** Related entity ID */
  targetId?: string;

  /** Timestamp */
  timestamp: Date;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/** Operator action error types */
export const OPERATOR_ACTION_ERRORS = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  NOT_FOUND: 'NOT_FOUND',
  DEPENDENCY_FAILURE: 'DEPENDENCY_FAILURE',
  TIMEOUT: 'TIMEOUT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNSAFE_OPERATION: 'UNSAFE_OPERATION',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

export type OperatorActionErrorType = typeof OPERATOR_ACTION_ERRORS[keyof typeof OPERATOR_ACTION_ERRORS];

/** Operator action error */
export interface OperatorActionError {
  /** Error type */
  type: OperatorActionErrorType;

  /** Error message */
  message: string;

  /** Original error (if any) */
  originalError?: Error;

  /** Context for the error */
  context?: Record<string, unknown>;

  /** Whether the operation can be retried */
  retryable: boolean;

  /** HTTP status code if applicable */
  statusCode?: number;
}

// =============================================================================
// AUDIT HINTS
// =============================================================================

/** Audit hint for UI display */
export interface OperatorActionAuditHint {
  /** Whether this action is auditable */
  auditable: boolean;

  /** Notice to display */
  notice?: string;

  /** Additional audit metadata */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// PERMISSION STATE
// =============================================================================

/** Permission state for an action */
export interface OperatorActionPermissionState {
  /** Whether the action can be shown */
  canShow: boolean;

  /** Whether the action can be executed */
  canExecute: boolean;

  /** Reason if cannot show/execute */
  reason?: string;

  /** Warnings */
  warnings?: string[];

  /** Required capability */
  requiredCapability: OperatorCapability;

  /** Current actor capability */
  actorCapability: OperatorCapability;
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/** Input for bulk operations */
export interface BulkOperatorActionInput {
  /** Action type */
  actionType: OperatorActionType;

  /** Target entity IDs */
  targetIds: string[];

  /** Optional payload (applied to all) */
  payload?: Record<string, unknown>;

  /** Reason for the bulk action */
  reason?: string;

  /** Correlation ID */
  correlationId?: string;
}

/** Result from bulk operations */
export interface BulkOperatorActionResult {
  /** Overall success */
  success: boolean;

  /** Action type */
  actionType: OperatorActionType;

  /** Total targets */
  total: number;

  /** Successful operations */
  succeeded: number;

  /** Failed operations */
  failed: number;

  /** Individual results */
  results: Array<{
    targetId: string;
    success: boolean;
    message?: string;
    error?: OperatorActionError;
  }>;

  /** Correlation ID */
  correlationId?: string;
}

// =============================================================================
// MUTATION OPTIONS
// =============================================================================

/** Options for mutation hooks */
export interface OperatorActionMutationOptions {
  /** Callback on mutation success */
  onSuccess?: (result: OperatorActionMutationResult) => void;

  /** Callback on mutation error */
  onError?: (error: OperatorActionError) => void;

  /** Callback on mutation settled (success or error) */
  onSettled?: (result?: OperatorActionMutationResult, error?: OperatorActionError) => void;

  /** Whether to show toast notifications */
  showToast?: boolean;

  /** Whether to invalidate queries after success */
  invalidateQueries?: boolean;

  /** Custom invalidation scope */
  invalidationScope?: string[];
}

// =============================================================================
// ACTION BUTTON PROPS
// =============================================================================

/** Props for operator action button component */
export interface OperatorActionButtonProps {
  /** Action type */
  actionType: OperatorActionType;

  /** Target ID */
  targetId: string;

  /** Current target state */
  targetState?: Record<string, unknown>;

  /** Button variant */
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';

  /** Button size */
  size?: 'sm' | 'md' | 'lg';

  /** Custom label */
  label?: string;

  /** Whether to show icon */
  showIcon?: boolean;

  /** Disabled reason (if disabled) */
  disabledReason?: string;

  /** Custom className */
  className?: string;

  /** Loading state (external) */
  loading?: boolean;

  /** Callback when clicked */
  onClick?: () => void;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/** Standard API response wrapper */
export interface OperatorActionApiResponse<T> {
  /** Response data */
  data?: T;

  /** Error if any */
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };

  /** Metadata */
  metadata?: {
    timestamp: string;
    requestId: string;
    correlationId?: string;
  };
}

// =============================================================================
// ZOD SCHEMAS (for runtime validation)
// =============================================================================

/** Schema for actor */
export const OperatorActorSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  capability: z.enum(['readonly', 'operate', 'admin', 'super_admin']),
  roles: z.array(z.string()).optional(),
});

/** Schema for action context */
export const OperatorActionContextSchema = z.object({
  actor: OperatorActorSchema,
  actionType: z.string(),
  targetType: z.string(),
  targetId: z.string().uuid(),
  targetState: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.date().optional(),
});

/** Schema for mutation input */
export const OperatorActionMutationInputSchema = z.object({
  actionType: z.string(),
  targetId: z.string().uuid(),
  payload: z.record(z.unknown()).optional(),
  reason: z.string().optional(),
  correlationId: z.string().uuid().optional(),
});
