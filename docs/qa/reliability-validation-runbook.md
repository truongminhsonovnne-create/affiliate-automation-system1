# Reliability Validation Runbook

## Overview

This runbook documents procedures for validating system reliability before release and during operations.

---

## Pre-Release Validation

### Staging Verification Pack

Run before staging release:

```bash
npm run test:staging-pack
```

**Checks:**
1. Health endpoints respond
2. Database connectivity
3. Control plane critical reads
4. Worker startup viability
5. AI parsing path (dry-run)
6. Crawler sanity (safe mode)

**Time Budget:** <10 minutes

**Failure Action:** Block release, investigate

---

### Regression Pack

Run before staging release or weekly:

```bash
npm run test:regression
```

**Coverage:**
- Critical API contracts
- Quality gates
- Retry/guard logic
- High-risk failure paths
- Known fragile crawler areas

**Time Budget:** <15 minutes

**Failure Action:** Create issue, assess severity

---

## Post-Deploy Smoke Tests

### Quick Smoke

Run after production deployment:

```bash
npm run test:smoke
```

**Checks (under 2 minutes):**
1. Health endpoint `/health/live`
2. Readiness endpoint `/health/ready`
3. Control plane summary

**Failure Action:** Page on-call, assess immediately

---

### Full Smoke

Run after critical deployments:

```bash
npm run test:smoke:full
```

**Checks (under 5 minutes):**
1. All quick smoke checks
2. Database queries work
3. Worker can claim jobs
4. At least one adapter responds

**Failure Action:** Page on-call

---

## Crawler Reliability Checks

### Selector Fallback Behavior

**Test:**
```bash
npm run test:crawler:selectors
```

**Validates:**
- Primary selectors work
- Fallback selectors work
- Partial extraction handled gracefully

**Pass Criteria:**
- 80%+ field coverage
- No crashes on missing fields

### Normalization Quality

**Test:**
```bash
npm run test:crawler:normalization
```

**Validates:**
- Price format normalization
- Rating normalization
- Empty field handling

---

## AI Schema/Quality Verification

### Output Schema Validation

**Test:**
```bash
npm run test:ai:schema
```

**Validates:**
- JSON parse succeeds
- Required fields present
- Type correctness

### Quality Gate Checks

**Test:**
```bash
npm run test:ai:quality
```

**Validates:**
- Hashtags present and reasonable count
- Description length
- No JSON/markdown residue

---

## Publisher Workflow Verification

### Job Lifecycle

**Test:**
```bash
npm run test:publisher:lifecycle
```

**Validates:**
- Job created → claimed → processing → completed
- Status transitions correct
- Dead-letter handling

### Retry Behavior

**Test:**
```bash
npm run test:publisher:retry
```

**Validates:**
- Retry attempts correct
- Backoff pattern correct
- Non-retryable failures don't retry

---

## Incident Triage Entry Checks

When system has issues:

### 1. Health Check

```bash
# Check all health endpoints
curl -f https://affiliate.example.com/health/live
curl -f https://affiliate.example.com/health/ready
curl -f https://control-plane.affiliate.example.com/health
```

### 2. Database Connectivity

```bash
# Test database query
npm run db:test
```

### 3. Worker Logs

```bash
# Check worker logs for errors
kubectl logs -l app=worker-crawler --tail=100
```

### 4. Queue Status

```bash
# Check publish job queue
curl https://control-plane/api/v1/jobs?status=pending
```

---

## Failure Path Validation

### Transient Failure

**Test:** Simulate network timeout

**Expected:** Retry with backoff

### Invalid Payload

**Test:** Send malformed JSON to AI

**Expected:** Schema validation error, no crash

### Dependency Unavailable

**Test:** Mock external API down

**Expected:** Graceful degradation

---

## Contact

- On-Call: PagerDuty schedule
- QA: #qa
- DevOps: #devops
