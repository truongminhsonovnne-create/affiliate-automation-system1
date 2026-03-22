# Release Runbook

## Pre-Release Checklist

### Code Preparation
- [ ] All tests passing (`npm test`)
- [ ] TypeScript compilation successful (`npm run build`)
- [ ] No linting errors (`npm run lint`)
- [ ] Security scan passed (`npm run security:check`)
- [ ] No hardcoded secrets in code

### Dependency Verification
- [ ] Dependencies up to date (`npm audit`)
- [ ] No known vulnerabilities in dependencies

### Environment Verification
- [ ] `.env` files exist for target environment
- [ ] Required secrets are available
- [ ] Environment variables validated

### Database
- [ ] Migration files ready (if schema changes)
- [ ] Migration rollback plan documented
- [ ] Backup verified (Supabase automatic)

### Testing
- [ ] Smoke tests passing locally
- [ ] Integration tests passing
- [ ] Manual testing complete (if major changes)

## Migration Checklist

### Pre-Migration
- [ ] Review all pending migrations
- [ ] Test migration in staging first
- [ ] Estimate migration duration
- [ ] Plan maintenance window (if needed)
- [ ] Notify stakeholders of change

### During Migration
- [ ] Run migration: `npm run db:migrate`
- [ ] Monitor for errors
- [ ] Verify data integrity

### Post-Migration
- [ ] Verify application starts
- [ ] Run smoke tests
- [ ] Monitor error rates
- [ ] Check database performance

### Rollback (if needed)
- [ ] Restore database from backup
- [ ] Redeploy previous version
- [ ] Verify rollback success

## Deployment Steps

### 1. Build
```bash
# Build application
npm run build

# Build Docker images
docker build -t affiliate-system:web -f Dockerfile.web .
docker build -t affiliate-system:control-plane -f Dockerfile.control-plane .
docker build -t affiliate-system:worker -f Dockerfile.worker .
```

### 2. Validate
```bash
# Run security checks
npm run security:check
npm run security:secrets-scan

# Run type check
npm run type-check

# Run tests
npm test
```

### 3. Deploy to Environment

#### Staging
```bash
# Deploy using docker-compose
docker-compose -f docker-compose.staging.yml up -d

# Or deploy to container registry
docker push registry.example.com/affiliate-system:staging
```

#### Production
```bash
# Deploy production (requires approval)
docker-compose -f docker-compose.production.yml up -d

# Verify deployment
npm run verify -- --env=production
```

### 4. Health Verification
```bash
# Check web health
curl https://affiliate.example.com/health

# Check control plane health
curl https://api.affiliate.example.com/health

# Check worker status
docker ps | grep worker
```

### 5. Post-Deploy Verification

```bash
# Run smoke tests
npm run smoke-tests

# Verify critical paths
npm run verify:critical-paths
```

## Post-Deploy Verification

### Dashboard Tests
- [ ] Login page loads
- [ ] Dashboard overview displays
- [ ] Can view publish jobs
- [ ] Can view dead letters

### Control Plane Tests
- [ ] Health endpoint returns 200
- [ ] Can authenticate
- [ ] Can fetch jobs
- [ ] Operator actions work

### Worker Tests
- [ ] Worker processes start
- [ ] Workers poll queues
- [ ] Jobs complete successfully

### Monitoring
- [ ] Error rates normal
- [ ] Response times normal
- [ ] No new alerts fired

## Rollback Steps

### Immediate Rollback (App Issue)

```bash
# Rollback to previous version
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d affiliate-system:previous-tag

# Or use rollback command
docker-compose -f docker-compose.production.yml rollback
```

### Database Rollback (Migration Issue)

```bash
# Only if migration caused issue
# Contact DBA or use Supabase dashboard
# Restore to point-in-time backup
```

### Verify Rollback
```bash
# Verify application works
curl https://affiliate.example.com/health

# Check logs for errors
docker-compose logs --tail=100
```

## Incident Response - Initial Actions

### Detection
- [ ] Alert received or user report
- [ ] Severity assessed (P1/P2/P3)

### Containment
- [ ] Identify affected components
- [ ] Disable feature flag (if applicable)
- [ ] Scale up/down if needed

### Investigation
- [ ] Check logs
- [ ] Check metrics
- [ ] Identify root cause

### Resolution
- [ ] Apply fix or rollback
- [ ] Verify resolution
- [ ] Update stakeholders

### Post-Incident
- [ ] Document incident
- [ ] Update runbook if needed
- [ ] Schedule review

## Release Freeze Conditions

### When to Freeze
- Critical security vulnerability
- Major incident pending
- Regulatory requirement

### During Freeze
- No deployments except security fixes
- Hotfixes require approval
- Emergency changes only

## Emergency Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| On-Call Engineer | #on-call | Team Lead |
| DBA | @dba-team | VP Engineering |
| Security | @security-team | CISO |

## Quick Reference Commands

```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production (requires approval)
npm run deploy:production

# Rollback
npm run rollback

# Check status
npm run status

# View logs
npm run logs -- --follow

# Run smoke tests
npm run smoke-tests
```
