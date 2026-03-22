// =============================================================================
// Public Shell
// Minimal, clean shell for public pages
// =============================================================================

import { ReactNode } from 'react';
import { PublicPageContainer } from './PublicPageContainer';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

interface PublicShellProps {
  children: ReactNode;
}

/**
 * Minimal shell for public-facing pages
 */
export function PublicShell({ children }: PublicShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader />
      <main className="flex-1">
        <PublicPageContainer>
          {children}
        </PublicPageContainer>
      </main>
      <PublicFooter />
    </div>
  );
}
