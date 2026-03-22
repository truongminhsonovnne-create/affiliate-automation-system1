# Growth to Tool Attribution

## Overview

This document describes how we track and attribute user journeys from growth surfaces to the core paste-link tool flow.

## Attribution Model

### Goal

Understand which growth surfaces (shop pages, category pages, tool explainers) contribute to tool usage without over-collecting user data.

### Principles

1. **Minimal Data Collection** - Only track what's needed for attribution
2. **Session-Based** - Attribution is tied to user sessions, not persistent IDs
3. **Clear Conversion Events** - Well-defined conversion points
4. **Privacy-First** - No PII, no cross-site tracking

## Attribution Flow

```
User Entry                    CTA Click              Tool Usage
    │                            │                        │
    ▼                            ▼                        ▼
┌─────────────┐          ┌─────────────┐         ┌─────────────┐
│ Growth     │          │ Click CTA   │         │ Use Tool   │
│ Surface    │─────────▶│ /paste-link │────────▶│ (convert)  │
│ Viewed     │          │ or /check   │         │            │
└─────────────┘          └─────────────┘         └─────────────┘
      │                        │                        │
      ▼                        ▼                        ▼
  Record view            Record click            Record conversion
  + surface info         + surface info          + attribution
```

## Events

### 1. Surface Viewed

Triggered when a user lands on a growth surface page.

```typescript
interface GrowthSurfaceViewEvent {
  eventType: 'surface_viewed';
  surfaceType: 'shop' | 'category' | 'tool_explainer';
  surfaceSlug: string;
  path: string;
  referrer?: string;
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
  timestamp: number;
  sessionId: string;
  userId?: string; // Optional, only if logged in
}
```

### 2. CTA Clicked

Triggered when a user clicks a CTA leading to the tool.

```typescript
interface GrowthSurfaceCtaClickEvent {
  eventType: 'surface_cta_clicked';
  surfaceType: 'shop' | 'category' | 'tool_explainer';
  surfaceSlug: string;
  ctaType: 'paste_link' | 'resolve_voucher' | 'copy_voucher' | 'open_shopee' | 'browse_category' | 'view_shop';
  ctaUrl: string;
  timestamp: number;
  sessionId: string;
  userId?: string;
}
```

### 3. Surface to Tool Conversion

Triggered when user uses the tool after coming from a growth surface.

```typescript
interface GrowthSurfaceConversionEvent {
  eventType: 'surface_to_tool_conversion';
  surfaceType: 'shop' | 'category' | 'tool_explainer';
  surfaceSlug: string;
  conversionType: 'paste_link_started' | 'voucher_checked' | 'voucher_copied';
  conversionUrl: string;
  timestamp: number;
  sessionId: string;
  userId?: string;
}
```

## Attribution Context

### What We Track

```typescript
interface GrowthAttributionContext {
  entrySurface: GrowthSurfaceType;
  entrySlug: string;
  entryTimestamp: number;
  clickTimestamp?: number;
  conversionTimestamp?: number;
  hasConverted: boolean;
}
```

### What We DON'T Track

- ❌ Individual user profiles
- ❌ Cross-site browsing history
- ❌ Personal identifiable information
- ❌ Device fingerprints
- ❌ Location data (beyond country)
- ❌ IP addresses (after session)

## Attribution Window

### Configuration

```typescript
const ANALYTICS_CONFIG = {
  // 24-hour attribution window
  ATTRIBUTION_WINDOW_MS: 24 * 60 * 60 * 1000,

  // Bounce threshold: 10 seconds
  BOUNCE_THRESHOLD: 10,
};
```

### Window Rules

1. **Entry** - User lands on growth surface
2. **Attribution Window** - 24 hours from entry
3. **Conversion** - Within window = attributed
4. **Expiration** - After 24 hours = new session

## URL Attribution Parameters

When users click through to the tool, we pass attribution via URL parameters:

```
/paste-link?at_surface=shop&at_slug=electronics&at_time=1700000000000
```

### Parameters

| Parameter | Description |
|-----------|-------------|
| `at_surface` | Surface type (shop, category, tool_explainer) |
| `at_slug` | Surface identifier |
| `at_time` | Entry timestamp |

### Parsing

```typescript
function parseAttributionFromUrl(url: string): Partial<GrowthAttributionContext> | null {
  const urlObj = new URL(url);
  return {
    entrySurface: urlObj.searchParams.get('at_surface'),
    entrySlug: urlObj.searchParams.get('at_slug'),
    entryTimestamp: parseInt(urlObj.searchParams.get('at_time'), 10),
  };
}
```

## Success Metrics

### Primary Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Surface-to-Tool Conversion Rate | % of surface visitors who use the tool | > 10% |
| CTA Click-Through Rate | % of visitors who click CTA | > 5% |
| Attribution Coverage | % of tool usage with attribution | > 80% |

### Secondary Metrics

| Metric | Description |
|--------|-------------|
| Avg Time to Conversion | Time from surface view to tool use |
| Bounce Rate | % of users who leave without interaction |
| Surface Performance | Conversion rate by surface type |

### Metrics We DON'T Track

- ❌ Revenue attribution (not applicable - tool is free)
- ❌ Order attribution
- ❌ Customer lifetime value

## Reporting

### Attribution Report

Generated per surface:

```typescript
interface AttributionReport {
  surfaceType: GrowthSurfaceType;
  surfaceSlug: string;
  totalSessions: number;
  clickedSessions: number;
  convertedSessions: number;
  conversionRate: number;
  avgTimeToConversion: number;
}
```

### Dashboard Views

1. **Surface Performance** - Conversion rate by surface
2. **Funnel Analysis** - View → Click → Convert
3. **Attribution Coverage** - % of conversions attributed

## Privacy Considerations

### Data Retention

- Session data: 30 days
- Aggregated metrics: 1 year
- Raw events: 7 days (for debugging)

### Data Minimization

- No PII in events
- No persistent user IDs (session-based only)
- No third-party analytics (self-hosted)

### Compliance

- No consent required for session-based analytics
- No cookie banner needed (no cross-site tracking)
- GDPR-friendly by design

## Implementation

### Analytics Service Integration

```typescript
// In growthSurfaceAnalytics.ts
export function createGrowthSurfaceAnalyticsClient(analyticsService) {
  return {
    trackSurfaceViewed: (params) => {
      const event = buildSurfaceViewEvent(params);
      analyticsService.track(event);
    },

    trackCtaClicked: (params) => {
      const event = buildSurfaceCtaClickEvent(params);
      analyticsService.track(event);
    },

    trackConversion: (params) => {
      const event = buildSurfaceToToolConversionEvent(params);
      analyticsService.track(event);
    },
  };
}
```

### Client-Side Tracking

```typescript
// In GrowthPrimaryCta.tsx
<a
  href={cta.href}
  data-tracking-id={cta.trackingId}
  onClick={() => {
    trackGrowthSurfaceCtaClicked({
      surfaceType: 'shop',
      surfaceSlug: 'electronics',
      ctaType: 'paste_link',
      ctaUrl: '/paste-link',
      sessionId: getSessionId(),
    });
  }}
>
  {cta.label}
</a>
```

## Debugging

### Testing Attribution

Use the smoke check script:

```bash
npm run public:smoke
```

### Manual Verification

1. Open a growth surface
2. Click CTA
3. Verify URL has attribution params
4. Use tool
5. Check analytics for conversion event

## Summary

The attribution model is designed to:

1. ✅ Understand which growth surfaces drive tool usage
2. ✅ Measure surface effectiveness
3. ✅ Optimize for tool-first philosophy
4. ✅ Maintain user privacy
5. ✅ Keep data collection minimal

**Key Principle:** We care about whether users find the tool useful, not about tracking them across the web.
