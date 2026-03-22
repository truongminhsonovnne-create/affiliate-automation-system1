# Environment Promotion Documentation

## Overview

This document describes the environment promotion strategy for the Affiliate Automation System, including promotion paths, approval models, artifact lineage, and rollback relationships.

---

## Promotion Path

```
local → development → staging → production
```

### Environment Purposes

| Environment | Purpose | Auto-Deploy | Approval Required |
|------------|---------|-------------|-------------------|
| local | Local development | N/A | No |
| development | Feature development | Yes | No |
| staging | Pre-production validation | No | No |
| production | Live system | No | Yes |

---

## Promotion Flow

### Development → Staging

**Trigger:** Merge to `main` or `develop` branch

**Automatic Process:**
1. CI runs quality gates
2. Build artifacts created
3. Container images built
4. Deploy to staging
5. Post-deploy verification runs

**Manual Override:**
```bash
gh workflow run release-staging.yml
```

---

### Staging → Production

**Trigger:** Release tag push or manual dispatch

**Process:**
1. Create release tag
2. CI runs production gates (stricter)
3. Approval required (GitHub Environment)
4. Build artifacts
5. Container images built and pushed
6. Deploy to production
7. Full post-deploy verification

**Creating Production Release:**

```bash
# Option 1: Create release tag
git tag v1.2.3
git push origin v1.2.3

# Option 2: GitHub CLI
gh release create v1.2.3 --generate-notes
```

---

## Approval Model

### Development

- **Approval:** Not required
- **Auto-deploy:** Yes, on merge
- **Speed:** Fast iteration

### Staging

- **Approval:** Not required
- **Auto-deploy:** No, manual trigger
- **Speed:** Moderate (runs full gates)

### Production

- **Approval:** Required
- **Auto-deploy:** No
- **Speed:** Slow (strict gates, manual approval)

### Setting Up Production Approval

1. Navigate to Repository Settings → Environments
2. Create or edit `production` environment
3. Enable "Required reviewers"
4. Add reviewers (minimum 2 recommended)
5. Configure wait timer (optional)

---

## Artifact Lineage

### Build Artifacts

Each environment uses artifacts built from the same source:

```
Source Code (Git Commit)
    ↓
Build (npm run build)
    ↓
Container Images (Docker)
    ↓
Deploy to Environment
```

### Version Tracking

| Environment | Version Format | Tag |
|-------------|----------------|-----|
| development | `dev-YYYYMMDD-HHMMSS` | `dev-*` |
| staging | `staging-YYYYMMDD-HHMMSS` | `staging-*` |
| production | `1.2.3` (semver) | `v1.2.3`, `*-latest` |

### Artifact Storage

- **Build artifacts:** GitHub Actions artifacts (7-30 days)
- **Container images:** GitHub Container Registry (ghcr.io)
- **Deployment records:** Stored in workflow artifacts

---

## Release Verification Expectations

### Staging Verification

| Check | Timeout | Required |
|-------|---------|----------|
| Liveness | 30s | Yes |
| Readiness | 60s | Yes |
| Control Plane | 30s | Yes |
| Dashboard/API | 30s | No |
| Workers | 60s | Yes |

### Production Verification

| Check | Timeout | Required |
|-------|---------|----------|
| Liveness | 30s | Yes |
| Readiness | 60s | Yes |
| Control Plane | 30s | Yes |
| Dashboard/API | 30s | Yes |
| Workers | 60s | Yes |
| Smoke Tests | 120s | Yes |

---

## Rollback Relationship

### Environment Rollback Independence

Each environment can be rolled back independently:

```
Production ← Can rollback to previous version
    ↑
Staging ← Can rollback to previous version
    ↑
Development ← Auto-deploy, no rollback needed
```

### Rollback Commands

**Staging Rollback:**
```bash
gh workflow run release-staging.yml -f version=previous-tag
```

**Production Rollback:**
```bash
# Option 1: Redeploy previous version
gh workflow run release-production.yml -f version=1.2.2

# Option 2: Kubernetes rollback
kubectl rollout undo deployment/affiliate
```

### Rollback Process

1. **Assess readiness** - Run rollback checks
2. **Choose version** - Select target version
3. **Execute rollback** - Deploy previous version
4. **Verify** - Run post-deploy checks
5. **Document** - Create incident report

---

## Promotion Checklist

### Before Promoting to Staging

- [ ] All CI quality gates pass
- [ ] Code reviewed and approved
- [ ] Tests passing
- [ ] Security scan clean
- [ ] Migration safety checks pass (if applicable)

### Before Promoting to Production

- [ ] Staging verification complete
- [ ] Performance testing done (if major change)
- [ ] Release notes prepared
- [ ] Rollback plan documented
- [ ] Team notified
- [ ] On-call informed (for major releases)

---

## Emergency Promotion

In case of emergency, use the expedited process:

1. **Get verbal approval** from team lead
2. **Use workflow dispatch** to trigger release
3. **Skip non-critical gates** if needed (document reason)
4. **Monitor closely** post-deploy
5. **Document** what happened after

---

## Contact

Questions about environment promotion:
- DevOps: #devops
- Release Manager: See on-call schedule
