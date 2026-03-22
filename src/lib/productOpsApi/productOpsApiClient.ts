/**
 * Product Ops API Client
 *
 * Typed API client for Product Ops workbench frontend
 */

import type {
  ProductOpsQueueFilters,
  ProductOpsQueueSort,
  ProductOpsQueuePagination,
  ProductOpsCaseRowModel,
  ProductOpsCaseDetailModel,
  ProductOpsDecisionDraft,
  ProductOpsDecisionResult,
  ProductOpsRemediationRowModel,
  ProductOpsRemediationDetailModel,
  ProductOpsRemediationDecisionDraft,
  ProductOpsRemediationDecisionResult,
  ProductOpsWorkbenchSummaryModel,
  ProductOpsTrendModel,
  ProductOpsImpactModel,
  ProductOpsApiResponse,
} from '../../features/productOps/types';

// ============================================================================
// Types
// ============================================================================

interface GetReviewQueueParams {
  filters?: ProductOpsQueueFilters;
  sort?: ProductOpsQueueSort;
  pagination?: ProductOpsQueuePagination;
}

interface GetRemediationsParams {
  status?: string[];
  risk?: string[];
  sort?: ProductOpsQueueSort;
  pagination?: ProductOpsQueuePagination;
}

// ============================================================================
// API Client
// ============================================================================

class ProductOpsApiClient {
  private baseUrl: string;
  private fetch: typeof fetch;

  constructor(baseUrl: string = '/api/product-ops', fetchFn: typeof fetch = fetch) {
    this.baseUrl = baseUrl;
    this.fetch = fetchFn;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await this.fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ========================================================================
  // Review Queue
  // ========================================================================

  async getReviewQueue(
    params: GetReviewQueueParams = {}
  ): Promise<ProductOpsApiResponse<ProductOpsCaseRowModel[]>> {
    const { filters = {}, sort, pagination } = params;

    const queryParams = new URLSearchParams();
    if (filters.severity?.length) {
      queryParams.set('severity', filters.severity.join(','));
    }
    if (filters.status?.length) {
      queryParams.set('status', filters.status.join(','));
    }
    if (filters.caseType?.length) {
      queryParams.set('caseType', filters.caseType.join(','));
    }
    if (filters.assigneeId) {
      queryParams.set('assigneeId', filters.assigneeId);
    }
    if (filters.assignedToMe) {
      queryParams.set('assignedToMe', 'true');
    }
    if (filters.searchQuery) {
      queryParams.set('q', filters.searchQuery);
    }
    if (filters.staleOnly) {
      queryParams.set('staleOnly', 'true');
    }
    if (sort) {
      queryParams.set('sortField', sort.field);
      queryParams.set('sortDir', sort.direction);
    }
    if (pagination) {
      queryParams.set('page', String(pagination.page));
      queryParams.set('pageSize', String(pagination.pageSize));
    }

    return this.request<ProductOpsApiResponse<ProductOpsCaseRowModel[]>>(
      `/review-cases?${queryParams.toString()}`
    );
  }

  async getReviewCaseDetail(
    caseId: string
  ): Promise<ProductOpsCaseDetailModel> {
    return this.request<ProductOpsCaseDetailModel>(`/review-cases/${caseId}`);
  }

  async assignReviewCase(
    caseId: string,
    assigneeId: string
  ): Promise<{ success: boolean; assigneeId: string }> {
    return this.request('/review-cases/assign', {
      method: 'POST',
      body: JSON.stringify({ caseId, assigneeId }),
    });
  }

  // ========================================================================
  // Decisions
  // ========================================================================

  async acceptReviewCase(
    draft: ProductOpsDecisionDraft
  ): Promise<ProductOpsDecisionResult> {
    return this.request('/review-cases/accept', {
      method: 'POST',
      body: JSON.stringify(draft),
    });
  }

  async rejectReviewCase(
    draft: ProductOpsDecisionDraft
  ): Promise<ProductOpsDecisionResult> {
    return this.request('/review-cases/reject', {
      method: 'POST',
      body: JSON.stringify(draft),
    });
  }

  async deferReviewCase(
    draft: ProductOpsDecisionDraft
  ): Promise<ProductOpsDecisionResult> {
    return this.request('/review-cases/defer', {
      method: 'POST',
      body: JSON.stringify(draft),
    });
  }

  async markCaseNeedsMoreEvidence(
    draft: ProductOpsDecisionDraft
  ): Promise<ProductOpsDecisionResult> {
    return this.request('/review-cases/needs-evidence', {
      method: 'POST',
      body: JSON.stringify(draft),
    });
  }

  async closeReviewCase(
    draft: ProductOpsDecisionDraft
  ): Promise<ProductOpsDecisionResult> {
    return this.request('/review-cases/close', {
      method: 'POST',
      body: JSON.stringify(draft),
    });
  }

  // ========================================================================
  // Remediations
  // ========================================================================

  async getRemediations(
    params: GetRemediationsParams = {}
  ): Promise<ProductOpsApiResponse<ProductOpsRemediationRowModel[]>> {
    const { status, risk, sort, pagination } = params;

    const queryParams = new URLSearchParams();
    if (status?.length) {
      queryParams.set('status', status.join(','));
    }
    if (risk?.length) {
      queryParams.set('risk', risk.join(','));
    }
    if (sort) {
      queryParams.set('sortField', sort.field);
      queryParams.set('sortDir', sort.direction);
    }
    if (pagination) {
      queryParams.set('page', String(pagination.page));
      queryParams.set('pageSize', String(pagination.pageSize));
    }

    return this.request<ProductOpsApiResponse<ProductOpsRemediationRowModel[]>>(
      `/remediations?${queryParams.toString()}`
    );
  }

  async getRemediationDetail(
    remediationId: string
  ): Promise<ProductOpsRemediationDetailModel> {
    return this.request<ProductOpsRemediationDetailModel>(
      `/remediations/${remediationId}`
    );
  }

  async approveRemediation(
    draft: ProductOpsRemediationDecisionDraft
  ): Promise<ProductOpsRemediationDecisionResult> {
    return this.request('/remediations/approve', {
      method: 'POST',
      body: JSON.stringify(draft),
    });
  }

  async rejectRemediation(
    draft: ProductOpsRemediationDecisionDraft
  ): Promise<ProductOpsRemediationDecisionResult> {
    return this.request('/remediations/reject', {
      method: 'POST',
      body: JSON.stringify(draft),
    });
  }

  async markRemediationExecuted(
    remediationId: string,
    executionNotes?: string
  ): Promise<ProductOpsRemediationDecisionResult> {
    return this.request('/remediations/mark-executed', {
      method: 'POST',
      body: JSON.stringify({ remediationId, executionNotes }),
    });
  }

  // ========================================================================
  // Workbench
  // ========================================================================

  async getWorkbenchSummary(): Promise<ProductOpsWorkbenchSummaryModel> {
    return this.request<ProductOpsWorkbenchSummaryModel>('/workbench/summary');
  }

  async getWorkbenchTrends(
    period: string = '7d'
  ): Promise<ProductOpsTrendModel[]> {
    return this.request<ProductOpsTrendModel[]>(
      `/workbench/trends?period=${period}`
    );
  }

  async getWorkbenchImpact(
    period: string = '30d'
  ): Promise<ProductOpsImpactModel[]> {
    return this.request<ProductOpsImpactModel[]>(
      `/workbench/impact?period=${period}`
    );
  }

  // ========================================================================
  // Users
  // ========================================================================

  async getAssignees(): Promise<Array<{ id: string; name: string }>> {
    return this.request<Array<{ id: string; name: string }>>('/users/assignees');
  }

  async getCurrentUser(): Promise<{
    id: string;
    name: string;
    role: string;
    permissions: string[];
  }> {
    return this.request<{
      id: string;
      name: string;
      role: string;
      permissions: string[];
    }>('/users/me');
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const productOpsApi = new ProductOpsApiClient();
export default productOpsApi;
