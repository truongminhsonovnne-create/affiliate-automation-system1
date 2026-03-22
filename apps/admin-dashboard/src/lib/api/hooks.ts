import {
  fetchDashboardOverview as apiFetchDashboardOverview,
  fetchProducts as apiFetchProducts,
  fetchCrawlJobs as apiFetchCrawlJobs,
  fetchPublishJobs as apiFetchPublishJobs,
  fetchAiContents as apiFetchAiContents,
  fetchDeadLetters as apiFetchDeadLetters,
  fetchWorkers as apiFetchWorkers,
  fetchActivityFeed as apiFetchActivityFeed,
  fetchFailureInsights as apiFetchFailureInsights,
  fetchFailureTrends as apiFetchFailureTrends,
} from './dashboardApi';

/**
 * Dashboard overview API hooks
 */
export function useDashboardOverview() {
  return {
    fetchDashboardOverview: () => apiFetchDashboardOverview(),
    fetchRecentActivity: () => apiFetchActivityFeed({ page: 1, pageSize: 10 }),
  };
}

/**
 * Products API hooks
 */
export function useProducts() {
  return {
    fetchProducts: (params?: any) => apiFetchProducts(params),
    fetchDashboardOverview: () => apiFetchDashboardOverview(),
  };
}

/**
 * Crawl Jobs API hooks
 */
export function useCrawlJobs() {
  return {
    fetchCrawlJobs: (params?: any) => apiFetchCrawlJobs(params),
    fetchDashboardOverview: () => apiFetchDashboardOverview(),
  };
}

/**
 * Publish Jobs API hooks
 */
export function usePublishJobs() {
  return {
    fetchPublishJobs: (params?: any) => apiFetchPublishJobs(params),
    fetchDashboardOverview: () => apiFetchDashboardOverview(),
  };
}

/**
 * AI Contents API hooks
 */
export function useAiContents() {
  return {
    fetchAiContents: (params?: any) => apiFetchAiContents(params),
  };
}

/**
 * Dead Letters API hooks
 */
export function useDeadLetters() {
  return {
    fetchDeadLetters: (params?: any) => apiFetchDeadLetters(params),
  };
}

/**
 * Workers API hooks
 */
export function useWorkers() {
  return {
    fetchWorkers: (params?: any) => apiFetchWorkers(params),
    fetchDashboardOverview: () => apiFetchDashboardOverview(),
  };
}

/**
 * Activity Feed API hooks
 */
export function useActivityFeed() {
  return {
    fetchActivityFeed: (params?: any) => apiFetchActivityFeed(params),
    fetchDashboardOverview: () => apiFetchDashboardOverview(),
  };
}

/**
 * Failure Insights API hooks
 */
export function useFailureInsights() {
  return {
    fetchFailureInsights: () => apiFetchFailureInsights(),
    fetchFailureTrends: () => apiFetchFailureTrends(),
  };
}
