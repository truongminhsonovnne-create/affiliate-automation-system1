// =============================================================================
// Public Page Container
// Minimal container for public pages
// =============================================================================

import { ReactNode } from 'react';

interface PublicPageContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Page container with centered content
 */
export function PublicPageContainer({ children, className = '' }: PublicPageContainerProps) {
  return (
    <div className={`max-w-2xl mx-auto px-4 py-8 ${className}`}>
      {children}
    </div>
  );
}
