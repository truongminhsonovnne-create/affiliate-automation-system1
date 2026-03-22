// =============================================================================
// Public Empty State
// Clean empty state for public pages
// =============================================================================

interface PublicEmptyStateProps {
  title?: string;
  message?: string;
}

/**
 * Minimal empty state
 */
export function PublicEmptyState({
  title = 'Không có dữ liệu',
  message = 'Không tìm thấy thông tin.',
}: PublicEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-gray-400 mb-4">
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  );
}
