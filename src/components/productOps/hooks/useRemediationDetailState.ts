/**
 * Use Remediation Detail State Hook
 *
 * Hook for managing remediation detail UI state
 */

import { useState, useCallback } from 'react';

interface UseRemediationDetailStateOptions {
  initialDecisionType?: 'approve' | 'reject';
}

interface UseRemediationDetailStateReturn {
  // Decision dialog state
  isDecisionDialogOpen: boolean;
  decisionDialogType: 'approve' | 'reject' | null;
  openDecisionDialog: (type: 'approve' | 'reject') => void;
  closeDecisionDialog: () => void;

  // Loading states
  isSubmitting: boolean;
  setIsSubmitting: (loading: boolean) => void;

  // Execution dialog state
  isExecutionDialogOpen: boolean;
  openExecutionDialog: () => void;
  closeExecutionDialog: () => void;

  // Selected action index
  selectedActionIndex: number;
  setSelectedActionIndex: (index: number) => void;

  // Show execution notes
  showExecutionNotes: boolean;
  setShowExecutionNotes: (show: boolean) => void;
}

export function useRemediationDetailState(
  options: UseRemediationDetailStateOptions = {}
): UseRemediationDetailStateReturn {
  const { initialDecisionType } = options;

  // Decision dialog state
  const [isDecisionDialogOpen, setIsDecisionDialogOpen] = useState(false);
  const [decisionDialogType, setDecisionDialogType] = useState<'approve' | 'reject' | null>(
    initialDecisionType || null
  );

  const openDecisionDialog = useCallback((type: 'approve' | 'reject') => {
    setDecisionDialogType(type);
    setIsDecisionDialogOpen(true);
  }, []);

  const closeDecisionDialog = useCallback(() => {
    setIsDecisionDialogOpen(false);
    setDecisionDialogType(null);
  }, []);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Execution dialog state
  const [isExecutionDialogOpen, setIsExecutionDialogOpen] = useState(false);

  const openExecutionDialog = useCallback(() => {
    setIsExecutionDialogOpen(true);
  }, []);

  const closeExecutionDialog = useCallback(() => {
    setIsExecutionDialogOpen(false);
  }, []);

  // Selected action index for details
  const [selectedActionIndex, setSelectedActionIndex] = useState(0);

  // Show execution notes
  const [showExecutionNotes, setShowExecutionNotes] = useState(false);

  return {
    // Decision dialog
    isDecisionDialogOpen,
    decisionDialogType,
    openDecisionDialog,
    closeDecisionDialog,

    // Loading
    isSubmitting,
    setIsSubmitting,

    // Execution dialog
    isExecutionDialogOpen,
    openExecutionDialog,
    closeExecutionDialog,

    // Action selection
    selectedActionIndex,
    setSelectedActionIndex,

    // Execution notes
    showExecutionNotes,
    setShowExecutionNotes,
  };
}

export default useRemediationDetailState;
