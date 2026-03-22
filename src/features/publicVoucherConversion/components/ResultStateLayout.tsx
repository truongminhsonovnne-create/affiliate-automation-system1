// =============================================================================
// Result State Layout Component
// Production-grade layout for different result states
// =============================================================================

'use client';

import { ReactNode } from 'react';
import { VoucherConversionViewState } from '../types';
import { ResultSkeleton } from './ResultSkeleton';
import { ResultErrorState } from './ResultErrorState';
import { NoMatchResultView } from './NoMatchResultView';
import { VoucherNoMatchPresentationModel } from '../types';

interface ResultStateLayoutProps {
  /** Current view state */
  viewState: VoucherConversionViewState;
  /** Children when in success state */
  children?: ReactNode;
  /** Error message if in failure state */
  error?: string;
  /** No match model if in no_match state */
  noMatchModel?: VoucherNoMatchPresentationModel;
  /** Retry handler */
  onRetry?: () => void;
}

/**
 * Layout wrapper for different result states
 */
export function ResultStateLayout({
  viewState,
  children,
  error,
  noMatchModel,
  onRetry,
}: ResultStateLayoutProps) {
  switch (viewState) {
    case 'loading':
      return <ResultSkeleton />;

    case 'failure':
      return <ResultErrorState error={error} onRetry={onRetry} />;

    case 'no_match':
      if (noMatchModel) {
        return <NoMatchResultView model={noMatchModel} onRetry={onRetry} />;
      }
      return (
        <NoMatchResultView
          model={{
            viewState: 'no_match',
            message: 'Không tìm thấy voucher',
            suggestion: 'Thử sản phẩm khác hoặc kiểm tra lại link.',
            fallback: { hasFallback: false, message: '' },
            canRetry: !!onRetry,
          }}
          onRetry={onRetry}
        />
      );

    case 'success':
    case 'invalid_input':
    case 'rate_limited':
    default:
      return <>{children}</>;
  }
}
