/**
 * Operator Actions - Main Export
 * Production-grade operator action UI layer for Affiliate Automation System
 */

// =============================================================================
// TYPES
// =============================================================================

export * from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

export * from './constants';

// =============================================================================
// CONTRACTS
// =============================================================================

export * from './contracts';

// =============================================================================
// API
// =============================================================================

export * from './api/operatorActionsApi';

// =============================================================================
// PERMISSIONS
// =============================================================================

export * from './permissions/operatorActionPermissions';

// =============================================================================
// GUARDS
// =============================================================================

export * from './guards/operatorActionGuards';

// =============================================================================
// MUTATIONS
// =============================================================================

export * from './mutations/useOperatorActionMutation';
export * from './mutations/usePublishJobMutations';
export * from './mutations/useDeadLetterMutations';
export * from './mutations/usePipelineMutations';

// =============================================================================
// QUERY INVALIDATION
// =============================================================================

export * from './queryInvalidation';

// =============================================================================
// CONFIRMATION
// =============================================================================

export * from './confirmation/buildConfirmationModel';

// =============================================================================
// COMPONENTS
// =============================================================================

export { ActionConfirmationDialog } from './components/ActionConfirmationDialog';
export type { ActionConfirmationDialogProps } from './components/ActionConfirmationDialog';

export { ActionResultToast, ToastContainer } from './components/ActionResultToast';
export type { ActionResultToastProps, ToastContainerProps } from './components/ActionResultToast';
export { buildSuccessToast, buildErrorToast, buildWarningToast } from './components/ActionResultToast';

export { OperatorActionButton } from './components/OperatorActionButton';
export type { OperatorActionButtonComponentProps } from './components/OperatorActionButton';

export { PublishJobActionsPanel } from './components/PublishJobActionsPanel';
export type { PublishJobActionsPanelProps } from './components/PublishJobActionsPanel';

export { DeadLetterActionsPanel } from './components/DeadLetterActionsPanel';
export type { DeadLetterActionsPanelProps } from './components/DeadLetterActionsPanel';

export { ManualOperationsPanel } from './components/ManualOperationsPanel';
export type { ManualOperationsPanelProps } from './components/ManualOperationsPanel';

// =============================================================================
// FORMS
// =============================================================================

export * from './forms/manualRunSchemas';

export { ManualSearchCrawlForm } from './forms/ManualSearchCrawlForm';
export { ManualAiEnrichmentForm } from './forms/ManualAiEnrichmentForm';
export { ManualPublishPreparationForm } from './forms/ManualPublishPreparationForm';
export { ManualPublisherRunForm } from './forms/ManualPublisherRunForm';
export { ManualFlashSaleCrawlForm } from './forms/ManualFlashSaleCrawlForm';

// =============================================================================
// AUDIT
// =============================================================================

export * from './audit/operatorActionAuditHints';

// =============================================================================
// ERROR HANDLING
// =============================================================================

export * from './errorHandling/operatorActionErrorPresenter';

// =============================================================================
// BULK
// =============================================================================

export * from './bulk/bulkActionPlanner';

// =============================================================================
// INITIALIZATION
// =============================================================================

import { initOperatorActionsApi } from './api/operatorActionsApi';

/**
 * Initialize the operator actions API client
 * Call this once when your app starts
 */
export function initializeOperatorActions(config: {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
}) {
  initOperatorActionsApi(config);
}
