// =============================================================================
// Use Result Interaction State Hook
// Production-grade hook for managing result interaction state
// =============================================================================

'use client';

import { useState, useCallback } from 'react';
import { PublicInteractionFeedbackState } from '../types';

interface UseResultInteractionStateOptions {
  /** Called when explanation is expanded */
  onExplanationExpand?: () => void;
  /** Called when candidate is selected */
  onCandidateSelect?: (candidateId: string) => void;
  /** Called when CTA is focused */
  onCtaFocus?: (ctaType: 'copy' | 'open_shopee') => void;
}

interface UseResultInteractionStateReturn {
  /** Current feedback state */
  feedbackState: PublicInteractionFeedbackState;
  /** Whether explanation is expanded */
  explanationExpanded: boolean;
  /** Selected candidate ID */
  selectedCandidateId: string | null;
  /** Focused CTA type */
  focusedCta: 'copy' | 'open_shopee' | null;
  /** Toggle explanation expanded */
  toggleExplanation: () => void;
  /** Set explanation expanded */
  setExplanationExpanded: (expanded: boolean) => void;
  /** Select a candidate */
  selectCandidate: (candidateId: string) => void;
  /** Clear selected candidate */
  clearSelectedCandidate: () => void;
  /** Set focused CTA */
  setFocusedCta: (cta: 'copy' | 'open_shopee' | null) => void;
  /** Clear focused CTA */
  clearFocusedCta: () => void;
  /** Show copy success feedback */
  showCopySuccess: (message?: string) => void;
  /** Show copy error feedback */
  showCopyError: (message: string) => void;
  /** Clear all feedback */
  clearFeedback: () => void;
}

/**
 * Hook for managing result interaction state
 */
export function useResultInteractionState(
  options?: UseResultInteractionStateOptions
): UseResultInteractionStateReturn {
  const [feedbackState, setFeedbackState] = useState<PublicInteractionFeedbackState>({
    copyFeedback: 'idle',
    openFeedback: 'idle',
    feedbackMessage: undefined,
  });

  const [explanationExpanded, setExplanationExpanded] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [focusedCta, setFocusedCta] = useState<'copy' | 'open_shopee' | null>(null);

  const toggleExplanation = useCallback(() => {
    setExplanationExpanded((prev) => !prev);
    if (!explanationExpanded) {
      options?.onExplanationExpand?.();
    }
  }, [explanationExpanded, options]);

  const selectCandidate = useCallback((candidateId: string) => {
    setSelectedCandidateId(candidateId);
    options?.onCandidateSelect?.(candidateId);
  }, [options]);

  const clearSelectedCandidate = useCallback(() => {
    setSelectedCandidateId(null);
  }, []);

  const setFocusedCtaState = useCallback((cta: 'copy' | 'open_shopee' | null) => {
    setFocusedCta(cta);
    if (cta) {
      options?.onCtaFocus?.(cta);
    }
  }, [options]);

  const clearFocusedCta = useCallback(() => {
    setFocusedCta(null);
  }, []);

  const showCopySuccess = useCallback((message?: string) => {
    setFeedbackState({
      copyFeedback: 'success',
      openFeedback: 'idle',
      feedbackMessage: message || '✓ Đã sao chép!',
    });

    // Auto-clear after duration
    setTimeout(() => {
      setFeedbackState({
        copyFeedback: 'idle',
        openFeedback: 'idle',
        feedbackMessage: undefined,
      });
    }, 2000);
  }, []);

  const showCopyError = useCallback((message: string) => {
    setFeedbackState({
      copyFeedback: 'error',
      openFeedback: 'idle',
      feedbackMessage: message,
    });

    // Auto-clear after duration
    setTimeout(() => {
      setFeedbackState({
        copyFeedback: 'idle',
        openFeedback: 'idle',
        feedbackMessage: undefined,
      });
    }, 3000);
  }, []);

  const clearFeedback = useCallback(() => {
    setFeedbackState({
      copyFeedback: 'idle',
      openFeedback: 'idle',
      feedbackMessage: undefined,
    });
  }, []);

  return {
    feedbackState,
    explanationExpanded,
    selectedCandidateId,
    focusedCta,
    toggleExplanation,
    setExplanationExpanded,
    selectCandidate,
    clearSelectedCandidate,
    setFocusedCta: setFocusedCtaState,
    clearFocusedCta,
    showCopySuccess,
    showCopyError,
    clearFeedback,
  };
}
