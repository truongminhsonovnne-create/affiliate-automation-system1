// =============================================================================
// Public Error Page
// Error state for public pages
// =============================================================================

'use client';

import { PublicShell } from '@/components/public/layout/PublicShell';
import { PublicErrorState } from '@/components/public/feedback/PublicErrorState';

interface PublicErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error page for public routes
 */
export default function PublicErrorPage({ error, reset }: PublicErrorPageProps) {
  return (
    <PublicShell>
      <PublicErrorState
        title="Đã xảy ra lỗi"
        message="Vui lòng thử lại sau."
        onRetry={reset}
      />
    </PublicShell>
  );
}
