/**
 * Query Keys
 *
 * Centralized query key factory for React Query.
 * Ensures consistent cache keys across the application.
 */

export const queryKeys = {
  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    overview: (filters?: Record<string, unknown>) => [...queryKeys.dashboard.all, 'overview', filters] as const,
    activity: (filters?: Record<string, unknown>) => [...queryKeys.dashboard.all, 'activity', filters] as const,
    failureInsights: (filters?: Record<string, unknown>) => [...queryKeys.dashboard.all, 'failure-insights', filters] as const,
    trends: (filters?: Record<string, unknown>) => [...queryKeys.dashboard.all, 'trends', filters] as const,
  },

  // Products
  products: {
    all: ['products'] as const,
    list: (filters?: Record<string, unknown>) => [...products.all, 'list', filters] as const,
    detail: (id: string) => [...products.all, 'detail', id] as const,
  },

  // Crawl Jobs
  crawlJobs: {
    all: ['crawl-jobs'] as const,
    list: (filters?: Record<string, unknown>) => [...crawlJobs.all, 'list', filters] as const,
    detail: (id: string) => [...crawlJobs.all, 'detail', id] as const,
  },

  // Publish Jobs
  publishJobs: {
    all: ['publish-jobs'] as const,
    list: (filters?: Record<string, unknown>) => [...publishJobs.all, 'list', filters] as const,
    detail: (id: string) => [...publishJobs.all, 'detail', id] as const,
  },

  // AI Contents
  aiContents: {
    all: ['ai-contents'] as const,
    list: (filters?: Record<string, unknown>) => [...aiContents.all, 'list', filters] as const,
    detail: (id: string) => [...aiContents.all, 'detail', id] as const,
  },

  // Dead Letters
  deadLetters: {
    all: ['dead-letters'] as const,
    list: (filters?: Record<string, unknown>) => [...deadLetters.all, 'list', filters] as const,
    detail: (id: string) => [...deadLetters.all, 'detail', id] as const,
  },

  // Workers
  workers: {
    all: ['workers'] as const,
    list: (filters?: Record<string, unknown>) => [...workers.all, 'list', filters] as const,
    detail: (identity: string) => [...workers.all, 'detail', identity] as const,
  },
} as const;

// Type-safe aliases
const dashboard = queryKeys.dashboard;
const products = queryKeys.products;
const crawlJobs = queryKeys.crawlJobs;
const publishJobs = queryKeys.publishJobs;
const aiContents = queryKeys.aiContents;
const deadLetters = queryKeys.deadLetters;
const workers = queryKeys.workers;

export {
  dashboard,
  products,
  crawlJobs,
  publishJobs,
  aiContents,
  deadLetters,
  workers,
};
