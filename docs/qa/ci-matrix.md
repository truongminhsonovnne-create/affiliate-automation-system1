# CI/CD Test Matrix

## Overview

This document defines the test execution matrix for CI/CD pipelines, mapping test types to environments, triggers, and quality gates.

## Test Matrix

| Test Type | Environment | Trigger | Timeout | Retries | Parallel | Quality Gate |
|-----------|-------------|---------|---------|---------|----------|---------------|
| Unit Tests | local | Every PR | 5s | 0 | Yes | 100% pass |
| Integration | CI | Every PR | 30s | 1 | Yes | 100% pass |
| Workflow | CI | Every PR | 60s | 2 | No | 100% pass |
| E2E | staging | Release | 120s | 2 | No | 100% pass |
| Smoke | production | Deploy | 30s | 0 | Yes | 100% pass |
| Verification | staging | Pre-release | 10min | 2 | No | 100% pass |
| Regression | staging | Weekly | 15min | 2 | No | 95% pass |

## Pipeline Stages

### 1. Pull Request (PR)

```
┌─────────────┐
│   LINT      │  → ESLint, Prettier, TypeScript
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   UNIT      │  → 100% pass required
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  INTEGRATION│  → 100% pass required
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  WORKFLOW   │  → 100% pass required
└─────────────┘
```

### 2. Merge to Main

```
┌─────────────┐
│   LINT      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   UNIT      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  INTEGRATION│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  WORKFLOW   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  BUILD      │  → Docker image
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  DEPLOY     │  → Staging
└─────────────┘
```

### 3. Staging Deployment

```
┌─────────────┐
│ VERIFICATION│  → Staging pre-release
│    PACK     │    (all checks pass)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ REGRESSION  │  → Full regression
│    PACK     │    (95% pass allowed)
└─────────────┘
```

### 4. Production Deployment

```
┌─────────────┐
│   BUILD     │  → Docker image
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   DEPLOY    │  → Production
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   SMOKE     │  → Post-deploy
│   TESTS     │    verification
└─────────────┘
```

## Environment Configuration

### Local Development

```yaml
environment: local
layer: unit
timeoutMultiplier: 0.5
retries: 0
parallel: true
skipSlow: true
```

### CI Pipeline

```yaml
environment: ci
layer: integration
timeoutMultiplier: 1.0
retries: 1
parallel: true
skipSlow: false
```

### Staging

```yaml
environment: staging
layer: workflow
timeoutMultiplier: 1.5
retries: 2
parallel: false
skipSlow: false
```

### Production

```yaml
environment: production
layer: smoke
timeoutMultiplier: 1.0
retries: 0
parallel: true
skipSlow: false
```

## Test Execution Rules

### Quality Gates

1. **PR Quality Gate**
   - All lint checks must pass
   - Unit tests: 100% pass
   - Integration tests: 100% pass
   - Workflow tests: 100% pass

2. **Staging Quality Gate**
   - Verification pack: 100% pass
   - Regression: 95% pass (5% allowance for known issues)

3. **Production Quality Gate**
   - Smoke tests: 100% pass
   - Zero critical bugs

### Flaky Test Handling

- Tests marked as `flaky: true` are excluded from quality gates
- Flaky tests are retried up to 3 times
- After 3 consecutive failures, test is quarantined

### Timeout Management

- Each test layer has defined timeout
- Timeouts include setup and teardown
- Tests exceeding timeout are marked as failed

## Test Tags

| Tag | Description | Layers |
|-----|-------------|--------|
| `@unit` | Unit tests | unit |
| `@integration` | Integration tests | integration |
| `@workflow` | Workflow tests | workflow |
| `@e2e` | End-to-end tests | e2e |
| `@smoke` | Smoke tests | smoke |
| `@regression` | Regression tests | all |
| `@slow` | Slow-running tests | all |
| `@flaky` | Known flaky tests | all |
| `@critical` | Critical path tests | all |

## Test Data Strategy

### Synthetic Data (Default)

- Use synthetic data for all tests
- No production data in tests
- Fixtures defined in `src/testing/fixtures`

### Anonymized Data (E2E)

- Anonymized production-like data for E2E
- PII fields removed or masked
- Stored in secure test database

## Reporting

### Test Reports

- Unit: `reports/unit/junit.xml`
- Integration: `reports/integration/junit.xml`
- Workflow: `reports/workflow/junit.xml`
- Smoke: `reports/smoke/junit.xml`

### Coverage Reports

- Generated for each run
- Available in CI artifacts
- Quality gate: 80% line coverage

## Troubleshooting

### Test Failures

1. Check test output for error details
2. Review test logs in CI artifacts
3. Run locally with `--verbose` flag
4. Check for environment-specific issues

### Timeout Issues

1. Increase timeout in test config
2. Check for deadlocks in code
3. Review resource availability

### Flaky Tests

1. Identify flaky test patterns
2. Apply retry logic
3. Quarantine if persistent
4. Create issue for fix
