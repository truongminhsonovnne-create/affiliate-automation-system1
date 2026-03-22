/**
 * Query Client
 *
 * React Query client configuration with default options.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

const defaultQueryOptions = {
  staleTime: 1000 * 30, // 30 seconds
  gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
  retry: 1,
  refetchOnWindowFocus: false,
};

/**
 * Create a new query client with default options
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        ...defaultQueryOptions,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

// Default client instance
let queryClientInstance: QueryClient | null = null;

/**
 * Get or create the default query client
 */
export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server-side: create a new client for each request
    return createQueryClient();
  }

  // Client-side: use singleton
  if (!queryClientInstance) {
    queryClientInstance = createQueryClient();
  }
  return queryClientInstance;
}

/**
 * Query Client Provider wrapper component
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const client = getQueryClient();
  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
}

/**
 * Pre-fetch query helper
 */
export async function prefetchQuery<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>,
  options?: { staleTime?: number }
): Promise<void> {
  const client = getQueryClient();
  await client.prefetchQuery({
    queryKey,
    queryFn,
    staleTime: options?.staleTime ?? defaultQueryOptions.staleTime,
  });
}

/**
 * Invalidate queries helper
 */
export function invalidateQueries(
  queryKey: readonly unknown[],
  options?: { exact?: boolean }
): void {
  const client = getQueryClient();
  client.invalidateQueries({ queryKey, exact: options?.exact ?? true });
}

/**
 * Set query data helper
 */
export function setQueryData<T>(
  queryKey: readonly unknown[],
  data: T
): void {
  const client = getQueryClient();
  client.setQueryData(queryKey, data);
}

/**
 * Clear all queries
 */
export function clearQueryCache(): void {
  const client = getQueryClient();
  client.clear();
}
