/**
 * Security Posture Check Script
 * Validates security configuration and setup
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

interface CheckResult {
  category: string;
  passed: boolean;
  message: string;
  details?: string;
}

const results: CheckResult[] = [];

// =============================================================================
// CHECKS
// =============================================================================

/**
 * Check required secrets are present
 */
function checkRequiredSecrets(): void {
  const requiredSecrets = [
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const missing: string[] = [];

  for (const secret of requiredSecrets) {
    if (!process.env[secret]) {
      missing.push(secret);
    }
  }

  if (missing.length > 0) {
    results.push({
      category: 'Secrets',
      passed: false,
      message: `Missing required secrets: ${missing.join(', ')}`,
    });
  } else {
    results.push({
      category: 'Secrets',
      passed: true,
      message: 'All required secrets are present',
    });
  }
}

/**
 * Check .gitignore
 */
function checkGitignore(): void {
  try {
    const gitignorePath = join(process.cwd(), '.gitignore');
    const content = readFileSync(gitignorePath, 'utf-8');

    const requiredPatterns = [
      '.env',
      '*.log',
      'sessions',
      'credentials',
    ];

    const missing: string[] = [];

    for (const pattern of requiredPatterns) {
      if (!content.includes(pattern)) {
        missing.push(pattern);
      }
    }

    if (missing.length > 0) {
      results.push({
        category: 'Git',
        passed: false,
        message: `.gitignore missing patterns: ${missing.join(', ')}`,
      });
    } else {
      results.push({
        category: 'Git',
        passed: true,
        message: '.gitignore is properly configured',
      });
    }
  } catch {
    results.push({
      category: 'Git',
      passed: false,
      message: '.gitignore not found',
    });
  }
}

/**
 * Check for hardcoded secrets in code
 */
function checkHardcodedSecrets(): void {
  const sensitivePatterns = [
    /sk-[a-zA-Z0-9]{20,}/,
    /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/,
    /service_role_key["']?\s*[:=]\s*["'][^"']+["']/i,
  ];

  const srcDir = join(process.cwd(), 'src');
  let violations: string[] = [];

  try {
    const files = getAllFiles(srcDir);

    for (const file of files) {
      if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;

      const content = readFileSync(file, 'utf-8');

      for (const pattern of sensitivePatterns) {
        if (pattern.test(content)) {
          violations.push(relative(process.cwd(), file));
          break;
        }
      }
    }
  } catch {
    // Directory not found
  }

  if (violations.length > 0) {
    results.push({
      category: 'Code Quality',
      passed: false,
      message: 'Potential hardcoded secrets found',
      details: violations.join('\n'),
    });
  } else {
    results.push({
      category: 'Code Quality',
      passed: true,
      message: 'No hardcoded secrets detected in source code',
    });
  }
}

/**
 * Check environment configuration
 */
function checkEnvironment(): void {
  const nodeEnv = process.env.NODE_ENV;

  if (!nodeEnv || nodeEnv === 'development') {
    results.push({
      category: 'Environment',
      passed: true,
      message: `Running in ${nodeEnv || 'development'} mode (appropriate for local)`,
    });
  } else if (nodeEnv === 'production') {
    results.push({
      category: 'Environment',
      passed: true,
      message: 'Running in production mode',
    });
  } else {
    results.push({
      category: 'Environment',
      passed: true,
      message: `Running in ${nodeEnv} mode`,
    });
  }
}

/**
 * Check storage paths
 */
function checkStoragePaths(): void {
  const sensitivePaths = ['sessions', 'credentials', 'keys', '.env'];

  try {
    const content = readFileSync(join(process.cwd(), '.gitignore'), 'utf-8');

    const missing: string[] = [];

    for (const path of sensitivePaths) {
      if (!content.includes(path)) {
        missing.push(path);
      }
    }

    results.push({
      category: 'Storage',
      passed: missing.length === 0,
      message: missing.length > 0
        ? `Storage paths need protection: ${missing.join(', ')}`
        : 'Storage paths properly protected',
    });
  } catch {
    results.push({
      category: 'Storage',
      passed: false,
      message: 'Unable to check storage paths',
    });
  }
}

/**
 * Check internal auth configuration
 */
function checkInternalAuth(): void {
  const hasInternalAuth = !!process.env.INTERNAL_AUTH_SECRET;

  if (hasInternalAuth) {
    const secret = process.env.INTERNAL_AUTH_SECRET!;
    if (secret.length < 32) {
      results.push({
        category: 'Authentication',
        passed: false,
        message: 'INTERNAL_AUTH_SECRET should be at least 32 characters',
      });
    } else {
      results.push({
        category: 'Authentication',
        passed: true,
        message: 'Internal authentication is configured',
      });
    }
  } else {
    results.push({
      category: 'Authentication',
      passed: false,
      message: 'INTERNAL_AUTH_SECRET is not configured',
      details: 'Internal auth secret should be set for control plane security',
    });
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function getAllFiles(dir: string, files: string[] = []): string[] {
  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip node_modules and hidden directories
        if (!entry.startsWith('.') && entry !== 'node_modules') {
          getAllFiles(fullPath, files);
        }
      } else {
        files.push(fullPath);
      }
    }
  } catch {
    // Directory not accessible
  }

  return files;
}

// =============================================================================
// MAIN
// =============================================================================

function main(): void {
  console.log('🔍 Running Security Posture Check...\n');

  checkRequiredSecrets();
  checkGitignore();
  checkHardcodedSecrets();
  checkEnvironment();
  checkStoragePaths();
  checkInternalAuth();

  // Print results
  console.log('═══════════════════════════════════════════');
  console.log('          SECURITY POSTURE REPORT           ');
  console.log('═══════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} [${result.category}] ${result.message}`);

    if (result.details) {
      console.log(`   Details: ${result.details}`);
    }

    if (result.passed) passed++;
    else failed++;
  }

  console.log('\n═══════════════════════════════════════════');
  console.log(`Total: ${passed + failed} | ✅ ${passed} | ❌ ${failed}`);
  console.log('═══════════════════════════════════════════\n');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

main();
