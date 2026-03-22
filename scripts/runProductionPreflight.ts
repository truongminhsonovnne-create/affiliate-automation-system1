/**
 * Production Preflight Validation Script
 *
 * Validates production readiness before deployment.
 * Run this before starting any production service.
 */

import { runSecurityPostureChecks, logSecurityPostureReport } from '../src/security/posture/index.js';

console.log('\n');
console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║              PRODUCTION PREFLIGHT VALIDATION                          ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');

const nodeEnv = process.env.NODE_ENV || 'development';
console.log(`Environment: ${nodeEnv}`);
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log('');

// ============================================================================
// PHASE 1: Security Posture Checks
// ============================================================================

console.log('─'.repeat(76));
console.log('PHASE 1: Security Posture');
console.log('─'.repeat(76));

const postureReport = runSecurityPostureChecks();
logSecurityPostureReport(postureReport);

if (postureReport.level === 'critical' && nodeEnv === 'production') {
  console.log('\n❌ CRITICAL: Cannot start in production with critical security issues');
  process.exit(1);
}

// ============================================================================
// PHASE 2: Production Profile Validation
// ============================================================================

console.log('\n' + '─'.repeat(76));
console.log('PHASE 2: Production Profile Validation');
console.log('─'.repeat(76));

interface PreflightResult {
  passed: boolean;
  name: string;
  detail: string;
  critical?: boolean;
}

const results: PreflightResult[] = [];

// Check 1: Environment profile
const envChecks = [
  {
    name: 'NODE_ENV',
    critical: nodeEnv === 'production',
    check: () => {
      if (nodeEnv !== 'production') {
        return { passed: false, detail: `NODE_ENV=${nodeEnv}, expected production` };
      }
      return { passed: true, detail: 'NODE_ENV=production' };
    }
  },
  {
    name: 'CONTROL_PLANE_INTERNAL_SECRET',
    critical: true,
    check: () => {
      const secret = process.env.CONTROL_PLANE_INTERNAL_SECRET;
      if (!secret) {
        return { passed: false, detail: 'Not set - required for production' };
      }
      if (secret.length < 32) {
        return { passed: false, detail: `Too short (${secret.length} chars), minimum 32` };
      }
      if (secret === 'dev-secret' || secret === 'changeme') {
        return { passed: false, detail: 'Appears to be placeholder' };
      }
      return { passed: true, detail: `Set (${secret.length} chars)` };
    }
  },
  {
    name: 'ADMIN_PASSWORD',
    critical: true,
    check: () => {
      const pw = process.env.ADMIN_PASSWORD;
      if (!pw) {
        return { passed: false, detail: 'Not set - required for production' };
      }
      if (pw.length < 12) {
        return { passed: false, detail: `Too short (${pw.length} chars), minimum 12` };
      }
      if (pw === 'changeme' || pw === 'admin123') {
        return { passed: false, detail: 'Appears to be weak/default password' };
      }
      return { passed: true, detail: `Set (${pw.length} chars)` };
    }
  },
  {
    name: 'SESSION_SECRET',
    critical: false,
    check: () => {
      const secret = process.env.SESSION_SECRET;
      if (!secret) {
        return { passed: false, detail: 'Not set - will use fallback (not recommended)' };
      }
      if (secret.length < 32) {
        return { passed: false, detail: `Too short (${secret.length} chars)` };
      }
      return { passed: true, detail: `Set (${secret.length} chars)` };
    }
  },
  {
    name: 'USE_REDIS_RATE_LIMIT',
    critical: nodeEnv === 'production',
    check: () => {
      const useRedis = process.env.USE_REDIS_RATE_LIMIT === 'true';
      if (!useRedis && nodeEnv === 'production') {
        return { passed: false, detail: 'Not using Redis - memory limiter not recommended for production' };
      }
      if (useRedis) {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
          return { passed: false, detail: 'USE_REDIS_RATE_LIMIT=true but REDIS_URL not set' };
        }
        return { passed: true, detail: `Redis configured: ${redisUrl.replace(/\/\/.*:.*@/, '//***:***@')}` };
      }
      return { passed: true, detail: 'Memory limiter (dev mode)' };
    }
  },
  {
    name: 'TRUST_PROXY',
    critical: false,
    check: () => {
      const trustProxy = process.env.TRUST_PROXY === 'true';
      const trustedProxies = process.env.TRUSTED_PROXY_IPS;

      if (!trustProxy) {
        return { passed: true, detail: 'Trust proxy disabled (safe)' };
      }

      if (trustProxy && !trustedProxies) {
        return { passed: false, detail: 'TRUST_PROXY=true but TRUSTED_PROXY_IPS not set' };
      }

      return { passed: true, detail: `Trust proxy with: ${trustedProxies}` };
    }
  },
  {
    name: 'CONTROL_PLANE_HOST',
    critical: false,
    check: () => {
      const host = process.env.CONTROL_PLANE_HOST;
      if (host === '0.0.0.0' && nodeEnv === 'production') {
        return { passed: false, detail: 'Binding to 0.0.0.0 in production - may expose internals' };
      }
      return { passed: true, detail: host === '0.0.0.0' ? 'All interfaces (dev only)' : `Binding to ${host}` };
    }
  },
  {
    name: 'CONTROL_PLANE_ENABLE_CORS',
    critical: false,
    check: () => {
      const enabled = process.env.CONTROL_PLANE_ENABLE_CORS === 'true';
      const origins = process.env.CONTROL_PLANE_CORS_ORIGINS;

      if (!enabled) {
        return { passed: true, detail: 'CORS disabled (safe)' };
      }

      if (origins === '*') {
        return { passed: false, detail: 'CORS wildcard - dangerous in production' };
      }

      if (!origins) {
        return { passed: false, detail: 'CORS enabled but no origins configured' };
      }

      return { passed: true, detail: `Origins: ${origins}` };
    }
  },
  {
    name: 'EXPLICIT_DEV_AUTH',
    critical: nodeEnv === 'production',
    check: () => {
      const enabled = process.env.EXPLICIT_DEV_AUTH === 'true';
      if (enabled && nodeEnv === 'production') {
        return { passed: false, detail: 'Dev auth enabled in production - security risk' };
      }
      return { passed: true, detail: enabled ? 'Dev auth enabled (dev only)' : 'Dev auth disabled' };
    }
  },
];

for (const check of envChecks) {
  const result = check.check();
  results.push({
    name: check.name,
    passed: result.passed,
    detail: result.detail,
    critical: check.critical,
  });
}

// ============================================================================
// PHASE 3: Required Env Vars for Production
// ============================================================================

console.log('\n' + '─'.repeat(76));
console.log('PHASE 3: Required Environment Variables');
console.log('─'.repeat(76));

const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CONTROL_PLANE_INTERNAL_SECRET',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
];

for (const varName of requiredVars) {
  const value = process.env[varName];
  const isSet = !!value && value.length > 0;
  const isPlaceholder = value === 'your-' + varName.toLowerCase().replace(/_/g, '-') ||
                       value === 'changeme' ||
                       value === 'your-service-role-key-here';

  if (!isSet) {
    results.push({ name: varName, passed: false, detail: 'Not set', critical: true });
  } else if (isPlaceholder) {
    results.push({ name: varName, passed: false, detail: 'Placeholder value', critical: true });
  } else {
    results.push({ name: varName, passed: true, detail: 'Set' });
  }
}

// ============================================================================
// PHASE 4: Runtime Profile
// ============================================================================

console.log('\n' + '─'.repeat(76));
console.log('PHASE 4: Runtime Profile');
console.log('─'.repeat(76));

const runtimeChecks = [
  {
    name: 'RUNTIME_ROLE',
    check: () => {
      const role = process.env.RUNTIME_ROLE;
      if (!role) {
        return { passed: false, detail: 'Not set - using default' };
      }
      return { passed: true, detail: role };
    }
  },
  {
    name: 'Log Level',
    check: () => {
      const level = process.env.LOG_LEVEL;
      if (nodeEnv === 'production' && level === 'debug') {
        return { passed: false, detail: 'DEBUG logging in production - performance risk' };
      }
      return { passed: true, detail: level || 'default' };
    }
  },
];

for (const check of runtimeChecks) {
  const result = check.check();
  results.push({ name: check.name, passed: result.passed, detail: result.detail });
}

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n' + '═'.repeat(76));
console.log('VALIDATION RESULTS');
console.log('═'.repeat(76) + '\n');

let passed = 0;
let failed = 0;
let criticalFailed = 0;

for (const result of results) {
  const icon = result.passed ? '✓' : '✗';
  const critical = result.critical ? ' [CRITICAL]' : '';
  console.log(`${icon} ${result.name}: ${result.detail}${critical}`);

  if (result.passed) {
    passed++;
  } else {
    failed++;
    if (result.critical) {
      criticalFailed++;
    }
  }
}

console.log('\n' + '─'.repeat(76));
console.log(`Passed: ${passed} | Failed: ${failed} | Critical Failed: ${criticalFailed}`);
console.log('─'.repeat(76));

// ============================================================================
// EXIT DECISION
// ============================================================================

if (criticalFailed > 0 && nodeEnv === 'production') {
  console.log('\n❌ PREFLIGHT FAILED: Critical issues must be fixed before production deployment\n');
  console.log('Fix the following issues:');
  for (const r of results) {
    if (!r.passed && r.critical) {
      console.log(`  - ${r.name}: ${r.detail}`);
    }
  }
  console.log('');
  process.exit(1);
}

if (failed > 0) {
  console.log('\n⚠️  PREFLIGHT WARNINGS: Non-critical issues detected');
  console.log('Review above and fix if needed.\n');
  // Don't exit on warnings - let operator decide
} else {
  console.log('\n✅ PREFLIGHT PASSED: Ready for production deployment\n');
}

process.exit(0);
