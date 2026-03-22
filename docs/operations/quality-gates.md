# Quality Gates Documentation

## Overview

Quality gates are automated checks that must pass before code can be merged or released. They ensure code quality, security, and operational readiness.

---

## Quality Gates List

### 1. Type Safety Gate

**Purpose:** Ensure TypeScript type safety

**Commands:**
```bash
npx tsc --noEmit
```

**Pass Criteria:**
- No TypeScript errors
- Strict mode enabled

**Block Merge:** YES (hard failure)

**Environment:** All

---

### 2. Build Gate

**Purpose:** Verify project builds successfully

**Commands:**
```bash
npm run build
```

**Pass Criteria:**
- Build completes without errors
- `dist/` directory created

**Block Merge:** YES (hard failure)

**Environment:** All

---

### 3. Lint Gate

**Purpose:** Code style and quality

**Commands:**
```bash
npx prettier --check .
npx eslint src/ --ext .ts,.tsx
```

**Pass Criteria:**
- No formatting violations
- ESLint errors ≤ 0
- ESLint warnings ≤ 50

**Block Merge:** NO (soft failure - informational)

**Environment:** All

---

### 4. Security Gate

**Purpose:** Detect secrets and vulnerabilities

**Commands:**
```bash
# Secret detection
grep -rE "AKIA[0-9A-Z]{16}" --include="*.ts" .

# Dependency audit
npm audit
```

**Pass Criteria:**
- No exposed secrets
- No critical/high vulnerabilities

**Block Merge:** YES (for secrets), NO (for vulnerabilities)

**Environment:** All

---

### 5. Migration Safety Gate

**Purpose:** Prevent dangerous database changes

**Commands:**
```bash
./scripts/runtime/run-migration-checks.sh --env staging
```

**Pass Criteria:**
- No DROP TABLE operations
- No TRUNCATE operations
- No DROP COLUMN operations

**Block Merge:** YES (for dangerous operations)

**Environment:** Staging, Production

---

### 6. Container Build Gate

**Purpose:** Verify Dockerfiles build successfully

**Commands:**
```bash
docker build -f Dockerfile.web --target runner .
docker build -f Dockerfile.control-plane --target runner .
docker build -f Dockerfile.worker --target runner .
```

**Pass Criteria:**
- All Dockerfiles build successfully

**Block Merge:** NO (soft failure - informational)

**Environment:** CI, Staging, Production

---

### 7. Startup Checks Gate

**Purpose:** Verify runtime can initialize

**Commands:**
```bash
npm run check:startup -- --role worker-crawler --env local
```

**Pass Criteria:**
- All dependency checks pass
- No missing environment variables

**Block Merge:** NO (soft failure)

**Environment:** CI

---

### 8. Release Verification Gate

**Purpose:** Post-deployment validation

**Commands:**
```bash
npm run verify:release -- --env staging
```

**Pass Criteria:**
- Health endpoints respond
- Workers boot successfully
- Control plane operational

**Block Release:** YES (for staging and production)

**Environment:** Staging, Production

---

## Gate Matrix

| Gate | CI | PR | Staging | Production |
|------|-----|-----|---------|-----------|
| Type Safety | ✅ | ✅ | ✅ | ✅ |
| Build | ✅ | ✅ | ✅ | ✅ |
| Lint | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| Security | ✅ | ✅ | ✅ | ✅ |
| Migration Safety | - | - | ✅ | ✅ |
| Container Build | ⚠️ | ⚠️ | ✅ | ✅ |
| Startup Checks | ⚠️ | - | - | - |
| Release Verification | - | - | ✅ | ✅ |

✅ = Blocks | ⚠️ = Warning only | - = Not run

---

## Fail Escalation

### Critical Gates (Block Immediately)

1. **Type Safety** - Compile errors indicate broken code
2. **Build** - Can't deploy without build artifacts
3. **Security** - Exposed secrets are critical
4. **Migration Safety** - Dangerous ops can cause data loss
5. **Release Verification** - Must verify before release

### Warning Gates (Informational)

1. **Lint** - Style issues don't block functionality
2. **Container Build** - May be environment-specific
3. **Startup Checks** - May be CI environment limitations

---

## Overriding Gates

### When to Override

Only override gates in exceptional circumstances:

- False positives in security scanning
- Known issues with specific dependencies
- Emergency hotfixes with team approval

### How to Override

1. **Document the override** - Create issue explaining why
2. **Get approval** - Team lead or security team
3. **Add bypass flag** - Use workflow_dispatch with override option

```bash
# Example override in workflow dispatch
gh workflow run release-staging.yml -f skip_migrations=true
```

---

## Troubleshooting

### Type Errors After Merge

**Problem:** Type check passes locally but fails in CI

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm ci

# Check TypeScript version
npx tsc --version
```

### Build Fails in CI

**Problem:** Build works locally but fails in CI

**Solution:**
- Check CI environment variables
- Verify NODE_ENV is set correctly
- Ensure all environment variables are available

### Security Scan False Positives

**Problem:** Legitimate code flagged as secret

**Solution:**
- Use environment variables for secrets
- Add false positive patterns to .gitignore
- Review and validate scanner configuration

---

## Continuous Improvement

### Adding New Gates

1. Identify the need
2. Create the check script
3. Add to quality-gates.sh
4. Update workflow files
5. Document in this file

### Gate Metrics

Track gate performance:

- Pass rate by gate
- Average duration
- False positive rate
- Override frequency

---

## Contact

For questions about quality gates:
- DevOps Team: #devops
- Security Team: #security
