/**
 * Secret Exposure Check Script
 * Checks for potential secret exposure risks in codebase
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative, dirname } from 'path';

interface ExposureRisk {
  file: string;
  line?: number;
  type: string;
  severity: 'high' | 'medium' | 'low';
  context: string;
}

const risks: ExposureRisk[] = [];

// =============================================================================
// PATTERNS
// =============================================================================

/** Patterns that indicate potential secret exposure */
const EXPOSURE_PATTERNS = [
  // Hardcoded secrets
  {
    pattern: /(?<![a-zA-Z0-9])(api[_-]?key|secret[_-]?key|access[_-]?token)["']?\s*[:=]\s*["']([^"']{8,})["']/gi,
    type: 'hardcoded_secret',
    severity: 'high',
  },
  // Environment variable without proper access
  {
    pattern: /process\.env\.(SUPABASE_SERVICE_ROLE_KEY|GEMINI_API_KEY|SESSION_SECRET|INTERNAL_AUTH_SECRET)/g,
    type: 'direct_secret_access',
    severity: 'medium',
  },
  // Console logging sensitive data
  {
    pattern: /console\.(log|info|debug)\([^)]*(password|secret|token|key|credential)[^)]*\)/gi,
    type: 'sensitive_log',
    severity: 'medium',
  },
  // Hardcoded connection strings
  {
    pattern: /(mongodb|postgres|mysql):\/\/[^@]+@/gi,
    type: 'hardcoded_connection_string',
    severity: 'high',
  },
  // JWT tokens in code
  {
    pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    type: 'jwt_token',
    severity: 'high',
  },
  // AWS keys
  {
    pattern: /(AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}/g,
    type: 'aws_access_key',
    severity: 'high',
  },
  // Private keys
  {
    pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g,
    type: 'private_key',
    severity: 'high',
  },
];

// =============================================================================
// FILTERS
// =============================================================================

/** Files to skip */
const SKIP_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /\.next/,
  /coverage/,
];

/** File extensions to scan */
const SCAN_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json'];

// =============================================================================
// SCANNER
// =============================================================================

/**
 * Scan a file for exposure risks
 */
function scanFile(filePath: string): void {
  // Skip if in skip pattern
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(filePath)) return;
  }

  // Skip non-scan files
  const ext = filePath.substring(filePath.lastIndexOf('.'));
  if (!SCAN_EXTENSIONS.includes(ext)) return;

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const pattern of EXPOSURE_PATTERNS) {
      let match;
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);

      while ((match = regex.exec(content)) !== null) {
        // Find line number
        const beforeMatch = content.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;

        // Get context
        const line = lines[lineNumber - 1]?.trim() || '';
        const context = line.substring(0, 100);

        risks.push({
          file: relative(process.cwd(), filePath),
          line: lineNumber,
          type: pattern.type,
          severity: pattern.severity,
          context,
        });
      }
    }
  } catch {
    // File not readable
  }
}

/**
 * Scan directory recursively
 */
function scanDirectory(dir: string): void {
  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      // Skip hidden and common ignore directories
      if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist') {
        continue;
      }

      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else {
        scanFile(fullPath);
      }
    }
  } catch {
    // Directory not accessible
  }
}

// =============================================================================
// REPORTER
// =============================================================================

/**
 * Print results
 */
function printResults(): void {
  console.log('\n═══════════════════════════════════════════');
  console.log('        SECRET EXPOSURE CHECK REPORT        ');
  console.log('═══════════════════════════════════════════\n');

  if (risks.length === 0) {
    console.log('✅ No secret exposure risks detected!\n');
    return;
  }

  // Group by severity
  const bySeverity = {
    high: risks.filter((r) => r.severity === 'high'),
    medium: risks.filter((r) => r.severity === 'medium'),
    low: risks.filter((r) => r.severity === 'low'),
  };

  console.log(`Found ${risks.length} potential risk(s):\n`);

  // High severity first
  if (bySeverity.high.length > 0) {
    console.log('🔴 HIGH SEVERITY:');
    for (const risk of bySeverity.high) {
      console.log(`  ${risk.file}:${risk.line}`);
      console.log(`    Type: ${risk.type}`);
      console.log(`    Context: ${risk.context}`);
      console.log();
    }
  }

  if (bySeverity.medium.length > 0) {
    console.log('🟡 MEDIUM SEVERITY:');
    for (const risk of bySeverity.medium) {
      console.log(`  ${risk.file}:${risk.line}`);
      console.log(`    Type: ${risk.type}`);
      console.log(`    Context: ${risk.context}`);
      console.log();
    }
  }

  if (bySeverity.low.length > 0) {
    console.log('🟢 LOW SEVERITY:');
    for (const risk of bySeverity.low) {
      console.log(`  ${risk.file}:${risk.line}`);
      console.log(`    Type: ${risk.type}`);
      console.log(`    Context: ${risk.context}`);
      console.log();
    }
  }

  console.log('═══════════════════════════════════════════');
  console.log(`Total: ${risks.length} risk(s) | 🔴 ${bySeverity.high.length} | 🟡 ${bySeverity.medium.length} | 🟢 ${bySeverity.low.length}`);
  console.log('═══════════════════════════════════════════\n');
}

// =============================================================================
// MAIN
// =============================================================================

function main(): void {
  console.log('🔍 Scanning for secret exposure risks...\n');

  // Scan src directory
  const srcDir = join(process.cwd(), 'src');
  scanDirectory(srcDir);

  // Also check config files
  const configFiles = ['package.json', 'tsconfig.json', 'next.config.js'];
  for (const file of configFiles) {
    try {
      scanFile(join(process.cwd(), file));
    } catch {
      // File not found
    }
  }

  printResults();

  // Exit with error if high severity risks found
  const highSeverity = risks.filter((r) => r.severity === 'high');
  process.exit(highSeverity.length > 0 ? 1 : 0);
}

main();
