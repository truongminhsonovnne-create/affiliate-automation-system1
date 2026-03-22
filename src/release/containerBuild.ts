/**
 * Container Build Module
 *
 * Manages container image building and publishing.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import type {
  ContainerBuildResult,
  ContainerBuildOptions,
  CiEnvironment,
} from './types';
import { DEFAULT_REGISTRY } from './constants';

const execAsync = promisify(exec);

// =============================================================================
// Role Mapping
// =============================================================================

/** Map runtime roles to Dockerfiles */
const ROLE_DOCKERFILE_MAP: Record<string, string> = {
  web: 'Dockerfile.web',
  'control-plane': 'Dockerfile.control-plane',
  worker: 'Dockerfile.worker',
  'worker-crawler': 'Dockerfile.worker',
  'worker-ai': 'Dockerfile.worker',
  'worker-publisher': 'Dockerfile.worker',
  'ops-runner': 'Dockerfile.worker',
};

/** Map runtime roles to image tags */
const ROLE_TAG_MAP: Record<string, string> = {
  web: 'web',
  'control-plane': 'control-plane',
  worker: 'worker',
  'worker-crawler': 'worker',
  'worker-ai': 'worker',
  'worker-publisher': 'worker',
  'ops-runner': 'worker',
};

// =============================================================================
// Container Build Functions
// =============================================================================

/**
 * Build release images for all roles
 */
export async function buildReleaseImages(
  options?: Partial<ContainerBuildOptions>
): Promise<ContainerBuildResult[]> {
  const roles = options?.roles || ['web', 'control-plane', 'worker'];
  const version = options?.version || 'latest';
  const commitSha = options?.commitSha || 'unknown';
  const registry = options?.registry || DEFAULT_REGISTRY;

  const results: ContainerBuildResult[] = [];

  for (const role of roles) {
    const result = await buildRoleImage(role, version, commitSha, registry);
    results.push(result);
  }

  return results;
}

/**
 * Build image for a specific role
 */
async function buildRoleImage(
  role: string,
  version: string,
  commitSha: string,
  registry: string
): Promise<ContainerBuildResult> {
  const dockerfile = ROLE_DOCKERFILE_MAP[role] || 'Dockerfile.web';
  const tagSuffix = ROLE_TAG_MAP[role] || role;
  const imageTag = `${registry}/affiliate:${tagSuffix}-${version}`;

  const start = Date.now();

  try {
    // Check if Dockerfile exists
    await fs.access(dockerfile);

    // Build the image
    const buildCmd = [
      'docker build',
      `-f ${dockerfile}`,
      '--target runner',
      `-t ${imageTag}`,
      '--build-arg NODE_ENV=production',
      `--build-arg BUILD_VERSION=${version}`,
      `--build-arg BUILD_SHA=${commitSha}`,
      '.',
    ].join(' ');

    await execAsync(buildCmd, { timeout: 300000 });

    return {
      role,
      dockerfile,
      success: true,
      imageTag,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      role,
      dockerfile,
      success: false,
      imageTag,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Build failed',
    };
  }
}

/**
 * Validate built images
 */
export async function validateBuiltImages(
  results: ContainerBuildResult[]
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const result of results) {
    if (!result.success) {
      errors.push(`${result.role}: ${result.error}`);
      continue;
    }

    // Verify image exists
    try {
      await execAsync(`docker image inspect ${result.imageTag}`);
    } catch {
      errors.push(`${result.role}: Image not found after build`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Publish release images to registry
 */
export async function publishReleaseImages(
  results: ContainerBuildResult[],
  options?: { registry?: string; push?: boolean }
): Promise<ContainerBuildResult[]> {
  const registry = options?.registry || DEFAULT_REGISTRY;
  const push = options?.push ?? true;

  const published: ContainerBuildResult[] = [];

  for (const result of results) {
    if (!result.success) {
      published.push(result);
      continue;
    }

    // Tag for registry
    const registryTag = result.imageTag.replace(/^[^/]+\//, `${registry}/`);

    try {
      await execAsync(`docker tag ${result.imageTag} ${registryTag}`);

      if (push) {
        await execAsync(`docker push ${registryTag}`, { timeout: 300000 });
      }

      published.push({
        ...result,
        imageTag: registryTag,
      });
    } catch (error) {
      published.push({
        ...result,
        success: false,
        error: error instanceof Error ? error.message : 'Publish failed',
      });
    }
  }

  return published;
}

/**
 * Build container artifact summary
 */
export function buildContainerArtifactSummary(
  results: ContainerBuildResult[]
): {
  total: number;
  successful: number;
  failed: number;
  artifacts: Array<{ role: string; tag: string; success: boolean }>;
} {
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    total: results.length,
    successful,
    failed,
    artifacts: results.map((r) => ({
      role: r.role,
      tag: r.imageTag,
      success: r.success,
    })),
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get Dockerfile for role
 */
export function getDockerfileForRole(role: string): string {
  return ROLE_DOCKERFILE_MAP[role] || 'Dockerfile.web';
}

/**
 * Get image tag for role
 */
export function getImageTagForRole(
  role: string,
  version: string,
  registry?: string
): string {
  const tagSuffix = ROLE_TAG_MAP[role] || role;
  const reg = registry || DEFAULT_REGISTRY;
  return `${reg}/affiliate:${tagSuffix}-${version}`;
}
