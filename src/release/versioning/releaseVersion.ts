/**
 * Release Versioning Module
 *
 * Manages release versioning strategy.
 */

import type { CiEnvironment } from '../types';
import { VERSION_PATTERN, RELEASE_TAG_PREFIX } from '../constants';

// =============================================================================
// Version Resolution
// =============================================================================

/**
 * Resolve release version
 */
export function resolveReleaseVersion(options?: {
  environment?: CiEnvironment;
  inputVersion?: string;
  branch?: string;
}): string {
  const { environment = 'development', inputVersion, branch = 'main' } = options || {};

  // Use input version if provided
  if (inputVersion) {
    return inputVersion;
  }

  // Generate based on environment
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 14);

  switch (environment) {
    case 'production':
      throw new Error('Production release requires explicit version');

    case 'staging':
      return `staging-${timestamp}`;

    case 'development':
      return `dev-${timestamp}`;

    case 'local':
      return `local-${timestamp}`;

    default:
      return `dev-${timestamp}`;
  }
}

/**
 * Validate release version
 */
export function validateReleaseVersion(
  version: string,
  options?: {
    strict?: boolean;
    environment?: CiEnvironment;
  }
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const strict = options?.strict ?? (options?.environment === 'production');

  // Check format
  if (!VERSION_PATTERN.test(version)) {
    errors.push(`Version "${version}" does not match semver pattern`);
  }

  // Production requires explicit versions
  if (strict && version.startsWith('dev-')) {
    errors.push('Production releases require explicit version, not dev version');
  }

  if (strict && version.startsWith('local-')) {
    errors.push('Production releases require explicit version, not local version');
  }

  if (strict && version.startsWith('staging-')) {
    errors.push('Production releases require explicit version, not staging version');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Build release metadata
 */
export function buildReleaseMetadata(options?: {
  version?: string;
  commitSha?: string;
  branch?: string;
  environment?: CiEnvironment;
}): {
  version: string;
  commit: string;
  branch: string;
  environment: string;
  timestamp: string;
} {
  const { version = 'dev', commitSha = 'unknown', branch = 'unknown', environment = 'development' } = options || {};

  return {
    version,
    commit: commitSha.slice(0, 7),
    branch,
    environment,
    timestamp: new Date().toISOString(),
  };
}

// =============================================================================
// Version Utilities
// =============================================================================

/**
 * Extract version from git tag
 */
export function extractVersionFromTag(tag: string): string | null {
  if (tag.startsWith(RELEASE_TAG_PREFIX)) {
    return tag.slice(RELEASE_TAG_PREFIX.length);
  }
  return null;
}

/**
 * Create git tag from version
 */
export function createTagFromVersion(version: string): string {
  return `${RELEASE_TAG_PREFIX}${version}`;
}

/**
 * Compare versions
 */
export function compareVersions(a: string, b: string): number {
  const partsA = a.replace(/^[a-z]+-/, '').split('.').map(Number);
  const partsB = b.replace(/^[a-z]+-/, '').split('.').map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const aPart = partsA[i] || 0;
    const bPart = partsB[i] || 0;

    if (aPart > bPart) return 1;
    if (aPart < bPart) return -1;
  }

  return 0;
}

/**
 * Get latest stable version from tags
 */
export async function getLatestStableVersion(): Promise<string | null> {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const { stdout } = await execAsync(
      'git describe --tags --abbrev=0 2>/dev/null',
      { encoding: 'utf8' }
    );

    const tag = stdout.trim();
    return extractVersionFromTag(tag);
  } catch {
    return null;
  }
}
