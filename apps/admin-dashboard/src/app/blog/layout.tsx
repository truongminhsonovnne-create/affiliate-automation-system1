/**
 * Blog Layout — wraps all /blog/* routes with the public site Header + Footer.
 *
 * This cascades to:
 *   /blog          → blog/layout.tsx → PublicLayout → BlogPage
 *   /blog/[slug]   → blog/layout.tsx → PublicLayout → BlogPostPage
 */

import { PublicLayout } from '@/components/public/PublicLayoutNew';
import { Suspense } from 'react';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicLayout>
      <Suspense>{children}</Suspense>
    </PublicLayout>
  );
}
