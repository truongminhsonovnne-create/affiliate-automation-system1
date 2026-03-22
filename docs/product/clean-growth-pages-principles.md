# Clean Growth Pages Principles

## Manifesto

**We are NOT a coupon directory.**

We believe in:
- ✅ Tool-first approach
- ✅ Clean, minimal, ad-free experience
- ✅ Speed-first performance
- ✅ Useful, contextual growth surfaces
- ✅ Trust-building content

We reject:
- ❌ Web cluttered with coupon codes
- ❌ Messy layouts with many sections
- ❌ Banner/section spam for SEO
- ❌ Fake urgency CTAs
- ❌ Advertisements
- ❌ Clickbait pages

## Core Principles

### 1. Tool-First Philosophy

Every growth surface exists to guide users to the tool, not to keep them browsing.

**Rules:**
- Primary CTA always leads to `/paste-link` or `/voucher-checker`
- No content that encourages extended browsing
- No "shop now" or "browse deals" as primary actions
- Tool pages should be reachable in 1 click from any growth surface

### 2. Minimal Design

Less is more. Every element must justify its existence.

**Rules:**
- Maximum 3 sections above the fold
- Maximum 5 sections total per page
- No promotional banners
- No popups or interstitials
- No sticky CTAs (except the main CTA if appropriate)
- Generous whitespace

### 3. No Advertising

We are ad-free. Always will be.

**Rules:**
- Zero third-party ads
- No affiliate links in content
- No sponsored sections
- No "promoted" content
- No display advertising

### 4. No Fake Urgency

Don't manipulate users with psychological tricks.

**Prohibited:**
- "Chỉ còn hôm nay" (Only today)
- "Sắp hết" (Running out soon)
- "Limited time"
- Countdown timers
- Fake stock indicators
- Artificial scarcity

### 5. No Content Spam

Quality over quantity. Every piece of content must be useful.

**Rules:**
- Maximum 8 keywords per page
- No keyword stuffing
- No thin content (minimum 50 characters description)
- No duplicate content
- No content spinning
- No auto-generated content

### 6. No Link Farms

Internal linking should be contextual and limited.

**Rules:**
- Maximum 10 links per page
- Maximum 6 related content links
- No linking to low-quality pages
- No excessive cross-linking
- Links must be relevant to user intent

### 7. Clean CTAs

CTAs should be clear, honest, and not annoying.

**Rules:**
- Maximum 1 primary CTA
- Maximum 3 secondary CTAs
- Maximum 4 CTAs total per page
- No misleading button labels
- No "click here" text
- No aggressive button styling

### 8. Speed First

Performance is a feature. Every page should load fast.

**Rules:**
- No heavy JavaScript libraries
- No large images (optimize or use placeholders)
- No unnecessary animations
- Cache aggressively
- Static generation where possible

## Content Guidelines

### Shop Pages

**Do:**
- Show shop name clearly
- Provide brief, accurate description
- Show up to 2 voucher hints if genuinely useful
- Always include paste-link CTA

**Don't:**
- List 50+ vouchers
- Show fake "savings" calculations
- Create long lists of "top deals"
- Add promotional banners

### Category Pages

**Do:**
- Describe the category briefly
- Show typical voucher patterns (max 3)
- Guide users to paste links

**Don't:**
- Create category "hubs" with 50 subcategories
- List all shops in category
- Add comparison tables

### Tool Explainer Pages

**Do:**
- Explain tool usage clearly
- Answer common questions (FAQ)
- Show benefits
- Include working CTA

**Don't:**
- Add marketing fluff
- Include testimonials
- Add "success stories"
- Create long tutorials

## Design Rules

### Typography

- Use system fonts or minimal custom fonts
- Maximum 2 font families
- Readable font sizes (min 16px body)
- Proper line height (1.5-1.7)

### Colors

- Maximum 3 colors for branding
- High contrast for readability
- No neon or eye-straining colors
- Neutral backgrounds

### Layout

- Single column preferred
- Maximum 2 columns for related content
- Generous margins and padding
- No complex grids

## Enforcement

### Automated Checks

Every growth surface is validated against:

1. **Content Policy** (`growthSurfaceContentPolicy.ts`)
   - Section count
   - CTA count
   - Keyword density
   - Spam patterns

2. **Indexability Policy** (`indexabilityPolicy.ts`)
   - Thin content detection
   - Quality thresholds
   - Required elements

3. **CTA Discipline** (`growthSurfaceContentPolicy.ts`)
   - Primary CTA validation
   - Urgency language detection
   - Clickbait detection

### Manual Review

Before publishing any new growth surface:

1. Ask: "Does this help users reach the tool faster?"
2. Ask: "Is there any unnecessary content here?"
3. Ask: "Would I feel spammed by this page?"
4. Ask: "Is this consistent with our ad-free promise?"

## Anti-Patterns (Don't Do These)

### ❌ Coupon Site Layout

```
╔══════════════════════════════════╗
║  [Banner Ad]                     ║
╠══════════════════════════════════╣
║  🔥 HOT DEALS 🔥                  ║
║  ┌─────┐ ┌─────┐ ┌─────┐        ║
║  │Coupon│ │Coupon│ │Coupon│ ...  ║
║  └─────┘ └─────┘ └─────┘        ║
║                                  ║
║  🛍️ Popular Shops               ║
║  ┌─────┐ ┌─────┐ ┌─────┐        ║
║  │ Shop│ │ Shop│ │ Shop│ ...  ║
║  └─────┘ └─────┘ └─────┘        ║
║                                  ║
║  [Popup: Subscribe!]             ║
╚══════════════════════════════════╝
```

### ✅ Our Clean Approach

```
╔══════════════════════════════════╗
║  Shop Name                      ║
║  Brief description              ║
║                                  ║
║  [ Dán link tìm mã giảm giá ]  ║
║                                  ║
║  ✓ Highlight 1                  ║
║  ✓ Highlight 2                  ║
╚══════════════════════════════════╝
```

## Success Metrics

We measure success by:

1. **Tool Usage Rate** - % of visitors who use the tool
2. **Time to Tool** - How fast users reach the tool
3. **Bounce Rate** - Should be low if page is useful
4. **Conversion Rate** - Surface → Tool conversion

We do NOT measure:

- ❌ Time on page (encourages clutter)
- ❌ Pages per session (encourages browsing)
- ❌ Scroll depth (encourages length)

## Summary

This is a tool, not a directory. Every design decision should answer:

> "Does this help users find and use our tool faster?"

If yes, do it.
If no, don't do it.
If unsure, leave it out.
