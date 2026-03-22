# Environment Setup Guide

## Overview

All configuration is driven by environment variables. There are no hardcoded credentials.

**Security guarantee:** Apps fail immediately at startup if required secrets are missing. No fallback to weak defaults like `admin`/`changeme`.

---

## Quick Start

```bash
# 1. Copy the template
cp .env.example .env

# 2. Fill in required values (see table below)
nano .env

# 3. Install dependencies
npm install

# 4. Verify configuration
npm run check:startup
```

---

## Variable Reference

### Required Variables

| Variable | Min Length | Description |
|---|---|---|
| `GEMINI_API_KEY` | 1 | Google Gemini API key. Get from https://aistudio.google.com/app/apikey |
| `SUPABASE_URL` | 1 | Supabase project URL. Format: `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | 1 | Supabase service role key. Get from Supabase Dashboard → Settings → API |
| `ADMIN_USERNAME` | 1 | Username for admin dashboard login |
| `ADMIN_PASSWORD_HASH` | 60 | **Production only** — bcrypt hash of password. Set instead of `ADMIN_PASSWORD`. Generate with `node -e "const b = require('bcryptjs'); b.hash('pass', 12).then(h => console.log(h))"` |
| `ADMIN_PASSWORD` | 12 | **Dev/test only** — plain-text password. Auto-hashed at startup. Do NOT use in production. |
| `SESSION_SECRET` | 32 | Random string for signing session cookies. Generate: `openssl rand -hex 32` |
| `SESSION_VERSION` | 1 | Integer. Increment to revoke all active sessions instantly. |
| `CONTROL_PLANE_INTERNAL_SECRET` | 16 | Shared secret for admin↔control-plane auth. Generate: `openssl rand -hex 32` |
| `EXPERIMENT_SALT` | 16 | Random salt for experiment subject hashing. Generate: `openssl rand -hex 32` |
| `SHOPEE_USER_DATA_DIR` | 1 | Path to browser user data directory |
| `SHOPEE_MOBILE_USER_AGENT` | 1 | User agent string for Shopee mobile scraping |

### Optional Variables

| Variable | Default | Description |
|---|---|---|
| `GROQ_API_KEY` | — | Groq API key (optional, for faster AI inference) |
| `GEMINI_MODEL` | `gemini-2.0-flash` | AI model name |
| `NODE_ENV` | `development` | `development`, `production`, or `test` |
| `LOG_LEVEL` | `info` | Log verbosity: `trace`, `debug`, `info`, `warn`, `error`, `fatal` |
| `BROWSER_HEADLESS` | `true` | Run browser without UI (`false` for visual debugging) |
| `BROWSER_TIMEOUT` | `30000` | Browser action timeout in milliseconds |
| `CRAWLER_MAX_RETRIES` | `3` | Max retry attempts for failed crawl operations |
| `CRAWLER_DELAY_MIN` | `1000` | Minimum delay between crawl actions (ms) |
| `CRAWLER_DELAY_MAX` | `3000` | Maximum delay between crawl actions (ms) |
| `AI_ANALYSIS_BATCH_SIZE` | `10` | Products per AI analysis batch |
| `AI_CONFIDENCE_THRESHOLD` | `0.7` | Minimum AI confidence score (0–1) |
| `USE_REDIS_RATE_LIMIT` | `false` | Use Redis instead of in-memory rate limiter |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `TRUST_PROXY` | `false` | Trust reverse proxy headers (only enable behind proxy) |
| `TRUSTED_PROXY_IPS` | `127.0.0.1,::1` | Trusted proxy IP addresses |
| `INTERNAL_API_URL` | `http://localhost:3001` | Control plane URL (for admin dashboard) |

---

## Per-Environment Configuration

### Local Development

```bash
NODE_ENV=development
LOG_LEVEL=debug
BROWSER_HEADLESS=false
USE_REDIS_RATE_LIMIT=false
INTERNAL_API_URL=http://localhost:3001
```

### CI / Test

```bash
NODE_ENV=test
LOG_LEVEL=error
BROWSER_HEADLESS=true
USE_REDIS_RATE_LIMIT=false
```

### Production

```bash
NODE_ENV=production
LOG_LEVEL=warn
BROWSER_HEADLESS=true
USE_REDIS_RATE_LIMIT=true
REDIS_URL=redis://username:password@redis-host:6379
TRUST_PROXY=true
TRUSTED_PROXY_IPS=10.0.0.0/8,172.16.0.0/12
```

---

## Credential Generation

Generate secure random values for secrets:

```bash
# 32-character random string (hex)
openssl rand -hex 32

# 64-character random string (base64)
openssl rand -base64 48

# Strong password (printable ASCII)
openssl rand -base64 24 | tr -d '/+=' | head -c 20
```

---

## Admin Dashboard Authentication

The admin dashboard requires three related variables:

| Variable | Used By | Purpose |
|---|---|---|
| `ADMIN_USERNAME` | `apps/admin-dashboard` | Login username |
| `ADMIN_PASSWORD` | `apps/admin-dashboard` | Login password |
| `CONTROL_PLANE_INTERNAL_SECRET` | Admin dashboard proxy + Control Plane | Server-to-server auth |
| `SESSION_SECRET` | `apps/admin-dashboard` | Cookie signing (min 32 chars) |

All four must be set. If any are missing, the app **will not start** (fail-fast).

---

## Control Plane

The control plane service (`src/controlPlane/`) reads the same `.env` file. Ensure `CONTROL_PLANE_INTERNAL_SECRET` matches between the admin dashboard and the control plane service.

Startup command:
```bash
npm run runtime
```

---

## Startup Verification

Check that all required variables are set without revealing values:

```bash
npm run check:startup
```

Expected output if misconfigured:
```
❌ Missing required environment variables:
  • ADMIN_PASSWORD (minimum 12 characters)
  • SESSION_SECRET (minimum 32 characters)
```

---

## Never Do These

- ❌ **Never** commit `.env` with real credentials
- ❌ **Never** use `changeme`, `admin`, `password123`, or similar as real credentials
- ❌ **Never** use the same secret in development and production
- ❌ **Never** log environment variable values (secrets are never in logs)
- ❌ **Never** add real credentials to `.env.example` — use placeholder text like `your-key-here`

---

## Secrets Rotation

When rotating a secret:

1. Generate a new value: `openssl rand -hex 32`
2. Update `.env` (do NOT commit the new value yet)
3. Deploy the new value to the service
4. Verify the service starts and functions correctly
5. Commit the updated `.env.example` (if the template changed)
6. Revoke the old credential from the provider

---

## Git Hooks

A pre-commit hook (`scripts/runSecretExposureCheck.ts`) runs automatically before every commit to detect accidentally committed secrets. If it finds high-severity issues, the commit is blocked.

To bypass in emergencies: `git commit --no-verify` (use sparingly and audit afterwards).
