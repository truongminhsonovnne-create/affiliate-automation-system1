// =============================================================================
// Public Loading Page
// Loading state for public pages
// =============================================================================

import { PublicShell } from '@/components/public/layout/PublicShell';
import { PublicLoadingState } from '@/components/public/feedback/PublicLoadingState';

/**
 * Loading page for public routes
 */
export default function PublicLoadingPage() {
  return (
    <PublicShell>
      <PublicLoadingState message="Đang tải..." />
    </PublicShell>
  );
}
