# CI/CD Runbook

## Table of Contents

1. [Overview](#overview)
2. [CI Flow](#ci-flow)
3. [Staging Release Flow](#staging-release-flow)
4. [Production Release Flow](#production-release-flow)
5. [Failed Release Handling](#failed-release-handling)
6. [Failed Migration Handling](#failed-migration-handling)
7. [Artifact Debugging](#artifact-debugging)
8. [Workflow Rerun Policy](#workflow-rerun-policy)
9. [Approval Policy](#approval-policy)
10. [Rollback Triggers](#rollback-triggers)

---

## Overview

This runbook documents the CI/CD workflows for the Affiliate Automation System.

### Environments

| Environment | Purpose | Auto-Deploy | Approval Required |
|------------|---------|-------------|-------------------|
| Development | Feature development | Yes | No |
| Staging | Pre-production validation | No | No |
| Production | Live system | No | Yes |

---

## CI Flow

### Trigger Events

- Pull requests to `main`, `develop`, `release/**`
- Push to `main`, `develop`, `release/**`

### Quality Gates

1. **Dependency Installation** - Cached npm dependencies
2. **Lint** - ESLint and Prettier checks
3. **Type Check** - TypeScript strict compilation
4. **Build** - Production build
5. **Tests** - Unit/Integration tests (if available)
6. **Security** - Secret detection, dependency audit
7. **Migration Safety** - Check for dangerous SQL operations
8. **Startup Checks** - Runtime initialization validation
9. **Container Sanity** - Docker build verification

### Fail Fast Behavior

- Type check failures block merge immediately
- Build failures block merge
- Security issues with secrets block merge
- Other failures are informational but don't block

### Running CI Locally

```bash
# Run all quality gates
./scripts/ci/run-quality-gates.sh

# Skip specific gates
./scripts/ci/run-quality-gates.sh --skip-container

# Run with specific environment
./scripts/ci/run-quality-gates.sh --env staging
```

---

## Staging Release Flow

### Trigger Events

- Merge to `main` or `develop` branch
- Manual workflow dispatch

### Pipeline Stages

1. **Prepare** - Generate version, metadata
2. **Build** - TypeScript compilation
3. **Container** - Build all Docker images
4. **Pre-Deploy Checks** - Quality gates
5. **Migration Gates** - Safety checks for migrations
6. **Deploy** - Deploy to staging
7. **Verify** - Post-deploy smoke tests

### Release Versioning

```
main branch → staging-YYYYMMDD-HHMMSS
develop branch → dev-YYYYMMDD-HHMMSS
```

### Running Staging Release Manually

```bash
# Via GitHub CLI
gh workflow run release-staging.yml

# With specific version
gh workflow run release-staging.yml -f version=1.2.3
```

---

## Production Release Flow

### Trigger Events

- Release tag pushed (e.g., `v1.2.3`)
- Manual workflow dispatch with approval

### Pipeline Stages

1. **Approval** - Environment protection check
2. **Prepare** - Validate release tag
3. **Build** - Production build
4. **Container** - Build and push to registry
5. **Migration Gates** - Stricter than staging
6. **Pre-Deploy Checks** - Production quality gates
7. **Deploy** - Deploy to production
8. **Verify** - Full post-deploy verification
9. **Rollback Hook** - On failure, provide rollback guidance

### Production Release Approval

Production releases require:

1. **GitHub Environment Protection** - Requires reviewers
2. **Minimum Reviewers** - 2 reviewers recommended
3. **Staging Verified** - Must pass staging first

### Creating Production Release

```bash
# Create and push release tag
git tag v1.2.3
git push origin v1.2.3

# Or via GitHub CLI
gh release create v1.2.3 --generate-notes
```

---

## Failed Release Handling

### Identifying Failures

Check the workflow summary in GitHub Actions:

1. Navigate to the workflow run
2. Review the "Summary" section
3. Check failed job logs

### Common Failures

#### Build Failures

**Symptoms:** `build` job fails

**Investigation:**
```bash
# Check TypeScript errors
npx tsc --noEmit

# Check build script
npm run build
```

**Resolution:** Fix compilation errors, push fixes

#### Test Failures

**Symptoms:** `tests` job fails

**Investigation:**
```bash
# Run tests locally
npm test

# Run specific test suite
npm test -- --testPathPattern="integration"
```

**Resolution:** Fix failing tests, ensure test coverage

#### Migration Gate Failures

**Symptoms:** `migration-gates` job fails

**Investigation:**
```bash
# Run migration checks
./scripts/runtime/run-migration-checks.sh --env staging
```

**Resolution:** Review migration SQL, remove dangerous operations

#### Deployment Failures

**Symptoms:** `deploy` job fails

**Investigation:**
```bash
# Check deployment logs
# Verify environment variables
# Check target infrastructure
```

**Resolution:** Fix deployment issues, re-run workflow

---

## Failed Migration Handling

### Symptoms

- Migration gates fail
- Database errors during deploy
- Schema conflicts

### Investigation

1. Check migration files in `supabase/migrations/`
2. Review migration SQL for:
   - DROP TABLE statements
   - TRUNCATE operations
   - DROP COLUMN operations
3. Check migration order

### Resolution

#### For Staging

1. Fix migration in a new PR
2. Re-run staging release

#### For Production

1. **DO NOT** retry deployment
2. Create rollback migration:
   ```sql
   -- Example rollback
   ALTER TABLE table_name ADD COLUMN dropped_column TYPE;
   ```
3. Deploy rollback migration
4. Re-run release after fix

### Prevention

- Always test migrations in development first
- Use `CREATE TABLE` instead of `ALTER TABLE` for major changes
- Avoid `DROP` operations in production
- Maintain backward compatibility

---

## Artifact Debugging

### Download Build Artifacts

```bash
# Via GitHub CLI
gh run download <run-id> --name build-artifacts
```

### View Container Images

```bash
# List local images
docker images | grep affiliate

# Inspect image
docker inspect affiliate/web:tag
```

### Check Build Output

```bash
# List dist contents
ls -la dist/

# Check for specific files
find dist -name "*.js" | head -20
```

---

## Workflow Rerun Policy

### When to Rerun

- **Transient Failures** - Network timeouts, temporary unavailability
- **Flaky Tests** - Tests that sometimes fail
- **External Service Issues** - Temporary service unavailability

### When NOT to Rerun

- **Code Issues** - Fix the code, don't rerun
- **Configuration Issues** - Fix config, don't rerun
- **Repeated Failures** - Same failure on rerun indicates root cause

### Rerun Procedure

```bash
# Via GitHub CLI
gh run rerun <run-id>

# Or via web UI
# Navigate to failed run → Click "Re-run all jobs"
```

---

## Approval Policy

### Staging

- No approval required
- Auto-deploys on merge

### Production

1. **Release Tag Required**
   - Must create semver tag (e.g., `v1.2.3`)
   - No auto-deployment from branch merge

2. **Environment Protection**
   - Configure GitHub Environments
   - Require reviewers
   - Approve before deploy

3. **Manual Dispatch Option**
   - Can trigger via workflow dispatch
   - Still requires environment approval

### Setting Up Production Approval

1. Go to Repository Settings → Environments
2. Create/edit `production` environment
3. Enable "Required reviewers"
4. Add reviewers
5. Set wait timer (optional)

---

## Rollback Triggers

### When to Rollback

- **Critical Errors** - Service down, data corruption
- **Security Issues** - Vulnerability discovered
- **Failed Verification** - Post-deploy checks consistently fail
- **User-Reported Issues** - Major bugs in production

### Rollback Commands

```bash
# Via GitHub CLI (redeploy previous version)
gh workflow run release-production.yml -f version=1.2.2

# Or redeploy specific tag
git checkout v1.2.2
git tag -d v1.2.3
git push origin :refs/tags/v1.2.3
gh workflow run release-production.yml
```

### Post-Rollback

1. Create incident report
2. Fix root cause in development
3. Test in staging
4. Release fix as patch version

---

## Contact

For issues not covered in this runbook, contact:
- DevOps Team: #devops
- On-call: See PagerDuty schedule
