# Security Hardening Checklist - Production Deployment

## Overview
This document validates the security posture of the Affiliate Shopee project for production deployment.

## Current Status: ✅ READY WITH CONFIGURATION

The project has security infrastructure in place. The following checks pass:

### A. Internal Auth & Authorization (✅ DONE)
- **Control Plane Routes**: All `/internal/*` routes require authentication via `requireAuthentication` middleware
- **Auth Flow**: Uses `x-internal-secret` header with `CONTROL_PLANE_INTERNAL_SECRET`
- **Weak Auth Removed**: No `Bearer actorId:role` or bare `x-actor-id` as primary auth
- **No Default Actor**: Production fails-closed when no valid auth
- **Role-based Access**: `requireRole()` and `requireAction()` middleware enforce permissions
- **Dev Fallback**: Only enabled via explicit `EXPLICIT_DEV_AUTH=true` in dev mode

### B. Network Exposure (✅ DONE)
- **Bind Host**: Default `127.0.0.1` (localhost) - not `0.0.0.0`
- **CORS**: Disabled by default, allowlist-only when enabled
- **Docker**: Multi-stage builds with non-root user (`app:nodejs`)

### C. Config & Secrets (✅ INFRASTRUCTURE DONE)
- **Env Variables**: Documented in `.env.example`
- **Posture Checks**: `assertSecurityPosture()` runs at startup
- **Validation**: Checks internal secret, admin credentials, rate limiter, CORS, bind host

### D. Dashboard Auth (✅ DONE)
- **Middleware Protection**: `requireAuthentication` on all dashboard routes
- **Fail-Closed**: Returns 401 if not authenticated

### E. Public API Rate Limiting (✅ DONE)
- **Route-based Policies**: Lightweight/Medium/High cost tiers
- **Redis Support**: `USE_REDIS_RATE_LIMIT=true` for production
- **Trust Proxy**: Configurable with `TRUST_PROXY` and `TRUSTED_PROXY_IPS`
- **Client Identity**: Fingerprinting + IP validation
- **Fallback**: Memory limiter warns but allows requests if Redis fails

### F. Security Observability (✅ DONE)
- **Startup Checks**: 7 posture checks in `security/posture/index.ts`
- **Logging**: Auth failures, rate limit blocks, warnings
- **Metrics**: Rate limit exceeded, blocked counters

---

## Pre-Deployment Checklist

### Required Environment Variables (Production)

```bash
# ===== CRITICAL =====
# Internal Auth - REQUIRED
CONTROL_PLANE_INTERNAL_SECRET=<min-32-char-secret>

# Admin Credentials - REQUIRED
ADMIN_USERNAME=<admin-username>
ADMIN_PASSWORD=<min-12-char-password>

# ===== RECOMMENDED =====
# Rate Limiting - REQUIRED for production
USE_REDIS_RATE_LIMIT=true
REDIS_URL=redis://redis:6379

# Trust Proxy - Only if behind reverse proxy
TRUST_PROXY=true
TRUSTED_PROXY_IPS=10.0.0.0/8,172.16.0.0/12

# Network - SECURE DEFAULTS
CONTROL_PLANE_HOST=127.0.0.1
CONTROL_PLANE_PORT=3001
CONTROL_PLANE_ENABLE_CORS=false

# Security
NODE_ENV=production
EXPLICIT_DEV_AUTH=false
```

### Deployment Validation

Run before deployment:
```bash
# Verify security posture
npm run security:check

# Or manually
npx tsx scripts/security-hardening-verify.ts
```

Expected output: All checks pass, no critical issues.

---

## Known Limitations & Recommendations

### 1. Session Management
- Current: Token-based via headers
- Recommendation: Implement httpOnly cookie sessions for dashboard
- Priority: MEDIUM (current implementation is acceptable for internal use)

### 2. Redis Rate Limiter
- Current: In-memory fallback allowed in dev
- Recommendation: Always use Redis in production
- Priority: HIGH - configure before public deployment

### 3. Dashboard Login UI
- Current: No dedicated login page
- Recommendation: Add login flow if admin dashboard is public-facing
- Priority: MEDIUM

### 4. TLS/SSL
- Current: Not configured in code
- Recommendation: Terminate TLS at load balancer/reverse proxy
- Priority: HIGH - configure at infrastructure level

---

## Files Reference

### Security Core
- `src/security/posture/index.ts` - Startup posture checks
- `src/security/auth/internalTokenAuth.ts` - Internal auth logic
- `src/controlPlane/auth/internalAuth.ts` - Control plane auth

### Network & CORS
- `src/controlPlane/http/server.ts` - Server config with secure defaults

### Rate Limiting
- `src/publicApi/rateLimit/store.ts` - Redis/Memory store abstraction
- `src/publicApi/rateLimit/clientIdentity.ts` - IP resolution & fingerprinting
- `src/publicApi/rateLimit/policy.ts` - Route-based policies

### Middleware
- `src/controlPlane/http/middleware/authGuard.ts` - Auth middleware
- `src/controlPlane/http/middleware/requestContext.ts` - Context extraction

---

## Quick Start

### Development
```bash
cp .env.example .env
# Edit .env with your values
npm run dev
```

### Production
```bash
# 1. Set required env vars
export CONTROL_PLANE_INTERNAL_SECRET=<secret>
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=<password>
export USE_REDIS_RATE_LIMIT=true
export NODE_ENV=production

# 2. Verify posture
npm run security:check

# 3. Deploy
docker build -f Dockerfile.control-plane -t affiliate-control-plane .
```

---

## Post-Deployment Monitoring

### Key Metrics
- `rate_limit_exceeded` - When users hit limits
- `rate_limit_blocked` - Hard blocks
- `auth_failures` - Failed authentication attempts

### Logs to Watch
- `Authentication failed - invalid credentials` - Potential attack
- `Rate limit exceeded` - Possible abuse
- `CORS rejected origin` - Misconfigured client

---

Last Updated: 2026-03-18
