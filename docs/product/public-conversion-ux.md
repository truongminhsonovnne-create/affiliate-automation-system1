# Public Conversion UX

## Overview

This document describes the conversion UX strategy for the public voucher resolution product - optimizing the flow from paste link to using the voucher on Shopee.

## Conversion Funnel

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Paste    │───▶│  Resolve   │───▶│   View     │───▶│   Copy     │───▶│   Open     │
│    Link     │    │  Voucher   │    │   Result   │    │   Code     │    │   Shopee   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
     100%          ~80%            ~75%           ~50%           ~40%
```

## Best Voucher Presentation Strategy

### Hero Element
The best voucher is displayed as the primary hero element:
- Large discount value prominently displayed
- Voucher code clearly visible
- One-click copy button
- Clear "Buy now" CTA to Shopee
- Trust indicators (minimal)

### Hierarchy
```
┌─────────────────────────────────────┐
│  🎫 Giảm 15%                        │  ← Large, prominent
├─────────────────────────────────────┤
│  CODE15          [Sao chép ✓]       │  ← Primary CTA
├─────────────────────────────────────┤
│  Áp dụng đơn từ ₫100.000          │
│  Hết hạn: 31/12/2024              │
├─────────────────────────────────────┤
│  [ Mua ngay trên Shopee → ]        │  ← Secondary CTA
└─────────────────────────────────────┘
```

## Candidate Strategy

### Panel Design
- Only show top 3 candidates
- Each candidate shows: discount, code, reason
- Not competing with best voucher
- Clean list format
- Selectable for quick copy

### Not A List
We don't show a long list of vouchers like coupon sites. Just:
- Best voucher (hero)
- 1-3 alternatives (if any)

## No-Match UX

### When No Voucher Found
- Clear message: "Không tìm thấy voucher"
- Helpful suggestion: "Thử sản phẩm khác"
- If any fallback exists, show it
- Keep the tool feeling useful

## CTA Hierarchy

### Primary Actions
1. **Copy Code** - Most important
2. **Open Shopee** - Second most important

### Principles
- No more than 2 CTAs on the result card
- Clear visual priority
- Copy is always the primary action
- Open Shopee supports but doesn't compete

## Mobile Optimization

### Touch Targets
- Minimum 44px touch target
- Generous spacing between buttons
- Clear tap feedback

### Layout
- Stacked layout on mobile
- Best voucher fills viewport
- Candidates scroll if needed

### Performance
- Fast rendering
- No layout shift
- Skeleton loading states

## Micro-Interactions

### Allowed
- Button tap feedback (subtle scale)
- Copy success toast (auto-dismiss)
- Loading spinner
- Skeleton shimmer

### Not Allowed
- Confetti celebrations
- Animated characters
- Attention-grabbing bounces
- Unnecessary motion

## Trust Signals

### What We Show
- ✓ Đã kiểm tra (minimal badge)
- Simple "Miễn phí, không quảng cáo"

### What We Don't Show
- User counts
- Testimonials
- Trust badge rows
- Social proof widgets

## Analytics Events

### Core Funnel Events
| Event | Description |
|-------|-------------|
| `best_voucher_viewed` | User saw best voucher |
| `copy_clicked` | User clicked copy |
| `copy_success` | Copy completed |
| `open_shopee_clicked` | User clicked Shopee |
| `no_match_viewed` | No voucher found |

### Metrics
- Paste → Resolve success rate
- Resolve → View rate
- View → Copy rate
- Copy → Open Shopee rate

## A/B Test Hooks

The system supports A/B testing for:
- CTA placement
- Copy variations
- Result layout modes
- Candidate display

## Performance Budgets

- First Contentful Paint: < 1s
- Time to Interactive: < 3s
- API Response: < 2s
- Cache Hit: < 100ms

## Accessibility

- Keyboard navigable
- Screen reader friendly labels
- Sufficient color contrast
- Focus indicators

## Summary

The conversion UX is designed to be:
1. **Fast** - Quick resolution, instant feedback
2. **Clear** - Obvious what to do next
3. **Trusted** - Clean, no dark patterns
4. **Frictionless** - One-tap copy, easy exit
5. **Mobile-first** - Works perfectly on phone
