/**
 * Product Ops UI Analytics
 *
 * Analytics tracking for Product Ops workbench interactions
 */

// Event types
export type ProductOpsAnalyticsEvent =
  | 'page_viewed'
  | 'queue_filtered'
  | 'case_viewed'
  | 'case_assigned'
  | 'decision_submitted'
  | 'remediation_approved'
  | 'remediation_rejected'
  | 'remediation_executed'
  | 'error_encountered';

// Event properties
export interface ProductOpsAnalyticsProperties {
  page_viewed: {
    page: string;
    referrer?: string;
  };
  queue_filtered: {
    filters: Record<string, unknown>;
    resultCount: number;
  };
  case_viewed: {
    caseId: string;
    caseKey: string;
    caseType: string;
    severity: string;
  };
  case_assigned: {
    caseId: string;
    assigneeId: string;
    previousAssigneeId?: string;
  };
  decision_submitted: {
    caseId: string;
    decisionType: string;
    hasRationale: boolean;
  };
  remediation_approved: {
    remediationId: string;
    riskLevel: string;
  };
  remediation_rejected: {
    remediationId: string;
    reason?: string;
  };
  remediation_executed: {
    remediationId: string;
    executionTime?: number;
  };
  error_encountered: {
    errorType: string;
    errorMessage: string;
    context: string;
  };
}

// Analytics service interface
export interface ProductOpsAnalyticsService {
  trackEvent<T extends ProductOpsAnalyticsEvent>(
    event: T,
    properties: ProductOpsAnalyticsProperties[T]
  ): void;
  setUserProperties(properties: Record<string, unknown>): void;
  setPageProperties(properties: Record<string, unknown>): void;
}

// Simple console analytics (replace with actual analytics service)
class ConsoleAnalyticsService implements ProductOpsAnalyticsService {
  trackEvent<T extends ProductOpsAnalyticsEvent>(
    event: T,
    properties: ProductOpsAnalyticsProperties[T]
  ): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ProductOps Analytics] ${event}`, properties);
    }
    // In production, send to analytics service
    // Example: mixpanel.track(event, properties);
  }

  setUserProperties(properties: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ProductOps Analytics] Set user properties', properties);
    }
  }

  setPageProperties(properties: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ProductOps Analytics] Set page properties', properties);
    }
  }
}

// Singleton instance
let analyticsInstance: ProductOpsAnalyticsService | null = null;

export function getProductOpsAnalytics(): ProductOpsAnalyticsService {
  if (!analyticsInstance) {
    analyticsInstance = new ConsoleAnalyticsService();
  }
  return analyticsInstance;
}

// Helper functions for common tracking
export function trackPageView(page: string, referrer?: string): void {
  getProductOpsAnalytics().trackEvent('page_viewed', { page, referrer });
}

export function trackQueueFiltered(
  filters: Record<string, unknown>,
  resultCount: number
): void {
  getProductOpsAnalytics().trackEvent('queue_filtered', { filters, resultCount });
}

export function trackCaseViewed(
  caseId: string,
  caseKey: string,
  caseType: string,
  severity: string
): void {
  getProductOpsAnalytics().trackEvent('case_viewed', {
    caseId,
    caseKey,
    caseType,
    severity,
  });
}

export function trackCaseAssigned(
  caseId: string,
  assigneeId: string,
  previousAssigneeId?: string
): void {
  getProductOpsAnalytics().trackEvent('case_assigned', {
    caseId,
    assigneeId,
    previousAssigneeId,
  });
}

export function trackDecisionSubmitted(
  caseId: string,
  decisionType: string,
  hasRationale: boolean
): void {
  getProductOpsAnalytics().trackEvent('decision_submitted', {
    caseId,
    decisionType,
    hasRationale,
  });
}

export function trackRemediationApproved(
  remediationId: string,
  riskLevel: string
): void {
  getProductOpsAnalytics().trackEvent('remediation_approved', {
    remediationId,
    riskLevel,
  });
}

export function trackRemediationRejected(
  remediationId: string,
  reason?: string
): void {
  getProductOpsAnalytics().trackEvent('remediation_rejected', {
    remediationId,
    reason,
  });
}

export function trackRemediationExecuted(
  remediationId: string,
  executionTime?: number
): void {
  getProductOpsAnalytics().trackEvent('remediation_executed', {
    remediationId,
    executionTime,
  });
}

export function trackError(
  errorType: string,
  errorMessage: string,
  context: string
): void {
  getProductOpsAnalytics().trackEvent('error_encountered', {
    errorType,
    errorMessage,
    context,
  });
}

export default {
  getProductOpsAnalytics,
  trackPageView,
  trackQueueFiltered,
  trackCaseViewed,
  trackCaseAssigned,
  trackDecisionSubmitted,
  trackRemediationApproved,
  trackRemediationRejected,
  trackRemediationExecuted,
  trackError,
};
