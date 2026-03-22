# Flaky Test Policy

## Overview

This document defines the policy for handling flaky tests in the Affiliate Automation System. Flaky tests are tests that produce inconsistent results—sometimes passing, sometimes failing—without any code changes.

## Definition of Flaky Tests

A test is considered flaky if:

1. It passes and fails on the same code commit
2. It passes locally but fails in CI (or vice versa)
3. It fails randomly without code changes
4. It depends on timing or external resources

## Flaky Test Identification

### Automatic Detection

The test framework automatically detects flaky tests when:

- A test fails, then passes on retry
- A test passes, then fails on retry
- A test has inconsistent timing (>50% variance)

### Manual Identification

Flaky tests can also be identified by:

- Test failures reported in PRs
- Pattern of intermittent failures
- Known race conditions in code

## Flaky Test Handling

### Immediate Actions

1. **Retry on Failure**
   - Flaky tests are automatically retried up to 3 times
   - Final result is based on last retry
   - Retry count is logged

2. **Quarantine**
   - After 3 consecutive failures, test is quarantined
   - Quarantined tests are excluded from quality gates
   - Notification is sent to team

3. **Documentation**
   - Flaky tests are tagged with `@flaky`
   - Issue is created for investigation
   - Known issues are documented

### Investigation Process

1. **Reproduce Locally**
   - Run test multiple times locally
   - Check for environmental differences
   - Verify timing dependencies

2. **Analyze Logs**
   - Review test output
   - Check CI artifacts
   - Look for race conditions

3. **Fix or Mark**
   - If fixable, apply fix and remove `@flaky`
   - If not fixable, document and keep quarantined
   - Review periodically for resolution

## Test Configuration

### Flaky Threshold

```typescript
// constants.ts
export const FLAKY_THRESHOLD = 3;
export const FLAKY_RETRY_LIMIT = 2;
```

### Retry Configuration

| Test Layer | Retry Limit | Reason |
|------------|-------------|--------|
| Unit | 0 | Should be deterministic |
| Integration | 1 | May have timing issues |
| Workflow | 2 | Complex dependencies |
| E2E | 2 | External dependencies |

### Flaky Test Marker

Tests can be marked as flaky in test configuration:

```typescript
describe('Flaky Test Example', () => {
  it('should handle flaky scenario', {
    flaky: true,
    retries: 3,
  }, async () => {
    // Test implementation
  });
});
```

## Quarantine Process

### Adding to Quarantine

1. Test fails 3+ consecutive times
2. Issue created in issue tracker
3. Test marked with `@flaky` tag
4. Test excluded from quality gates

### Quarantine File

Quarantined tests are documented in `tests/quarantine.json`:

```json
{
  "quarantined": [
    {
      "id": "test-id",
      "name": "Test Name",
      "reason": "Race condition in external API",
      "dateQuarantined": "2024-01-01",
      "issueUrl": "https://github.com/..."
    }
  ]
}
```

### Removing from Quarantine

1. Root cause is fixed
2. Test passes 5 consecutive times
3. Remove `@flaky` tag
4. Close issue

## Monitoring and Metrics

### Flaky Test Metrics

| Metric | Threshold | Action |
|--------|-----------|--------|
| Flaky rate | > 5% | Alert team |
| Quarantine size | > 10 | Create tech debt item |
| Flaky duration | > 30 days | Escalate to tech lead |

### Reporting

- Weekly flaky test report in team standup
- Monthly review of quarantine list
- Quarterly analysis of flaky patterns

## Prevention

### Best Practices

1. **Deterministic Tests**
   - Avoid time-based assertions
   - Use test fixtures
   - Mock external dependencies

2. **Isolation**
   - Each test is independent
   - Clean up after tests
   - No shared state

3. **Timing**
   - Add buffers for async operations
   - Use wait-for patterns
   - Avoid hard-coded delays

4. **External Dependencies**
   - Mock external APIs
   - Use test containers
   - Have fallback data

### Code Review

- Review tests with same rigor as code
- Check for flaky patterns
- Ensure proper cleanup

## Communication

### Notifications

- **PR Comment**: When flaky test fails in PR
- **Slack Alert**: When test is quarantined
- **Weekly Report**: Summary of flaky tests

### Documentation

- Keep README updated
- Document known issues
- Share learnings with team

## References

- [Test Strategy](./test-strategy.md)
- [Test Data and Fixtures](./test-data-and-fixtures.md)
- [CI/CD Test Matrix](./ci-matrix.md)
