/**
 * Use Case Detail State Hook
 *
 * Hook for managing case detail UI state
 */

import { useState, useCallback, useMemo } from 'react';
import type { ProductOpsDecisionType } from '../../features/productOps/types';

interface UseCaseDetailStateOptions {
  initialDecisionType?: ProductOpsDecisionType;
}

interface UseCaseDetailStateReturn {
  // Active panel state
  activePanel: 'evidence' | 'recommendation' | 'history' | 'details';
  setActivePanel: (panel: 'evidence' | 'recommendation' | 'history' | 'details') => void;

  // Decision dialog state
  isDecisionDialogOpen: boolean;
  decisionDialogType: ProductOpsDecisionType | null;
  openDecisionDialog: (type: ProductOpsDecisionType) => void;
  closeDecisionDialog: () => void;

  // Assignment dialog state
  isAssignmentDialogOpen: boolean;
  openAssignmentDialog: () => void;
  closeAssignmentDialog: () => void;

  // Loading states
  isSubmitting: boolean;
  setIsSubmitting: (loading: boolean) => void;

  // Selected tab for evidence sections
  selectedEvidenceSection: number;
  setSelectedEvidenceSection: (index: number) => void;
}

export function useCaseDetailState(options: UseCaseDetailStateOptions = {}): UseCaseDetailStateReturn {
  const { initialDecisionType } = options;

  // Active panel state
  const [activePanel, setActivePanel] = useState<'evidence' | 'recommendation' | 'history' | 'details'>('evidence');

  // Decision dialog state
  const [isDecisionDialogOpen, setIsDecisionDialogOpen] = useState(false);
  const [decisionDialogType, setDecisionDialogType] = useState<ProductOpsDecisionType | null>(initialDecisionType || null);

  const openDecisionDialog = useCallback((type: ProductOpsDecisionType) => {
    setDecisionDialogType(type);
    setIsDecisionDialogOpen(true);
  }, []);

  const closeDecisionDialog = useCallback(() => {
    setIsDecisionDialogOpen(false);
    setDecisionDialogType(null);
  }, []);

  // Assignment dialog state
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);

  const openAssignmentDialog = useCallback(() => {
    setIsAssignmentDialogOpen(true);
  }, []);

  const closeAssignmentDialog = useCallback(() => {
    setIsAssignmentDialogOpen(false);
  }, []);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Evidence section selection
  const [selectedEvidenceSection, setSelectedEvidenceSection] = useState(0);

  return {
    // Active panel
    activePanel,
    setActivePanel,

    // Decision dialog
    isDecisionDialogOpen,
    decisionDialogType,
    openDecisionDialog,
    closeDecisionDialog,

    // Assignment dialog
    isAssignmentDialogOpen,
    openAssignmentDialog,
    closeAssignmentDialog,

    // Loading
    isSubmitting,
    setIsSubmitting,

    // Evidence
    selectedEvidenceSection,
    setSelectedEvidenceSection,
  };
}

export default useCaseDetailState;
