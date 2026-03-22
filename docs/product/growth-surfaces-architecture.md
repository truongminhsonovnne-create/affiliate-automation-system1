# Growth Surfaces Architecture

## Overview

This document describes the architecture for Consumer Growth Surfaces - lightweight, SEO-safe landing pages that support organic growth without compromising the core product philosophy.

## Core Philosophy

**This is NOT a coupon directory.**

- Tool-first approach
- Clean, minimal, ad-free design
- Speed-first performance
- Growth surfaces that are useful, contextual, and non-intrusive
- Primary CTA always leads back to the paste-link tool

## Architecture Layers

### 1. Routing Layer (`/routing`)

```
src/growthPages/routing/growthSurfaceRoutes.ts
```

- Defines all growth surface routes:
  - `/shop/[shopSlug]` - Shop landing pages
  - `/category/[categorySlug]` - Category landing pages
  - `/how-it-works` - Tool explainer
  - `/paste-link-find-voucher` - Paste-link tool explainer
  - `/voucher-checker` - Voucher checker explainer

- Route resolution and validation
- Slug strategy: lowercase, alphanumeric with hyphens

### 2. Data Layer (`/data`)

```
src/growthPages/data/
├── shopLandingDataService.ts
├── categoryLandingDataService.ts
├── toolExplainerDataService.ts
└── relatedSurfaceResolver.ts
```

- Data fetching for each surface type
- Related content resolution
- CTA model building

### 3. SEO Layer (`/seo`)

```
src/growthPages/seo/
├── seoModelBuilder.ts
└── structuredDataBuilder.ts
```

- SEO metadata generation
- Title/description templates
- Canonical URL strategy
- Open Graph tags
- JSON-LD structured data (sparingly used)
- Indexability decisions

### 4. Policy Layer (`/policy`)

```
src/growthPages/policy/
├── indexabilityPolicy.ts
└── contentFreshnessPolicy.ts
```

- Controls which pages get indexed
- Thin content detection
- Content freshness management

### 5. Content Policy (`/content`)

```
src/growthPages/content/growthSurfaceContentPolicy.ts
```

- Enforces "no clutter" principle
- CTA discipline validation
- Content density limits
- Spam pattern detection

### 6. Analytics & Attribution (`/analytics`)

```
src/growthPages/analytics/
├── growthSurfaceAnalytics.ts
└── growthAttribution.ts
```

- Page view tracking
- CTA click tracking
- Surface-to-tool conversion attribution
- Session-based attribution model

### 7. Cache Layer (`/cache`)

```
src/growthPages/cache/growthSurfaceCache.ts
```

- Fast reads for shop/category pages
- Stale-while-revalidate pattern
- Cache key strategy

### 8. Presentation Layer (`/presentation`)

```
src/growthPages/presentation/growthSurfacePresentation.ts
```

- Presentation model building
- CTA presentation variants
- Layout configuration

## Page Types

### Shop Landing Pages

**Route:** `/shop/[shopSlug]`

**Purpose:** Help users understand they can paste links from specific shops

**Content:**
- Shop name and brief description
- Voucher applicability hints (max 2)
- Primary CTA: "Dán link tìm mã giảm giá"
- Secondary CTAs: View shop, browse category

**SEO:**
- Indexable if content quality meets threshold
- Clean metadata, no keyword stuffing

### Category Landing Pages

**Route:** `/category/[categorySlug]`

**Purpose:** Help users discover voucher patterns by category

**Content:**
- Category name and description
- Typical voucher patterns (max 3)
- Primary CTA: "Dán link tìm mã giảm giá"

**SEO:**
- Indexable if meaningful content exists

### Tool Explainer Pages

**Routes:**
- `/how-it-works`
- `/paste-link-find-voucher`
- `/voucher-checker`

**Purpose:** Build trust and explain tool usage

**Content:**
- Step-by-step instructions (max 5 steps)
- FAQs (max 5 items)
- Benefits list
- Primary CTA: Use the tool

**SEO:**
- Always indexable (high-quality content)

## Internal Linking Strategy

### Principles

- Link few but contextually correct
- No link farms
- No disorienting navigation

### Limits

- Max 10 links per page
- Max 6 related content links
- Links only to other growth surfaces or tool pages

## CTA Discipline

### Primary CTA

Always leads to:
- `/paste-link` - For shop/category pages
- `/paste-link` or `/voucher-checker` - For tool pages

### Secondary CTAs (max 3)

- View shop
- Browse category
- Check voucher
- Open Shopee

### CTA Style

- Clean, prominent but subtle
- No fake urgency ("Ngay hôm nay", "Sắp hết")
- No clickbait

## SEO Strategy

### Indexability

**Always Index:**
- Tool explainer pages (high-quality, static)

**Conditionally Index:**
- Shop pages (if content quality meets threshold)
- Category pages (if meaningful content exists)

**Never Index:**
- Discovery pages (if any)

### Thin Content Protection

- Min description length: 50 characters
- Min unique content: 30 words
- Requires valid CTA
- Automatic no-index for thin content

### Metadata Standards

- Title: 10-70 characters
- Description: 50-320 characters
- Canonical URL: Required
- Keywords: Max 8, no stuffing

## Analytics & Attribution

### Events Tracked

- `surface_viewed` - Page views
- `surface_cta_clicked` - CTA interactions
- `related_clicked` - Internal link clicks
- `surface_to_tool_conversion` - Tool usage from surfaces

### Attribution Model

- Session-based attribution
- 24-hour attribution window
- Tracks: Entry surface → CTA click → Tool usage

## Cache Strategy

### TTL (Time to Live)

- Shop pages: 5 minutes
- Category pages: 5 minutes
- Tool explainers: 1 hour

### Stale Policy

- Serve stale while revalidating in background
- Auto-invalidate on content updates

## File Structure

```
src/growthPages/
├── types/
│   └── index.ts              # All type definitions
├── constants/
│   └── index.ts              # Configuration constants
├── routing/
│   └── growthSurfaceRoutes.ts # Route definitions
├── content/
│   └── growthSurfaceContentPolicy.ts # Content rules
├── seo/
│   ├── seoModelBuilder.ts
│   └── structuredDataBuilder.ts
├── data/
│   ├── types.ts
│   ├── shopLandingDataService.ts
│   ├── categoryLandingDataService.ts
│   ├── toolExplainerDataService.ts
│   └── relatedSurfaceResolver.ts
├── presentation/
│   └── growthSurfacePresentation.ts
├── cache/
│   └── growthSurfaceCache.ts
├── analytics/
│   ├── growthSurfaceAnalytics.ts
│   └── growthAttribution.ts
├── navigation/
│   └── growthNavigationModel.ts
├── policy/
│   ├── indexabilityPolicy.ts
│   └── contentFreshnessPolicy.ts
├── observability/
│   ├── growthSurfaceMetrics.ts
│   └── growthSurfaceEvents.ts
└── index.ts                  # Public API exports

src/components/public/growth/
├── GrowthPageShell.tsx
├── GrowthPageHeader.tsx
├── GrowthSummaryBlock.tsx
├── GrowthPrimaryCta.tsx
├── GrowthRelatedLinks.tsx
├── GrowthSupportCards.tsx
├── GrowthEmptyState.tsx
└── GrowthLoadingState.tsx

src/app/(public)/
├── shop/[shopSlug]/
│   ├── page.tsx
│   ├── loading.tsx
│   └── error.tsx
├── category/[categorySlug]/
│   ├── page.tsx
│   ├── loading.tsx
│   └── error.tsx
├── how-it-works/
│   └── page.tsx
├── paste-link-find-voucher/
│   └── page.tsx
└── voucher-checker/
    └── page.tsx
```

## Extensibility

The architecture supports future expansion:

1. **More shop/category pages** - Just add data sources
2. **Compare pages** - New surface type
3. **Lightweight SEO entry pages** - New surface type
4. **More tool explainers** - Extend tool data service

All without breaking the core philosophy.
