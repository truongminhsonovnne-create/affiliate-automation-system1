# Test Data and Fixtures Documentation

## Overview

This document describes the test data strategy, fixture management, and data handling policies.

---

## Fixture Strategy

### Principles

1. **Synthetic First** - Generate data programmatically
2. **No Sensitive Data** - Never use real PII in tests
3. **Deterministic** - Same input = same output
4. **Fast** - Tests should run quickly
5. **Isolated** - No test dependencies

---

## Fixture Registry

### Location

All fixtures stored in:
```
src/testing/fixtures/
```

### Structure

```
fixtures/
├── sampleShopeeData.ts    # Crawler fixtures
├── mockResponses.ts       # API mocks
├── databaseFixtures.ts    # DB records
└── index.ts             # Registry export
```

### Loading

```typescript
import { loadFixture } from '../fixtures';

const product = loadFixture('sample-product');
```

---

## Mock/Stub Policy

### When to Mock

| Service | Mock in Unit | Mock in Integration |
|---------|--------------|-------------------|
| Database | Yes (in-memory) | Real |
| External APIs | Yes | Mock |
| Gemini API | Yes | Mock |
| Control Plane | Yes | Mock |
| Publish Adapter | Yes | Yes |

### Mock Guidelines

- Mock at service boundary
- Keep mock simple
- Verify mock behavior matches real
- Document mock limitations

---

## Test Data Classification

### 1. Synthetic Data

Generated programmatically:
- Prices: 10000-500000 VND
- Ratings: 0-5
- Names: Generated from templates
- IDs: UUIDs

### 2. Anonymized Samples

Real data, stripped of PII:
- Product names
- Prices
- Descriptions

### 3. Edge Cases

Special fixtures for boundary testing:
- Empty strings
- Very long text
- Special characters
- Null/undefined

---

## Sensitive Data Handling

### Never Include

- Real user data
- API keys
- Passwords
- Email addresses
- Phone numbers

### Example

```typescript
// BAD - Real email
const user = { email: 'john@example.com' };

// GOOD - Fake email
const user = { email: 'test@example.com' };
```

---

## Reset/Cleanup Expectations

### Unit Tests

- No cleanup needed (in-memory only)

### Integration Tests

```typescript
afterEach(async () => {
  await cleanupTestData();
});
```

### E2E Tests

```typescript
afterAll(async () => {
  await resetDatabase();
  await clearQueues();
});
```

---

## Fixture Examples

### Shopee Product

```typescript
export const sampleShopeeProduct = {
  itemId: '1234567890',
  name: 'Test Product Name',
  price: 199000,
  originalPrice: 299000,
  discount: 33,
  rating: 4.5,
  reviewCount: 100,
  images: [
    'https://cf.shopee.sg/file/test-image-1',
    'https://cf.shopee.sg/file/test-image-2',
  ],
  shop: {
    shopId: '12345',
    name: 'Test Shop',
    rating: 4.8,
  },
};
```

### AI Output

```typescript
export const sampleAiOutput = {
  hashtags: ['fashion', 'style', 'ootd'],
  description: 'Sample product description',
  title: 'Enhanced title',
  tags: ['tag1', 'tag2'],
  meta: {
    model: 'gemini-1.5-pro',
    promptVersion: 'v1.0',
    timestamp: '2024-01-01T00:00:00Z',
  },
};
```

### Publish Job

```typescript
export const samplePublishJob = {
  id: 'job-123',
  productId: 'product-456',
  channel: 'tiktok',
  status: 'pending',
  payload: {
    video: 'https://example.com/video.mp4',
    caption: 'Check out this product!',
  },
  attempts: 0,
  maxAttempts: 3,
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

---

## Test Data Utilities

### Generating Test Data

```typescript
// Generate random product
function generateProduct(overrides = {}): Product {
  return {
    id: uuidv4(),
    name: `Test Product ${Math.random()}`,
    price: Math.floor(Math.random() * 500000),
    ...overrides,
  };
}
```

### Anonymizing Real Data

```typescript
function anonymizeProduct(product: Product): Product {
  return {
    ...product,
    shop: {
      ...product.shop,
      name: 'Test Shop',
    },
  };
}
```

---

## Contact

- Test Data Questions: #qa
- Fixture Requests: Create issue with `fixture` label
