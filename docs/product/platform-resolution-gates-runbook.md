# Platform Resolution Gates Runbook

## Overview

This runbook provides operational guidance for the Platform Resolution Gates system, which manages platform support states, sandbox resolution, and public flow gating across the multi-platform affiliate system.

## Platform Support States

| State | Description | Production | Sandbox | Gated |
|-------|-------------|------------|---------|-------|
| `unsupported` | Platform not supported | ✗ | ✗ | ✗ |
| `not_ready` | Platform identified but not ready | ✗ | ✗ | ✗ |
| `sandbox_only` | Sandbox resolution available | ✗ | ✓ | ✗ |
| `gated` | Limited access with approval | ✗ | ✓ | ✓ |
| `partially_supported` | Some features in production | ✓* | ✓ | ✗ |
| `supported` | Full production support | ✓ | ✓ | ✗ |
| `production_enabled` | Full production enabled | ✓ | ✓ | ✗ |

## Enablement Phases

| Phase | Description | Public Access |
|-------|-------------|----------------|
| `disabled` | Platform disabled | ✗ |
| `internal_only` | Internal testing only | ✗ |
| `sandbox_preview` | Sandbox preview | ✗ |
| `limited_public_preview` | Limited public preview | ✓ (limited) |
| `production_candidate` | Ready for production | ✓ |
| `production_enabled` | Full production | ✓ |

## Running Operations

### Evaluate Platform Gates

```bash
# Evaluate all platforms
npm run platform:gate-evaluate

# Evaluate specific platform
npm run platform:gate-evaluate -- tiktok_shop
```

### Request Enablement Review

```bash
npm run governance:review -- tiktok_shop sandbox_preview admin@example.com
```

Available phases: `disabled`, `internal_only`, `sandbox_preview`, `limited_public_preview`, `production_candidate`, `production_enabled`

### Approve/Reject Review

```bash
# Approve
npm run governance:approve -- <reviewId> approvedBy@example.com

# Reject
npm run governance:reject -- <reviewId> rejectedBy@example.com "Reason for rejection"
```

### Check Readiness

```bash
npm run governance:readiness -- tiktok_shop
```

### Run TikTok Shop Promotion Review

```bash
# Check promotion support status
npm run tiktok:promotion-review -- check

# Test promotion resolution
npm run tiktok:promotion-review -- test url "https://shop.tiktok.com/product/123"

# Validate compatibility requirements
npm run tiktok:promotion-review -- validate

# Run sandbox tests
npm run tiktok:promotion-review -- sandbox
```

## API Reference

### Internal API

```bash
# Get all platform gates
GET /internal/platforms/gates

# Get platform gate
GET /internal/platforms/gates/:platform

# Evaluate platform gates
POST /internal/platforms/gates/:platform/evaluate

# Get support state
GET /internal/platforms/support-state/:platform

# Get all support states
GET /internal/platforms/support-states

# Sandbox resolve
POST /internal/platforms/sandbox/resolve
{
  "platform": "tiktok_shop",
  "inputType": "url",
  "inputValue": "https://shop.tiktok.com/product/123",
  "resolutionType": "promotion"
}

# Get sandbox usage
GET /internal/platforms/sandbox/usage/:platform?period=hourly

# Request enablement review
POST /internal/platforms/governance/reviews
{
  "platform": "tiktok_shop",
  "targetPhase": "sandbox_preview",
  "requestedBy": "admin@example.com"
}

# Get pending reviews
GET /internal/platforms/governance/reviews?platform=tiktok_shop

# Approve review
POST /internal/platforms/governance/reviews/:reviewId/approve
{
  "approvedBy": "admin@example.com",
  "conditions": ["condition1", "condition2"]
}

# Reject review
POST /internal/platforms/governance/reviews/:reviewId/reject
{
  "rejectedBy": "admin@example.com",
  "reason": "Not ready for production"
}

# Get readiness checks
GET /internal/platforms/governance/readiness/:platform

# Get audits
GET /internal/platforms/audits?platform=tiktok_shop&limit=100
```

## Quality Thresholds

| Metric | Production | Sandbox | Supported |
|--------|------------|---------|-----------|
| Quality Score | ≥60% | ≥30% | ≥50% |
| Error Rate | ≤10% | ≤20% | ≤15% |
| Health Score | ≥70% | ≥40% | ≥60% |
| Success Rate | ≥85% | ≥70% | ≥80% |

## Scaling Decisions

### Scale Up When

- Health ≥ 80% sustained for 24 hours
- Error rate < 10%
- Quality ≥ 60%
- Governance approval obtained
- All readiness checks pass

### Scale Down When

- Health < 60%
- Error rate > 15%
- Quality < 50%
- Governance withdrawal
- Critical blockers identified

## Troubleshooting

### Issue: Platform shows as unsupported

**Diagnosis:**
1. Check domain knowledge - is platform recognized?
2. Check data foundation - are data models available?
3. Check acquisition - is pipeline operational?

**Resolution:**
1. Add domain knowledge for platform
2. Ensure data models created
3. Verify acquisition pipeline health

### Issue: Sandbox resolution failing

**Diagnosis:**
1. Check quota limits
2. Verify input format
3. Check context loading

**Resolution:**
1. Wait for quota reset
2. Validate input format
3. Check data foundation

### Issue: Governance review rejected

**Diagnosis:**
1. Check blockers identified
2. Review readiness score
3. Check risk assessment

**Resolution:**
1. Address blockers
2. Improve readiness checks
3. Mitigate identified risks
4. Resubmit review

### Issue: Quality score low

**Diagnosis:**
1. Check data quality
2. Verify acquisition health
3. Review resolution performance

**Resolution:**
1. Improve data quality
2. Fix acquisition issues
3. Optimize resolution

## Support

For issues:
- Check logs: `logs/platform-resolution-gates/`
- Review audits via API
- Consult architecture documentation
- Contact platform team
