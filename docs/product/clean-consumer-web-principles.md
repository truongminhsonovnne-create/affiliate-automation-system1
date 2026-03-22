# Clean Consumer Web Principles

## Overview

This document outlines the principles that govern the public consumer web product - ensuring it remains minimal, fast, and conversion-focused.

## Core Philosophy

**"Tool-first, not marketing-first."**

The product exists to help users find voucher codes quickly. Every design decision should serve this primary goal.

## Visual Design Principles

### Minimalism
- **No clutter**: Each page has one primary action
- **No noise**: No decorative elements that don't serve a function
- **No fluff**: No marketing copy that doesn't help the user

### Speed
- **Instant feedback**: Loading states are responsive
- **Cache-first**: Popular products load from cache
- **Progressive enhancement**: Works even on slow connections

### Clarity
- **Clear hierarchy**: The most important element is largest
- **Clear actions**: Buttons say what they do
- **Clear results**: Voucher codes are prominent

## What We DON'T Do

### No Advertising
- No banner ads
- No sidebar ads
- No in-content ads
- No sponsored listings
- No affiliate links beyond the core function

### No Intrusive Elements
- No newsletter popups
- No cookie consent banners (minimal only)
- No exit intent popups
- No notification requests
- No "helpful" overlays

### No Clutter
- No "related products" sections
- No "customers also bought"
- No social proof widgets
- No testimonial carousels
- No trust badge rows
- No FAQ sections
- No blog content on tool pages
- No "how it works" explainers

### No Fake Urgency
- No countdown timers
- No "only X left" notifications
- No "ending soon" banners
- No artificial scarcity signals

### No Misleading UI
- No fake close buttons on ads
- No pre-ticked checkboxes
- No dark patterns
- No confusing navigation

## What We DO

### Core Experience
- **Paste input**: Large, prominent, easy to use
- **Clear results**: Voucher codes are the hero
- **One-click copy**: Minimal friction to use the code
- **Easy exit**: Clear path to Shopee

### Trust Signals (Minimal)
- "Miễn phí" (Free)
- "Không quảng cáo" (No ads)
- Copyright only

### Technical Excellence
- Fast page loads
- Responsive design
- Works offline-ish (cached)
- Accessible

## Design Rules

### Color Palette
- Primary: Blue (#0066FF) - action buttons
- Background: White (#FFFFFF)
- Text: Gray (#1F2937, #4B5563, #9CA3AF)
- Error: Red (#EF4444)
- Success: Green (#10B981)

### Typography
- Headings: Bold, clear
- Body: Readable, adequate contrast
- Code: Monospace for voucher codes

### Spacing
- Generous whitespace
- Clear visual separation
- No cramped layouts

### Components
- Buttons: Clear labels, obvious states
- Inputs: Large touch targets
- Cards: Single purpose

## Enforcement

### Code Review Checklist
Before merging any UI code:
- [ ] Does this add clutter?
- [ ] Is there a simpler solution?
- [ ] Does this serve the primary flow?
- [ ] Would this pass the "no ads" test?
- [ ] Is the copy minimal?

### Policy Check
Use `publicExperiencePolicy.ts` to validate:
```typescript
import { isPublicUiElementAllowed } from '@/lib/publicUx/publicExperiencePolicy';

// Before adding any section
if (!isPublicUiElementAllowed('new-section')) {
  // Don't add it
}
```

## Evolution

### Adding Features
When considering new features:
1. Does it help the core flow?
2. Is it worth adding complexity?
3. Can it be added minimally?
4. Will users thank us or tolerate it?

### Avoiding Drift
The product naturally wants to become:
- A coupon directory
- A content site
- An ad platform

We must actively resist this drift by:
- Reviewing the checklist regularly
- Measuring user satisfaction
- Tracking conversion metrics
- Listening to feedback

## Success Metrics

### What Matters
- Conversion: paste → copy → shopee
- Speed: time to see codes
- Reliability: uptime, error rates
- Simplicity: user feedback

### What Doesn't Matter
- Page views
- Time on site
- Bounce rate (for this tool)
- Newsletter signups

## Conclusion

The best public product is one that:
1. Gets out of the user's way
2. Solves the problem fast
3. Disappears when not needed

Every feature should be questioned. Every pixel should be justified.

**Tool-first. User-first. Minimal.**
