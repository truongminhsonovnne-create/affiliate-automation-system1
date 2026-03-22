# Public Paste-Link Experience

## Overview

This document describes the public-facing consumer product flow for voucher resolution - the "paste link, get code" experience.

## User Journey

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Homepage   │────▶│   Paste     │────▶│   Resolve  │────▶│    Copy    │
│             │     │   Link      │     │   Voucher   │     │    Code    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                       │
                                                                       ▼
                                                              ┌─────────────┐
                                                              │   Open      │
                                                              │   Shopee    │
                                                              └─────────────┘
```

## Page Flow

### 1. Homepage (Paste Link)

**User sees:**
- Minimal header with product name
- Large, prominent text input
- Submit button
- Minimal trust signals

**User does:**
1. Pastes Shopee product link into input
2. Clicks "Tìm mã giảm giá" button

**System does:**
1. Validates input
2. Checks cache
3. Resolves voucher (or falls back to engine)
4. Displays result

### 2. Result View

**User sees:**
- Best voucher prominently displayed
- Discount value, code, validity
- Copy button
- Open Shopee button
- Alternative vouchers (if any)
- Brief explanation

**User does:**
1. Clicks "Sao chép" to copy code
2. Clicks "Mua ngay" to open Shopee

## Fast-Path Architecture

```
┌──────────────┐
│  User Input  │
└──────┬───────┘
       │
       ▼
┌──────────────┐    ┌──────────────┐
│   Validate   │───▶│  Normalize   │
│   Input      │    │  URL         │
└──────┬───────┘    └──────┬───────┘
       │                    │
       ▼                    ▼
┌──────────────┐    ┌──────────────┐
│  Check      │───▶│   Cache      │
│  Rate Limit │    │   Hit?       │
└──────┬───────┘    └──────┬───────┘
       │                    │
       │              ┌──────┴───────┐
       │              │              │
       ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Cache Hit  │ │  Cache Miss │ │   Rate      │
│  Return     │ │  Call Engine │ │   Limited   │
└──────────────┘ └──────┬───────┘ └──────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │   Serialize │
                  │   Response  │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │   Return to  │
                  │   User       │
                  └──────────────┘
```

## Caching Strategy

| Cache Type | TTL | Purpose |
|------------|-----|---------|
| Hot Cache | 60s | Instant response for popular products |
| Warm Cache | 5min | Fast response for recent requests |
| Standard Cache | 30min | Normal cached responses |

## Rate Limiting

| User Type | Requests/Hour | Notes |
|-----------|--------------|-------|
| Anonymous | 100 | IP-based |
| Authenticated | 500 | User ID based |
| API Client | 1000 | API key based |

## API Contract

### POST /api/public/v1/resolve

**Request:**
```json
{
  "input": "https://shopee.vn/product/...",
  "limit": 3,
  "requestId": "optional-uuid"
}
```

**Response:**
```json
{
  "requestId": "uuid",
  "status": "success",
  "bestMatch": {
    "voucherId": "uuid",
    "code": "SAVE10",
    "discountValue": "10%",
    "headline": "Giảm 10%"
  },
  "candidates": [...],
  "explanation": {
    "summary": "...",
    "tips": [...]
  },
  "performance": {
    "totalLatencyMs": 45,
    "servedFromCache": true,
    "resolvedAt": "2024-01-01T00:00:00Z"
  }
}
```

## Clean UX Principles

### Allowed
- Paste link input
- Voucher result display
- Copy code button
- Open Shopee button
- Minimal footer
- Loading states
- Error states

### Not Allowed
- Banner ads
- Newsletter popups
- Cookie banners
- Social proof sections
- Testimonials
- Blog content
- FAQ sections
- Multiple CTAs

## Explainability

Each result includes:
- **Summary**: Why this voucher was recommended
- **Tips**: How to use the voucher
- **Validity**: When the voucher expires

Example:
```json
{
  "explanation": {
    "summary": "Đây là voucher tốt nhất cho sản phẩm này.",
    "tips": [
      "Sử dụng mã này khi thanh toán",
      "Áp dụng đơn từ ₫100,000"
    ]
  }
}
```

## Analytics Events

| Event | Description |
|-------|-------------|
| `public.paste_link.submitted` | User submitted link |
| `public.voucher.resolved` | Voucher found |
| `public.voucher.no_match` | No voucher found |
| `public.voucher.copied` | User copied code |
| `public.shopee.opened` | User opened Shopee |

## Extensibility

### Future Enhancements
1. **SEO Pages**: Pre-rendered pages for popular products
2. **Category Pages**: Voucher listings by category
3. **Voucher Landing Pages**: Dedicated pages for high-value vouchers
4. **Browser Extension**: One-click voucher finding
5. **Mobile App**: Native app integration

### Adding New Features
1. Keep UI minimal
2. Maintain fast-path caching
3. Add new analytics events
4. Extend API with new fields (backward compatible)
