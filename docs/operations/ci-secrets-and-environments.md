# CI Secrets and Environments Documentation

## Overview

This document describes how secrets and environments are managed in CI/CD workflows for the Affiliate Automation System.

---

## GitHub Environments

### Available Environments

| Environment | Protection | Required Secrets |
|------------|------------|------------------|
| development | No | None |
| staging | Limited | SUPABASE_URL, STAGING_SUPABASE_URL |
| production | Full | All production secrets |

### Environment Configuration

```yaml
# Example environment configuration
environment:
  name: production
  url: https://affiliate.example.com
  protection:
    required_reviewers: 2
    wait_timer: 0
    branch_policy: main
```

---

## Secrets Management

### Required Secrets by Workflow

#### CI Workflow

| Secret | Required | Description |
|--------|----------|-------------|
| None | - | CI doesn't require secrets |

#### Staging Release

| Secret | Required | Description |
|--------|----------|-------------|
| STAGING_SUPABASE_URL | Yes | Staging database URL |
| STAGING_SUPABASE_SERVICE_KEY | Yes | Staging service key |

#### Production Release

| Secret | Required | Description |
|--------|----------|-------------|
| PRODUCTION_SUPABASE_URL | Yes | Production database URL |
| PRODUCTION_SUPABASE_SERVICE_KEY | Yes | Production service key |
| PRODUCTION_GEMINI_API_KEY | Yes | Production Gemini API key |
| REGISTRY_USERNAME | If custom registry | Container registry username |
| REGISTRY_PASSWORD | If custom registry | Container registry password |

### Setting Secrets

```bash
# Via GitHub CLI
gh secret set SUPABASE_URL --body "https://xxx.supabase.co"
gh secret set SUPABASE_SERVICE_KEY --body "eyJxxx"

# Via Web UI
# Repository → Settings → Secrets and variables → Actions
```

---

## Environment Variables

### Default Variables

| Variable | Description | Example |
|---------|-------------|---------|
| NODE_ENV | Node environment | production |
| GITHUB_TOKEN | GitHub token | (auto-generated) |
| GITHUB_SHA | Commit SHA | abc123 |
| GITHUB_REF | Git ref | refs/tags/v1.0.0 |

### Custom Variables

| Variable | Description | Used In |
|----------|-------------|---------|
| SUPABASE_URL | Database URL | All workflows |
| STAGING_SUPABASE_URL | Staging DB URL | Staging workflow |
| PRODUCTION_SUPABASE_URL | Production DB URL | Production workflow |

---

## Environment Protection Rules

### Development

- No protection
- Auto-deploy enabled
- No approval required

### Staging

- Basic protection
- Manual trigger required
- No approval required
- Concurrency: 2 concurrent releases

### Production

- Full protection
- Required reviewers
- Approval required
- Concurrency: 1 (exclusive lock)

---

## Secure Usage Patterns

### 1. Never Log Secrets

```yaml
# BAD - Secret in logs
- run: echo $SECRET

# GOOD - Masked output
- run: echo "##[add-mask]$SECRET"
```

### 2. Use Environment-Specific Variables

```yaml
# GOOD - Use environment-specific vars
env:
  SUPABASE_URL: ${{ vars.STAGING_SUPABASE_URL }}
```

### 3. Pass Secrets as Inputs

```yaml
# GOOD - Explicit inputs
- uses: actions/checkout@v4
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
```

### 4. Use Separate Secrets per Environment

```yaml
# GOOD - Environment-specific secrets
- name: Deploy to staging
  env:
    SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}

- name: Deploy to production
  env:
    SUPABASE_URL: ${{ secrets.PRODUCTION_SUPABASE_URL }}
```

---

## Secrets Boundaries

### What Can Be Accessed

| Secret | CI | Staging | Production |
|--------|-----|---------|------------|
| Development secrets | ✅ | ❌ | ❌ |
| Staging secrets | ❌ | ✅ | ❌ |
| Production secrets | ❌ | ❌ | ✅ |

### Best Practices

1. **Least Privilege** - Only grant necessary secrets
2. **Environment Isolation** - Don't share secrets across environments
3. **Rotation** - Rotate secrets regularly
4. **Audit** - Review secret access logs

---

## Registry Credentials

### GitHub Container Registry (ghcr.io)

```yaml
# Automatic with GITHUB_TOKEN
- uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```

### Custom Registry

```yaml
- uses: docker/login-action@v3
  with:
    registry: docker.example.com
    username: ${{ secrets.REGISTRY_USERNAME }}
    password: ${{ secrets.REGISTRY_PASSWORD }}
```

---

## Troubleshooting

### Secret Not Found

**Problem:** `Secret not found` error

**Solution:**
1. Verify secret is set in repository settings
2. Check secret name matches exactly
3. Ensure workflow has correct permissions

### Permission Denied

**Problem:** `Permission denied` error

**Solution:**
1. Check GITHUB_TOKEN permissions
2. Verify repository settings
3. Ensure secrets are in correct scope

### Environment Not Protected

**Problem:** Production deploys without approval

**Solution:**
1. Enable GitHub Environments
2. Configure required reviewers
3. Enable branch protection

---

## Security Checklist

- [ ] Production secrets stored in GitHub Secrets
- [ ] No secrets in code or logs
- [ ] Environment protection enabled
- [ ] Required reviewers configured
- [ ] Secrets scoped per environment
- [ ] Token permissions minimized
- [ ] Audit logs reviewed regularly

---

## Contact

For security-related questions:
- Security Team: #security
- DevOps: #devops
