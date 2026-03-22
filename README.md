# VoucherFinder

**Tìm mã giảm giá Shopee miễn phí** — công cụ tra cứu voucher tự động, không quảng cáo, không phí dịch vụ.

```
Browser → Vercel (Next.js) → Railway (Control Plane) → MasOffer / AccessTrade API → Supabase
```

---

## Repository Structure

```
Affiliate/                          # Monorepo root
├── apps/admin-dashboard/            # Next.js 14 app (Vercel-deployable)
│   ├── src/app/                   # Next.js App Router pages
│   │   ├── home/                  # Public homepage (/)
│   │   ├── info/                  # Legal pages (about, privacy, terms, cookies, contact)
│   │   ├── resources/             # SEO article pages
│   │   ├── admin/                # Admin dashboard (auth-protected)
│   │   └── api/                  # API routes
│   │       ├── internal/sync/     # Sync endpoints (x-sync-secret protected)
│   │       ├── auth/             # Admin auth
│   │       └── public/           # Public voucher resolution API
│   └── vercel.json               # Vercel deployment config
├── src/                           # Standalone Node.js / crawler scripts
│   ├── orchestrator/              # Crawl → AI → DB pipeline
│   ├── crawler/                  # Playwright Shopee crawler
│   ├── ai/                       # Gemini content generation
│   └── scripts/                  # Operational scripts (sync, migrate, etc.)
├── supabase/migrations/          # Database schema migrations
├── .github/workflows/             # CI/CD + sync scheduler
└── docs/                          # Architecture & integration docs
```

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/your-org/voucherfinder.git
cd voucherfinder
npm ci
```

### 2. Configure environment

```bash
# Admin dashboard (deploy to Vercel)
cp apps/admin-dashboard/.env.example apps/admin-dashboard/.env.local
# Edit .env.local with your real values

# Root scripts / crawler (local only)
cp .env.example .env
# Edit .env with your real values
```

### 3. Run locally

```bash
# Admin dashboard
cd apps/admin-dashboard
npm run dev
# Opens at http://localhost:3000

# Sync (MasOffer + AccessTrade → Supabase)
cd ../..
npm run masoffer:sync:dry   # Dry run first
npm run masoffer:sync        # Live sync
```

---

## Environment Variables

### `apps/admin-dashboard/.env.local` — Vercel deployment

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | All | Canonical domain (e.g. `https://voucherfinder.app`) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | All | Public contact email |
| `NEXT_PUBLIC_INTERNAL_API_URL` | All | Internal API URL (server-side rewrite target) |
| `SUPABASE_URL` | Server | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Supabase service role key |
| `SESSION_SECRET` | Server | HMAC signing key (min 48 hex chars) |
| `SESSION_VERSION` | All | Increment to revoke all sessions |
| `ADMIN_PASSWORD_HASH` | Server | bcrypt hash of admin password |
| `CONTROL_PLANE_INTERNAL_SECRET` | Server | Same as Railway value |
| `ACCESSTRADE_API_KEY` | Server | AccessTrade publisher API key |
| `MASOFFER_PUBLISHER_ID` | Server | MasOffer Publisher ID |
| `MASOFFER_API_TOKEN` | Server | MasOffer API token |
| `SYNC_SHARED_SECRET` | Server | Must match GitHub Secret |
| `INTERNAL_API_URL` | Server | Railway/Render backend URL |

Generate secrets:

```bash
# Session / sync secrets
openssl rand -hex 48   # → SESSION_SECRET
openssl rand -hex 32   # → SYNC_SHARED_SECRET, CONTROL_PLANE_INTERNAL_SECRET

# Admin password hash
node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
```

---

## Deploy to Vercel

### Prerequisites

1. **Railway** account — deploy the Control Plane backend first
2. **Supabase** project — note URL and service role key
3. **MasOffer** publisher account — note API token and Publisher ID
4. **AccessTrade** publisher account — note API key

### Step 1 — Deploy Control Plane (Railway)

```bash
# 1. Push repo to GitHub
# 2. Connect repo to Railway: https://railway.app
# 3. Add environment variables (see DEPLOY.md in apps/admin-dashboard/)
# 4. Note the Railway deployment URL (e.g. https://my-app.up.railway.app)
```

### Step 2 — Deploy Next.js (Vercel)

```bash
# 1. Go to https://vercel.com
# 2. Import this repo
# 3. Set root directory to: apps/admin-dashboard
# 4. Framework: Next.js (auto-detected)
# 5. Set all environment variables (see table above)
# 6. Deploy
```

### Step 3 — Configure GitHub Secrets

In **GitHub → Settings → Secrets and variables → Actions**, add:

| Secret Name | Value |
|---|---|
| `SYNC_ENDPOINT_URL` | Full URL of your Railway app (e.g. `https://my-app.up.railway.app`) |
| `SYNC_SHARED_SECRET` | Must match `SYNC_SHARED_SECRET` env var on Railway and Vercel |

The `sync-scheduler.yml` workflow runs daily at 06:00 and 18:00 UTC, calling your sync endpoints with the shared secret.

---

## Sync Scheduler

The GitHub Actions workflow `sync-scheduler.yml` syncs offer data from MasOffer and AccessTrade into Supabase on a schedule.

### Manual trigger

```bash
# GitHub Actions UI → sync-scheduler → Run workflow
# Options:
#   sources: masoffer,accesstrade  (or leave empty for all)
#   mode: incremental | full
#   dry_run: false | true
```

### Verify sync is working

```bash
# Replace with your actual Railway URL
curl -s -H "x-sync-secret: YOUR_SECRET" \
  https://your-railway-app.up.railway.app/api/internal/sync/health
```

Expected response: `{"ok":true,"database":{"status":"connected"},...}`

---

## Google Search Console Setup

After deploying to production:

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property: `https://your-production-domain.com`
3. Verify ownership (recommended: **DNS TXT record** or **HTML meta tag**)
4. Submit sitemap: `https://your-production-domain.com/sitemap.xml`

For HTML meta tag verification, add to Vercel environment variables:

```
NEXT_PUBLIC_GSC_VERIFY=google123abc...   ← value from GSC
```

---

## Google Analytics (optional)

Analytics is **disabled by default**. To enable:

```bash
# In Vercel environment variables
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

Events tracked (no PII): `page_view`, `link_submit`, `voucher_copy`, `outbound_shopee_click`, `contact_submit_success`, etc.

---

## Production Verification Checklist

Run through this after every deploy:

```bash
# 1. Site loads
curl -sI https://your-domain.com/home | grep HTTP
# Expected: HTTP/2 200

# 2. Health check
curl https://your-domain.com/api/health
# Expected: {"status":"ok","service":"VoucherFinder",...}

# 3. robots.txt
curl https://your-domain.com/robots.txt | grep Sitemap
# Expected: Sitemap: https://your-domain.com/sitemap.xml

# 4. sitemap.xml
curl https://your-domain.com/sitemap.xml | grep -c url
# Expected: > 0

# 5. OG image
curl -sI https://your-domain.com/og-default.png | grep HTTP
# Expected: HTTP/2 200

# 6. Favicon
curl -sI https://your-domain.com/favicon.svg | grep HTTP
# Expected: HTTP/2 200

# 7. Admin login page (should load)
curl -sI https://your-domain.com/admin/login | grep HTTP
# Expected: HTTP/2 200

# 8. Admin page blocked without session (should redirect)
curl -sI https://your-domain.com/admin/dashboard | grep HTTP
# Expected: HTTP/2 307 or 302

# 9. Sync health blocked without secret
curl -s https://your-domain.com/api/internal/sync/health
# Expected: {"error":"Unauthorized",...}

# 10. Sync health works with correct secret
curl -s -H "x-sync-secret: YOUR_SECRET" \
  https://your-domain.com/api/internal/sync/health
# Expected: {"ok":true,"database":{"status":"connected"},...}

# 11. Canonical URL in homepage HTML
curl -s https://your-domain.com/home | grep -i 'canonical'
# Expected: https://your-domain.com/... (not localhost, not wrong domain)

# 12. No localhost in production HTML
curl -s https://your-domain.com/home | grep -i 'localhost'
# Expected: (no output — nothing)

# 13. No dev badge in production
curl -s https://your-domain.com/home | grep -i 'dev\|debug\|staging'
# Expected: (no output — no debug indicators)

# 14. Build succeeds locally
cd apps/admin-dashboard && npm run build && echo "BUILD OK"
```

---

## Troubleshooting

### "Module not found" after build

```bash
npm ci          # Always use npm ci, not npm install
npm run build
```

### Metadata / sitemap points to wrong domain

Set `NEXT_PUBLIC_SITE_URL` as a Vercel environment variable and redeploy. Next.js reads `NEXT_PUBLIC_*` vars at **build time** for `output: standalone`.

### Sync endpoint returns 401

Check that `SYNC_SHARED_SECRET` is identical in:
- GitHub Secrets (`SYNC_SHARED_SECRET`)
- Vercel environment variables
- Railway environment variables

### Admin login not working

1. Check `SESSION_SECRET` is identical across all deployments
2. Verify `ADMIN_PASSWORD_HASH` is a valid bcrypt hash (starts with `$2a$` or `$2b$`)
3. Increment `SESSION_VERSION` to invalidate old sessions

### Database connection fails

- Verify `SUPABASE_URL` is the HTTP URL (not the PostgreSQL connection string)
- Check `SUPABASE_SERVICE_ROLE_KEY` has the correct format
- Test in Supabase Dashboard → SQL Editor first

---

## Updating the Site

```bash
git pull origin main
npm ci
cd apps/admin-dashboard && npm run build
# Vercel redeploys automatically on push to main
```

For Railway: redeploy manually or connect GitHub and enable auto-deploy.
