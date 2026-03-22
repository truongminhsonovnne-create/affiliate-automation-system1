# Test Strategy - Affiliate Automation System

## Overview

This document defines the test strategy for the Affiliate Automation System, balancing speed, reliability, and comprehensive coverage.

---

## Test Pyramid

```
        /\
       /E2E\          <- Few, critical user journeys
      /------\
     /Integration\    <- Service boundaries, workflows
    /------------\
   /    Unit      \   <- Many, fast, isolated
  /----------------\
```

### Distribution

| Layer | Count | Speed | Isolation | CI Block |
|-------|-------|-------|-----------|----------|
| Unit | 60% | <100ms | Complete | Yes |
| Integration | 25% | <5s | Partial | Yes |
| Workflow | 10% | <30s | Minimal | Yes |
| E2E | 5% | <2min | None | No |

---

## Test Scope by Subsystem

### Crawler (Shopee)

| Test Type | Coverage | CI Block |
|-----------|----------|----------|
| Unit | Parser, selectors, normalizers | Yes |
| Integration | Discovery → Detail flow | Yes |
| Workflow | Full crawl pipeline | No (staging) |

### AI Enrichment

| Test Type | Coverage | CI Block |
|-----------|----------|----------|
| Unit | Parsing, schema validation | Yes |
| Integration | Gemini API contracts | Yes |
| Quality Gate | Output quality thresholds | Yes |

### Publishing

| Test Type | Coverage | CI Block |
|-----------|----------|----------|
| Unit | Payload builders, adapters | Yes |
| Integration | Job lifecycle | Yes |
| Workflow | Full publish flow | No (staging) |

### Control Plane

| Test Type | Coverage | CI Block |
|-----------|----------|----------|
| Unit | Guards, permissions | Yes |
| Integration | API contracts | Yes |
| E2E | Health, summary | No (smoke) |

---

## Layer Boundaries

### Unit Tests

**Scope:**
- Pure functions
- Parsers/normalizers
- Query builders
- Permission guards
- Formatters
- Retry/backoff calculators

**Boundaries:**
- No external services
- No database
- No network calls
- Fast (<100ms each)

**Example:**
```typescript
// GOOD: Pure function
function calculateBackoff(attempt: number, baseMs: number): number {
  return Math.min(baseMs * Math.pow(2, attempt), 30000);
}

// BAD: Calls external service
async function getProduct(id: string) {
  return db.query('SELECT * FROM products'); // NOT unit testable
}
```

### Integration Tests

**Scope:**
- Repository operations
- API service contracts
- Pipeline orchestration sections
- Database migrations

**Boundaries:**
- Uses test database
- May mock external APIs
- Tests service boundaries

**Example:**
```typescript
// Integration: Tests repository contract
describe('AffiliateProductRepository', () => {
  it('should create and retrieve product', async () => {
    const repo = createTestRepository();
    const product = await repo.create(sampleProduct);
    const retrieved = await repo.getById(product.id);
    expect(retrieved.name).toBe(sampleProduct.name);
  });
});
```

### Workflow Tests

**Scope:**
- Multi-service flows
- End-to-end data pipelines
- Event-driven sequences

**Boundaries:**
- Uses staging or isolated environment
- May use real services with cleanup

**Example:**
```typescript
// Workflow: Discovery → Detail → Normalize
describe('Discovery Pipeline', () => {
  it('should extract and normalize products', async () => {
    const results = await runDiscoveryWorkflow({ keyword: 'test' });
    expect(results).toHaveProducts();
    expect(results[0]).toHaveCanonicalShape();
  });
});
```

### E2E Tests

**Scope:**
- Critical user journeys
- Production-like validation
- Smoke tests

**Boundaries:**
- Full environment
- Real services
- Slow but definitive

---

## Test Ownership Model

| Layer | Owner | Location |
|-------|-------|----------|
| Unit | Developer | `src/testing/suites/unit/` |
| Integration | Developer + QA | `src/testing/suites/integration/` |
| Workflow | QA + DevOps | `src/testing/suites/workflow/` |
| E2E | QA | `src/testing/suites/e2e/` |
| Smoke | DevOps | `src/testing/suites/smoke/` |

---

## CI/Staging/Production Verification

### CI (Pull Request)

**Tests Run:**
- All unit tests
- Integration tests (critical only)
- Lint + typecheck
- Build

**Time Budget:** <5 minutes

**Block Merge:** Yes

### Staging Release

**Tests Run:**
- All integration tests
- Workflow tests
- Migration validation
- Container build

**Time Budget:** <15 minutes

**Block Release:** Yes

### Post-Deploy

**Tests Run:**
- Smoke pack
- Health verification
- Worker startup

**Time Budget:** <5 minutes

**Block Release:** No (informational only)

---

## Regression Strategy

### When to Run Regression

- Before staging release
- After major changes
- Weekly baseline

### Regression Pack Contents

1. **Critical Contracts** - API response shapes
2. **Quality Gates** - AI output thresholds
3. **High-Risk Paths** - Publishing, payment
4. **Known Fragile Areas** - Selector changes, parsing edge cases

### Running Regression

```bash
# Local
npm run test:regression

# CI
npm run test:all
```

---

## Flaky Test Handling

### Identification

Tests are flaky when they:
- Pass/fail randomly without code changes
- Depend on timing/network
- Share state with other tests

### Quarantine Policy

1. **First Flake:** Mark with `// eslint-disable-next-line flaky`
2. **Second Flake:** Move to `flaky/` directory
3. **Third Flake:** Create issue, fix or remove

### Retry Policy

- Unit tests: No retry
- Integration tests: 1 retry
- Workflow tests: 2 retries
- E2E tests: 2 retries

```typescript
// Example: Retry configuration
describe('Integration', () => {
  it('should handle transient failure', {
    retry: 1,
    flaky: process.env.CI === 'true'
  });
});
```

---

## Reliability Validation Philosophy

### Core Principles

1. **Deterministic First** - Tests should be repeatable
2. **Failure-Focused** - Test edge cases, not just happy paths
3. **Fast Feedback** - CI should be under 5 minutes
4. **Realistic Coverage** - Not 100% coverage, but 100% critical path

### Failure Categories

| Category | Example | Test Approach |
|----------|---------|--------------|
| Transient | Network timeout | Retry + circuit breaker |
| Invalid Input | Malformed JSON | Schema validation |
| Resource | DB connection | Pool exhaustion |
| Logic | Wrong calculation | Assertion + edge cases |
| Integration | API drift | Contract tests |

---

## Test Data Strategy

### Synthetic Data (Preferred)

- Generated fixtures
- No sensitive data
- Deterministic
- Fast to create

### Real Sample Data (Limited)

- Anonymized production samples
- Used for E2E only
- Strict access control

### Test Data Classification

| Type | Environment | Retention |
|------|-------------|----------|
| Synthetic | CI/Staging | Until test completion |
| Anonymized | Staging | 7 days |
| Production | Never | N/A |

---

## Contact

- QA Lead: #qa
- Test Bugs: Create issue with `test` label
- Flaky Tests: Create issue with `flaky` label
