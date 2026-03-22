'use client';

/**
 * ErrorState — Full-page error state for data fetch failures.
 *
 * Usage:
 *   <ErrorState
 *     title="Không thể tải dữ liệu"
 *     message="Đã xảy ra sự cố khi lấy dữ liệu từ máy chủ."
 *     onRetry={refetch}
 *   />
 *
 *   // Short form — uses defaults
 *   <ErrorState onRetry={refetch} />
 */

import clsx from 'clsx';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';

export interface ErrorStateProps {
  /** Override the default title */
  title?: string;
  /** Override the default message */
  message?: string;
  /** Called when the user clicks retry */
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Không thể tải dữ liệu',
  message = 'Đã xảy ra sự cố khi lấy dữ liệu từ máy chủ. Vui lòng thử lại trong giây lát.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={clsx(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-red-500" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-md mb-4">{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
          onClick={onRetry}
        >
          Thử lại
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
