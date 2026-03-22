# Product Ops UI - Review Workbench Frontend

Production-grade React components for the Product Ops Review Workbench.

## Architecture Overview

### Design Patterns

1. **Evidence-First Review Experience**
   - Evidence displayed prominently before recommendations
   - Clear separation between facts (evidence) and AI judgment (recommendations)
   - Audit trail always visible

2. **Permission-Aware UI**
   - Components adapt to user role and permissions
   - Disabled states with clear reasons
   - No "broken" UI - always graceful degradation

3. **Safe Decision Surfaces**
   - Confirmation dialogs for destructive actions
   - Rationale required for audit-critical decisions
   - Two-step confirmation for irreversible actions

### Component Categories

#### Case Components (`src/components/productOps/case/`)
- **ReviewQueueTable** - Data table with severity/status badges, stale indicators
- **ReviewQueueToolbar** - Filters for severity/status, search, stale/assignedToMe toggles
- **ReviewQueueSummaryCards** - Summary metrics cards
- **ReviewCaseHeader** - Case detail header with badges
- **ReviewEvidencePanel** - Evidence-first display with key findings
- **ReviewRecommendationPanel** - Recommendation with confidence/priority
- **ReviewHistoryPanel** - Audit trail display
- **ReviewDecisionActionsPanel** - Safe decision buttons with permission-aware states
- **ReviewDecisionDialog** - Confirmation dialog with rationale input

#### Remediation Components (`src/components/productOps/remediation/`)
- **RemediationQueueTable** - Data table for remediation queue
- **RemediationDetailPanel** - Detailed remediation view
- **RemediationActionPanel** - Action buttons for remediation
- **RemediationDecisionDialog** - Confirmation for remediation decisions

#### Workbench Components (`src/components/productOps/workbench/`)
- **WorkbenchSummaryCards** - Overview metrics cards
- **WorkbenchTrendPanels** - Trend visualization
- **HumanLoopImpactPanel** - Impact metrics display

#### Common Components (`src/components/productOps/common/`)
- **ProductOpsLoadingState** - Loading skeletons
- **ProductOpsErrorState** - Error handling
- **ProductOpsEmptyState** - Empty states

#### Forms (`src/components/productOps/forms/`)
- **ReviewDecisionForm** - Decision submission form
- **RemediationDecisionForm** - Remediation decision form

#### Hooks (`src/components/productOps/hooks/`)
- **useQueueFilters** - Queue filter/sort/pagination state
- **useCaseDetailState** - Case detail UI state
- **useRemediationDetailState** - Remediation detail UI state

## Type System

### Core Types (`src/features/productOps/types.ts`)

- Enums: `ProductOpsCaseType`, `ProductOpsCaseSeverity`, `ProductOpsCaseStatus`, `ProductOpsDecisionType`, `ProductOpsRemediationStatus`, `ProductOpsRemediationRisk`, `ProductOpsUserRole`
- Queue Types: `ProductOpsQueueFilters`, `ProductOpsQueueSort`, `ProductOpsQueuePagination`
- Case Types: `ProductOpsCaseRowModel`, `ProductOpsCaseDetailModel`, `ProductOpsEvidencePanelModel`, `ProductOpsRecommendationModel`
- Decision Types: `ProductOpsDecisionActionModel`, `ProductOpsDecisionDraft`, `ProductOpsDecisionResult`
- Remediation Types: `ProductOpsRemediationDetailModel`, `ProductOpsRemediationActionModel`, `ProductOpsRemediationQueueItem`
- Workbench Types: `ProductOpsWorkbenchSummaryModel`, `ProductOpsTrendModel`, `ProductOpsImpactModel`
- Permission Types: `ProductOpsPermissionState`, `ProductOpsAssignmentState`, `ProductOpsUserContext`

### Constants (`src/features/productOps/constants.ts`)

- Queue configuration
- Stale thresholds by severity
- Decision labels/descriptions/config
- Severity/status colors and labels
- Remediation config
- Confirmation/error messages

## API Integration

### API Client (`src/lib/productOpsApi/productOpsApiClient.ts`)

- `getReviewQueue(filters, pagination, sort)` - Fetch review queue
- `getReviewCaseDetail(caseId)` - Fetch case detail
- `acceptReviewCase(caseId, rationale)` - Accept case
- `rejectReviewCase(caseId, rationale)` - Reject case
- `deferReviewCase(caseId)` - Defer case
- `needsMoreEvidence(caseId, rationale)` - Request more evidence
- `closeReviewCase(caseId)` - Close case
- `getRemediations(filters)` - Fetch remediations
- `getRemediationDetail(remediationId)` - Fetch remediation detail
- `approveRemediation(remediationId)` - Approve remediation
- `rejectRemediation(remediationId, rationale)` - Reject remediation
- `markRemediationExecuted(remediationId)` - Mark as executed
- `getWorkbenchSummary()` - Fetch summary
- `getTrends(period)` - Fetch trends

### React Query Hooks (`src/lib/productOpsApi/productOpsQueryHooks.ts`)

- `useProductOpsReviewQueue(filters, options)`
- `useProductOpsCaseDetail(caseId, options)`
- `useProductOpsRemediations(filters, options)`
- `useProductOpsRemediationDetail(id, options)`
- `useProductOpsWorkbenchSummary(options)`
- `useProductOpsTrendData(period, options)`
- `useProductOpsImpactData(options)`

## Permission System

### Permission Resolver (`src/features/productOps/permissions/productOpsPermissionResolver.ts`)

```typescript
// Check if user can review a case
canReviewProductOpsCase(userContext, caseDetail)

// Check if user can approve remediation
canApproveRemediation(userContext, remediation)

// Build permission state for a case
buildProductOpsPermissionState(userContext, caseDetail)
```

## Mutation Hooks

### Decision Mutations (`src/features/productOps/decisions/useReviewDecisionMutations.ts`)

- `useAcceptReviewCaseMutation()` - Accept case
- `useRejectReviewCaseMutation()` - Reject case
- `useDeferReviewCaseMutation()` - Defer case
- `useNeedsMoreEvidenceMutation()` - Request more evidence
- `useCloseReviewCaseMutation()` - Close case
- `useSubmitReviewDecision(caseId, decisionType)` - Combined mutation

## Validation

### Zod Schemas (`src/features/productOps/forms/reviewDecisionSchemas.ts`)

- `acceptDecisionSchema`
- `rejectDecisionSchema`
- `deferDecisionSchema`
- `needsMoreEvidenceDecisionSchema`
- `closeDecisionSchema`

## Error Handling

### Error Presenter (`src/features/productOps/errorHandling/productOpsErrorPresenter.ts`)

Maps backend errors to UX-friendly messages:

- `permission_denied` - "You do not have permission..."
- `stale_state` - "This case has been modified..."
- `invalid_transition` - "This status transition is not allowed..."
- `validation` - "Please check your input..."
- `dependency` - "Related action failed..."
- `audit_required` - "This action requires additional audit information..."
- `not_found` - "The requested resource was not found..."
- `internal` - "An internal error occurred..."

## Audit

### Audit Notices (`src/features/productOps/audit/productOpsAuditNotice.ts`)

- `buildDecisionAuditNotice(decisionType, caseDetail)` - Notice for decision actions
- `buildRemediationAuditNotice(action, remediation)` - Notice for remediation actions
- `buildAuditWarningNotice(action)` - Warning for audit-required actions

## Analytics

### UI Analytics (`src/components/productOps/analytics/productOpsUiAnalytics.ts`)

Track user interactions:

- `trackPageView(page, referrer)`
- `trackQueueFiltered(filters, resultCount)`
- `trackCaseViewed(caseId, caseKey, caseType, severity)`
- `trackCaseAssigned(caseId, assigneeId, previousAssigneeId)`
- `trackDecisionSubmitted(caseId, decisionType, hasRationale)`
- `trackRemediationApproved(remediationId, riskLevel)`
- `trackRemediationRejected(remediationId, reason)`
- `trackRemediationExecuted(remediationId, executionTime)`

## Usage Example

```tsx
import { useProductOpsReviewQueue, useProductOpsCaseDetail } from '@/lib/productOpsApi/productOpsQueryHooks';
import { useQueueFilters } from '@/components/productOps/hooks/useQueueFilters';
import { ReviewQueueTable, ReviewQueueToolbar, ReviewCaseHeader, ReviewEvidencePanel, ReviewDecisionActionsPanel, ProductOpsLoadingState, ProductOpsErrorState, ProductOpsEmptyState } from '@/components/productOps';

function ReviewQueuePage() {
  const { filters, sort, pagination, setSearchQuery, setSeverityFilter } = useQueueFilters();
  const { data, isLoading, error } = useProductOpsReviewQueue({ filters, sort, pagination });

  if (isLoading) return <ProductOpsLoadingState />;
  if (error) return <ProductOpsErrorState error={error} onRetry={() => {}} />;
  if (!data?.items.length) return <ProductOpsEmptyState title="No cases found" />;

  return (
    <div>
      <ReviewQueueToolbar
        onSearchChange={setSearchQuery}
        onSeverityChange={setSeverityFilter}
      />
      <ReviewQueueTable items={data.items} />
    </div>
  );
}

function CaseDetailPage({ caseId }: { caseId: string }) {
  const { data: caseDetail, isLoading } = useProductOpsCaseDetail(caseId);

  if (isLoading) return <ProductOpsLoadingState />;

  return (
    <div>
      <ReviewCaseHeader caseDetail={caseDetail} />
      <ReviewEvidencePanel evidence={caseDetail.evidence} />
      {caseDetail.recommendation && (
        <ReviewRecommendationPanel recommendation={caseDetail.recommendation} />
      )}
      <ReviewDecisionActionsPanel
        caseDetail={caseDetail}
        canReview={caseDetail.canBeReviewed}
        onDecisionClick={(type) => handleDecision(type)}
      />
    </div>
  );
}
```

## Styling

Components use Tailwind CSS with:
- Consistent spacing and typography
- Color tokens for severity (red/orange/yellow/green)
- Status badges with semantic colors
- Loading skeletons for async states
- Responsive grid layouts

## Testing

Run validation script:

```bash
npm run build
npx ts-node src/scripts/runProductOpsUiFlowCheck.ts
```

## Dependencies

- React 18+
- TanStack Query (React Query) for server state
- Zod for validation
- Tailwind CSS for styling
