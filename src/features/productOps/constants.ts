/**
 * Product Ops Constants
 *
 * Centralized constants for Product Ops workbench frontend
 */

// ============================================================================
// Queue Configuration
// ============================================================================

export const QUEUE_CONFIG = {
  DEFAULT_PAGE_SIZE: 25,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100] as const,
  DEFAULT_SORT: {
    field: 'createdAt' as const,
    direction: 'desc' as const,
  },
  MAX_FILTERS: 10,
  SEARCH_MIN_LENGTH: 2,
} as const;

// ============================================================================
// Stale Thresholds
// ============================================================================

export const STALE_THRESHOLDS = {
  CRITICAL_HOURS: 4,
  HIGH_HOURS: 12,
  MEDIUM_HOURS: 48,
  LOW_HOURS: 168, // 7 days
  DEFAULT_HOURS: 24,
} as const;

// ============================================================================
// Decision Configuration
// ============================================================================

export const DECISION_CONFIG: Record<string, {
  label: string;
  description: string;
  confirmationText?: string;
}> = {
  accept: {
    label: 'Accept',
    description: 'Approve and proceed with recommendation',
  },
  reject: {
    label: 'Reject',
    description: 'Reject this case with rationale',
    confirmationText: 'reject',
  },
  defer: {
    label: 'Defer',
    description: 'Defer for later review',
  },
  needs_more_evidence: {
    label: 'Need More Evidence',
    description: 'Request additional evidence before decision',
  },
  close: {
    label: 'Close',
    description: 'Close this case without resolution',
    confirmationText: 'close',
  },
} as const;

export const DECISION_CONFIG_EXTENDED = {
  RATIONALE_MIN_LENGTH: 10,
  RATIONALE_MAX_LENGTH: 2000,
  RATIONALE_PLACEHOLDER: 'Provide rationale for this decision...',
  CONFIRMATION_REQUIRED_FOR: ['reject', 'close'],
  AUTO_TRANSITION_DELAY_MS: 300,
} as const;

export const DECISION_LABELS: Record<string, string> = {
  accept: 'Accept',
  reject: 'Reject',
  defer: 'Defer',
  needs_more_evidence: 'Need More Evidence',
  close: 'Close',
} as const;

export const DECISION_DESCRIPTIONS: Record<string, string> = {
  accept: 'Approve and proceed with recommendation',
  reject: 'Reject this case with rationale',
  defer: 'Defer for later review',
  needs_more_evidence: 'Request additional evidence before decision',
  close: 'Close this case without resolution',
} as const;

// ============================================================================
// Severity Configuration
// ============================================================================

export const SEVERITY_CONFIG = {
  COLORS: {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#ca8a04',
    low: '#16a34a',
  } as const,
  LABELS: {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  } as const,
  ICONS: {
    critical: 'alert-circle',
    high: 'alert-triangle',
    medium: 'info',
    low: 'check-circle',
  } as const,
  SORT_ORDER: {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  } as const,
} as const;

// ============================================================================
// Status Configuration
// ============================================================================

export const STATUS_CONFIG = {
  COLORS: {
    open: '#6b7280',
    in_review: '#3b82f6',
    pending_decision: '#f59e0b',
    accepted: '#10b981',
    rejected: '#ef4444',
    deferred: '#8b5cf6',
    needs_more_evidence: '#f97316',
    closed: '#4b5563',
  } as const,
  LABELS: {
    open: 'Open',
    in_review: 'In Review',
    pending_decision: 'Pending Decision',
    accepted: 'Accepted',
    rejected: 'Rejected',
    deferred: 'Deferred',
    needs_more_evidence: 'Needs More Evidence',
    closed: 'Closed',
  } as const,
} as const;

// ============================================================================
// Remediation Configuration
// ============================================================================

export const REMEDIATION_RISK_CONFIG = {
  COLORS: {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  } as const,
  LABELS: {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  } as const,
} as const;

export const REMEDIATION_STATUS_CONFIG = {
  COLORS: {
    pending_approval: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    rejected: 'bg-red-100 text-red-800',
    in_progress: 'bg-purple-100 text-purple-800',
    executed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  } as const,
  LABELS: {
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    in_progress: 'In Progress',
    executed: 'Executed',
    failed: 'Failed',
    cancelled: 'Cancelled',
  } as const,
} as const;

export const REMEDIATION_CONFIG = {
  RISK_COLORS: {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#ca8a04',
    low: '#16a34a',
  } as const,
  RISK_LABELS: {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  } as const,
  STATUS_LABELS: {
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    in_progress: 'In Progress',
    executed: 'Executed',
    failed: 'Failed',
    cancelled: 'Cancelled',
  } as const,
} as const;

// ============================================================================
// UI Configuration
// ============================================================================

export const UI_CONFIG = {
  TOAST_DURATION_MS: 5000,
  TOAST_ERROR_DURATION_MS: 8000,
  TOAST_SUCCESS_DURATION_MS: 4000,

  REFRESH_INTERVAL_MS: 60000, // 1 minute
  POLLING_INTERVAL_MS: 30000, // 30 seconds

  DEBOUNCE_MS: 300,
  ANIMATION_MS: 200,

  MAX_EVIDENCE_SECTIONS: 20,
  MAX_HISTORY_ENTRIES: 100,

  DATE_FORMAT: 'MMM d, yyyy',
  DATE_TIME_FORMAT: 'MMM d, yyyy h:mm a',
  TIME_AGO_THRESHOLD_DAYS: 7,
} as const;

// ============================================================================
// Query Configuration
// ============================================================================

export const QUERY_CONFIG = {
  STALE_TIME_MS: 30000, // 30 seconds
  CACHE_TIME_MS: 60000, // 1 minute
  RETRY_COUNT: 3,
  RETRY_DELAY_MS: 1000,

  INVALIDATION_DELAY_MS: 500,
} as const;

// ============================================================================
// Confirmation Messages
// ============================================================================

export const CONFIRMATION_MESSAGES = {
  REJECT_CASE: {
    title: 'Reject Case',
    message: 'Are you sure you want to reject this case? This action requires a rationale and will be logged.',
    confirmLabel: 'Reject',
    isDangerous: true,
  },
  CLOSE_CASE: {
    title: 'Close Case',
    message: 'Are you sure you want to close this case? This will archive the case without resolution.',
    confirmLabel: 'Close',
    isDangerous: true,
  },
  APPROVE_REMEDIATION: {
    title: 'Approve Remediation',
    message: 'Approving this remediation will allow execution. This action will be audited.',
    confirmLabel: 'Approve',
    isDangerous: false,
  },
  REJECT_REMEDIATION: {
    title: 'Reject Remediation',
    message: 'Rejecting this remediation will prevent execution. Please provide a rationale.',
    confirmLabel: 'Reject',
    isDangerous: true,
  },
  MARK_EXECUTED: {
    title: 'Mark as Executed',
    message: 'Confirm that all remediation actions have been executed successfully.',
    confirmLabel: 'Mark Executed',
    isDangerous: false,
  },
  ASSIGN_CASE: {
    title: 'Assign Case',
    message: 'Assign this case to yourself for review?',
    confirmLabel: 'Assign',
    isDangerous: false,
  },
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  STALE_STATE: 'This case has been modified. Please refresh and try again.',
  INVALID_TRANSITION: 'This status transition is not allowed.',
  VALIDATION_FAILED: 'Please check your input and try again.',
  DEPENDENCY_FAILED: 'Related action failed. Please try again.',
  AUDIT_REQUIRED: 'This action requires additional audit information.',
  INTERNAL_ERROR: 'An internal error occurred. Please try again later.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  NOT_FOUND: 'The requested resource was not found.',
} as const;

// ============================================================================
// Accessibility Labels
// ============================================================================

export const A11Y_LABELS = {
  SEVERITY_BADGE: 'Severity',
  STATUS_BADGE: 'Status',
  ASSIGNEE_AVATAR: 'Assigned to',
  STALE_INDICATOR: 'This item is stale',
  DECISION_BUTTON: 'Make decision',
  FILTER_DROPDOWN: 'Filter options',
  SORT_DROPDOWN: 'Sort options',
  EVIDENCE_SECTION: 'Evidence panel',
  RECOMMENDATION_SECTION: 'Recommendation panel',
  HISTORY_SECTION: 'Case history',
} as const;
