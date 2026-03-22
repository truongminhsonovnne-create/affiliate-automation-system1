/**
 * Product Ops Query Hooks
 *
 * Reusable React Query hooks for Product Ops workbench
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productOpsApi } from './productOpsApiClient';
import { PRODUCT_OPS_QUERY_KEYS } from './productOpsQueryKeys';
import type {
  ProductOpsQueueFilters,
  ProductOpsQueueSort,
  ProductOpsCaseDetailModel,
  ProductOpsRemediationDetailModel,
  ProductOpsWorkbenchSummaryModel,
  ProductOpsTrendModel,
  ProductOpsImpactModel,
} from '../../features/productOps/types';
import { QUERY_CONFIG } from '../../features/productOps/constants';

// ========================================================================
// Queue Hooks
// ========================================================================

export function useProductOpsReviewQueue(params?: {
  filters?: ProductOpsQueueFilters;
  sort?: ProductOpsQueueSort;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: [
      ...PRODUCT_OPS_QUERY_KEYS.reviewQueue,
      params?.filters,
      params?.sort,
      params?.page,
      params?.pageSize,
    ],
    queryFn: () =>
      productOpsApi.getReviewQueue({
        filters: params?.filters,
        sort: params?.sort,
        pagination: params?.page !== undefined
          ? { page: params.page, pageSize: params.pageSize || 25 }
          : undefined,
      }),
    staleTime: QUERY_CONFIG.STALE_TIME_MS,
    gcTime: QUERY_CONFIG.CACHE_TIME_MS,
  });
}

export function useProductOpsCaseDetail(caseId: string) {
  return useQuery({
    queryKey: PRODUCT_OPS_QUERY_KEYS.caseDetail(caseId),
    queryFn: () => productOpsApi.getReviewCaseDetail(caseId),
    staleTime: QUERY_CONFIG.STALE_TIME_MS,
    enabled: !!caseId,
  });
}

// ========================================================================
// Remediation Hooks
// ========================================================================

export function useProductOpsRemediations(params?: {
  status?: string[];
  risk?: string[];
  sort?: ProductOpsQueueSort;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: [
      ...PRODUCT_OPS_QUERY_KEYS.remediationQueue,
      params?.status,
      params?.risk,
      params?.sort,
      params?.page,
      params?.pageSize,
    ],
    queryFn: () =>
      productOpsApi.getRemediations({
        status: params?.status,
        risk: params?.risk,
        sort: params?.sort,
        pagination: params?.page !== undefined
          ? { page: params.page, pageSize: params.pageSize || 25 }
          : undefined,
      }),
    staleTime: QUERY_CONFIG.STALE_TIME_MS,
    gcTime: QUERY_CONFIG.CACHE_TIME_MS,
  });
}

export function useProductOpsRemediationDetail(remediationId: string) {
  return useQuery({
    queryKey: PRODUCT_OPS_QUERY_KEYS.remediationDetail(remediationId),
    queryFn: () => productOpsApi.getRemediationDetail(remediationId),
    staleTime: QUERY_CONFIG.STALE_TIME_MS,
    enabled: !!remediationId,
  });
}

// ========================================================================
// Workbench Hooks
// ========================================================================

export function useProductOpsWorkbenchSummary() {
  return useQuery({
    queryKey: PRODUCT_OPS_QUERY_KEYS.workbenchSummary,
    queryFn: () => productOpsApi.getWorkbenchSummary(),
    staleTime: QUERY_CONFIG.STALE_TIME_MS,
    gcTime: QUERY_CONFIG.CACHE_TIME_MS,
  });
}

export function useProductOpsTrendData(period: string = '7d') {
  return useQuery({
    queryKey: PRODUCT_OPS_QUERY_KEYS.workbenchTrends(period),
    queryFn: () => productOpsApi.getWorkbenchTrends(period),
    staleTime: QUERY_CONFIG.STALE_TIME_MS,
    gcTime: QUERY_CONFIG.CACHE_TIME_MS,
  });
}

export function useProductOpsImpactData(period: string = '30d') {
  return useQuery({
    queryKey: PRODUCT_OPS_QUERY_KEYS.workbenchImpact(period),
    queryFn: () => productOpsApi.getWorkbenchImpact(period),
    staleTime: QUERY_CONFIG.STALE_TIME_MS,
    gcTime: QUERY_CONFIG.CACHE_TIME_MS,
  });
}

// ========================================================================
// User Hooks
// ========================================================================

export function useProductOpsAssignees() {
  return useQuery({
    queryKey: PRODUCT_OPS_QUERY_KEYS.assignees,
    queryFn: () => productOpsApi.getAssignees(),
    staleTime: QUERY_CONFIG.CACHE_TIME_MS * 5, // Users change less frequently
  });
}

export function useProductOpsCurrentUser() {
  return useQuery({
    queryKey: PRODUCT_OPS_QUERY_KEYS.currentUser,
    queryFn: () => productOpsApi.getCurrentUser(),
    staleTime: QUERY_CONFIG.CACHE_TIME_MS * 5,
  });
}
