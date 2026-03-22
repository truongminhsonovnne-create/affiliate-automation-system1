/**
 * Security Layer - Session Storage Policy
 * Policy for crawler persistent profile and sensitive local artifacts
 */

import type { SecurityCheckResult } from '../types';
import { RESTRICTED_STORAGE_PATHS } from '../constants';

// =============================================================================
// CONFIG
// =============================================================================

/** Storage policy configuration */
export interface StoragePolicyConfig {
  /** Base directory for storage */
  baseDir: string;

  /** Whether storage is ephemeral */
  ephemeral?: boolean;

  /** Maximum storage size in MB */
  maxSizeMB?: number;

  /** Cleanup policy */
  cleanupPolicy?: 'on_shutdown' | 'periodic' | 'manual';
}

/** Default crawler session storage policy */
export const DEFAULT_CRAWLER_STORAGE_POLICY: StoragePolicyConfig = {
  baseDir: './sessions',
  ephemeral: false,
  maxSizeMB: 1024, // 1GB
  cleanupPolicy: 'periodic',
};

// =============================================================================
// PATH VALIDATION
// =============================================================================

/**
 * Validate a sensitive storage path
 */
export function validateSensitiveStoragePath(
  path: string,
  options?: {
    allowedDirs?: string[];
    baseDir?: string;
  }
): SecurityCheckResult {
  const baseDir = options?.baseDir ?? './sessions';

  // Check for path traversal
  if (path.includes('..')) {
    return {
      passed: false,
      reason: 'Path traversal detected',
    };
  }

  // Check for absolute paths
  if (path.startsWith('/')) {
    return {
      passed: false,
      reason: 'Absolute paths are not allowed',
    };
  }

  // Check for restricted paths
  const normalizedPath = path.toLowerCase();
  for (const restricted of RESTRICTED_STORAGE_PATHS) {
    if (normalizedPath.includes(restricted)) {
      return {
        passed: false,
        reason: `Path contains restricted segment: ${restricted}`,
      };
    }
  }

  // Check allowed directories
  if (options?.allowedDirs && options.allowedDirs.length > 0) {
    let allowed = false;
    for (const dir of options.allowedDirs) {
      if (path.startsWith(dir)) {
        allowed = true;
        break;
      }
    }
    if (!allowed) {
      return {
        passed: false,
        reason: 'Path not in allowed directories',
      };
    }
  }

  return { passed: true };
}

/**
 * Get crawler session storage policy
 */
export function getCrawlerSessionStoragePolicy(
  options?: Partial<StoragePolicyConfig>
): StoragePolicyConfig {
  return {
    ...DEFAULT_CRAWLER_STORAGE_POLICY,
    ...options,
  };
}

// =============================================================================
// GITIGNORE
// =============================================================================

/**
 * Check if a path should be ignored in git
 */
export function shouldIgnorePathInGit(path: string): boolean {
  const gitignorePatterns = [
    '*.log',
    'npm-debug.log*',
    'yarn-debug.log*',
    'yarn-error.log*',
    '.env',
    '.env.local',
    '.env.*.local',
    '*.pem',
    'key.pem',
    'credentials.json',
    'service-account.json',
    '.DS_Store',
    'Thumbs.db',
    'sessions',
    '*.session',
    '.cache',
    'dist',
    'node_modules',
  ];

  const normalizedPath = path.toLowerCase();

  for (const pattern of gitignorePatterns) {
    // Simple pattern matching
    if (pattern.startsWith('*.')) {
      const ext = pattern.substring(1);
      if (normalizedPath.endsWith(ext)) {
        return true;
      }
    }

    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      if (regex.test(normalizedPath)) {
        return true;
      }
    }

    if (normalizedPath.includes(pattern)) {
      return true;
    }
  }

  return false;
}

// =============================================================================
// PERMISSION
// =============================================================================

/**
 * Should restrict path permissions
 */
export function shouldRestrictPathPermissions(
  path: string,
  options?: {
    isWindows?: boolean;
  }
): SecurityCheckResult {
  const isWindows = options?.isWindows ?? process.platform === 'win32';

  // Paths containing sensitive data should be restricted
  const sensitivePatterns = [
    'sessions',
    'credentials',
    'keys',
    'secrets',
    '.env',
  ];

  const normalizedPath = path.toLowerCase();

  for (const pattern of sensitivePatterns) {
    if (normalizedPath.includes(pattern)) {
      return {
        passed: true,
        warnings: [
          `Path contains sensitive data (${pattern}). ` +
          `Ensure file permissions are restricted to owner only.`,
        ],
      };
    }
  }

  return { passed: true };
}

// =============================================================================
// CLEANUP POLICY
// =============================================================================

/**
 * Get cleanup policy for storage type
 */
export function getStorageCleanupPolicy(
  storageType: 'crawler_session' | 'temp' | 'cache' | 'logs'
): {
  policy: 'on_shutdown' | 'periodic' | 'manual';
  intervalHours?: number;
  maxAgeDays?: number;
} {
  switch (storageType) {
    case 'crawler_session':
      return {
        policy: 'periodic',
        intervalHours: 24,
        maxAgeDays: 7,
      };
    case 'temp':
      return {
        policy: 'on_shutdown',
      };
    case 'cache':
      return {
        policy: 'periodic',
        intervalHours: 6,
        maxAgeDays: 1,
      };
    case 'logs':
      return {
        policy: 'periodic',
        intervalHours: 24,
        maxAgeDays: 30,
      };
    default:
      return {
        policy: 'manual',
      };
  }
}

// =============================================================================
// ENCRYPTION
// =============================================================================

/**
 * Check if storage should be encrypted
 */
export function shouldEncryptStorage(
  path: string
): {
  encrypt: boolean;
  algorithm?: string;
} {
  const sensitivePatterns = [
    'credentials',
    'keys',
    'secrets',
    'tokens',
    'profiles',
  ];

  const normalizedPath = path.toLowerCase();

  for (const pattern of sensitivePatterns) {
    if (normalizedPath.includes(pattern)) {
      return {
        encrypt: true,
        algorithm: 'AES-256-GCM',
      };
    }
  }

  return { encrypt: false };
}
