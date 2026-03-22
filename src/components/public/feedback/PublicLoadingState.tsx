// =============================================================================
// Public Loading State
// Clean loading indicator for public pages
// =============================================================================

interface PublicLoadingStateProps {
  message?: string;
}

/**
 * Minimal loading state
 */
export function PublicLoadingState({ message = 'Đang tìm mã giảm giá...' }: PublicLoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4" />
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  );
}
