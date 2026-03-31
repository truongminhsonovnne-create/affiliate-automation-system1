'use client';

/**
 * ClientProviders — client-only wrapper that creates QueryClient and AnalyticsProvider.
 *
 * QueryClient is a class instance. Next.js cannot serialize class instances across
 * the RSC boundary. By wrapping everything in a 'use client' component, we ensure
 * QueryClient is ONLY ever instantiated on the client side.
 */

import { QueryProvider } from '@/lib/query/queryClient';
import { AnalyticsProvider } from '@/lib/public/analytics-context';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AnalyticsProvider>
        {children}
      </AnalyticsProvider>
    </QueryProvider>
  );
}
