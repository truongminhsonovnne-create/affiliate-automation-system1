# Public Voucher Conversion Feature

Production-grade conversion UX layer for public voucher resolution.

## Overview

This feature provides the complete conversion flow from paste link to using the voucher on Shopee:
- Best voucher hero display with copy/open actions
- Candidate panel for alternatives
- No-match UX with fallback options
- Analytics tracking for funnel optimization

## Installation

```bash
# No additional dependencies required
# Uses existing project dependencies (React, Next.js)
```

## Usage

### Basic Example

```tsx
import {
  BestVoucherHero,
  VoucherCandidatesPanel,
  ResultStateLayout,
  buildVoucherResultPresentationModel,
} from '@/features/publicVoucherConversion';
import { resolveVoucherFromPublicInput } from '@/lib/publicApi/publicVoucherApiClient';

function VoucherPage() {
  const [result, setResult] = useState(null);

  const handleResolve = async (input: string) => {
    const response = await resolveVoucherFromPublicInput(input);
    const model = buildVoucherResultPresentationModel(response);
    setResult(model);
  };

  return (
    <ResultStateLayout viewState={result?.viewState || 'loading'}>
      {result?.bestVoucher && (
        <>
          <BestVoucherHero
            voucher={result.bestVoucher}
            onCopy={(code) => console.log('Copied:', code)}
            onOpenShopee={() => console.log('Opening Shopee')}
          />
          {result.candidates.length > 0 && (
            <VoucherCandidatesPanel
              candidates={result.candidates}
              onSelect={(candidate) => handleSelect(candidate)}
            />
          )}
        </>
      )}
    </ResultStateLayout>
  );
}
```

### Analytics Tracking

```tsx
import {
  trackBestVoucherViewed,
  trackCopySuccess,
  trackOpenShopeeIntent,
} from '@/features/publicVoucherConversion/analytics/conversionAnalytics';

// Track when user sees the best voucher
trackBestVoucherViewed({
  sessionId: 'session-123',
  voucherId: 'voucher-456',
  discountValue: '15%',
});

// Track successful copy
trackCopySuccess({
  sessionId: 'session-123',
  voucherId: 'voucher-456',
  code: 'CODE15',
});

// Track Shopee open intent
trackOpenShopeeIntent({
  sessionId: 'session-123',
  voucherId: 'voucher-456',
});
```

### Using Design Tokens

```tsx
import {
  CONVERSION_COLORS,
  CONVERSION_TYPOGRAPHY,
  CONVERSION_SPACING,
} from '@/features/publicVoucherConversion/styles/conversionDesignTokens';

// Use in custom styles
const customStyle = {
  backgroundColor: CONVERSION_COLORS.primary[50],
  fontFamily: CONVERSION_TYPOGRAPHY.fontFamily.sans,
  padding: CONVERSION_SPACING[4],
};
```

## Components

### Hero Components

- `BestVoucherHero` - Primary voucher display with copy/open CTAs

### Display Components

- `VoucherConfidenceBadge` - Trust indicator
- `VoucherCandidatesPanel` - Alternative vouchers list
- `VoucherExplanationSummary` - Why this voucher was recommended

### Feedback Components

- `CopySuccessFeedback` - Copy success toast
- `OpenShopeeHint` - Guide to open Shopee after copy

### State Components

- `ResultStateLayout` - State-aware layout wrapper
- `ResultSkeleton` - Loading skeleton
- `ResultErrorState` - Error display
- `NoMatchResultView` - No match found UX

## Hooks

- `useVoucherCopyAction` - Clipboard copy with fallback
- `useOpenShopeeAction` - Open Shopee action
- `useResultInteractionState` - UI state management
- `useVoucherConversionFlow` - Full flow management

## Constants

```tsx
import {
  ACTION_TIMING,     // Timing configurations
  DISPLAY_LIMITS,    // Display constraints
  CONFIDENCE,        // Confidence thresholds
  COPYWRITING,       // UI text
  LAYOUT,            // Layout breakpoints
  ERROR_MESSAGES,    // Error strings
} from '@/features/publicVoucherConversion/constants';
```

## Architecture

```
src/features/publicVoucherConversion/
├── types.ts                    # Type definitions
├── constants.ts                 # Configuration constants
├── styles/
│   └── conversionDesignTokens.ts # Design tokens
├── presentation/
│   ├── resultPresentationBuilder.ts
│   ├── noMatchPresentationBuilder.ts
│   └── actionPriorityResolver.ts
├── hooks/
│   ├── useVoucherCopyAction.ts
│   ├── useOpenShopeeAction.ts
│   ├── useResultInteractionState.ts
│   └── useVoucherConversionFlow.ts
├── components/
│   ├── BestVoucherHero.tsx
│   ├── VoucherConfidenceBadge.tsx
│   ├── VoucherCandidatesPanel.tsx
│   ├── VoucherExplanationSummary.tsx
│   ├── CopySuccessFeedback.tsx
│   ├── OpenShopeeHint.tsx
│   ├── ResultStateLayout.tsx
│   ├── ResultSkeleton.tsx
│   ├── ResultErrorState.tsx
│   └── NoMatchResultView.tsx
└── analytics/
    ├── conversionAnalytics.ts
    └── conversionFunnel.ts
```

## CLI Tools

### Conversion Flow Checker

Validate the conversion UX implementation:

```bash
npx tsx scripts/dev/check-conversion-flow.ts
```

This checks:
- Component file existence
- Analytics event definitions
- Constant configurations
- Hook implementations
- Accessibility attributes

## Performance

- First Contentful Paint: < 1s
- Time to Interactive: < 3s
- API Response: < 2s
- Cache Hit: < 100ms

## Accessibility

All components follow WCAG 2.1 guidelines:
- Keyboard navigation
- Screen reader support
- Color contrast compliance
- Focus indicators

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
