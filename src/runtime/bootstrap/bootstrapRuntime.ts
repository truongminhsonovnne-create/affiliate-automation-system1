/**
 * Runtime Layer - Bootstrap Runtime
 * Top-level runtime bootstrap
 */

import { v4 as uuidv4 } from 'uuid';
import type { RuntimeRole, RuntimeEnvironment, RuntimeBootstrapOptions, RuntimeProcessIdentity, RuntimeLifecycleHooks } from '../types';
import { resolveRuntimeRole, resolveRuntimeEnvironment } from '../environment';
import { loadRuntimeConfig } from '../config/runtimeConfig';
import { registerGracefulShutdownHandlers } from '../shutdown/gracefulShutdown';
import { runRoleDependencyChecks } from './dependencyChecks';

// =============================================================================
// BOOTSTRAP
// =============================================================================

/** Global process identity */
let processIdentity: RuntimeProcessIdentity | null = null;

/**
 * Get process identity
 */
export function getProcessIdentity(): RuntimeProcessIdentity | null {
  return processIdentity;
}

/**
 * Bootstrap result
 */
export interface BootstrapResult {
  success: boolean;
  errors: string[];
  checksPassed: number;
}

/**
 * Bootstrap runtime
 */
export async function bootstrapRuntime(options?: RuntimeBootstrapOptions): Promise<BootstrapResult> {
  const role = options?.role ?? resolveRuntimeRole();
  const environment = options?.environment ?? resolveRuntimeEnvironment();
  const version = options?.version ?? process.env.APP_VERSION ?? '0.0.0';
  const instanceId = options?.instanceId ?? process.env.INSTANCE_ID ?? uuidv4();

  // Create process identity
  processIdentity = {
    instanceId,
    role,
    environment,
    version,
    pid: process.pid,
    hostname: process.env.HOSTNAME ?? 'unknown',
    startedAt: new Date(),
  };

  console.log(`[Bootstrap] Starting runtime: role=${role}, env=${environment}, version=${version}`);

  // Load runtime config
  try {
    loadRuntimeConfig(role, environment);
    console.log('[Bootstrap] Runtime config loaded');
  } catch (error) {
    console.error('[Bootstrap] Config load error:', error);
    return {
      success: false,
      errors: [`Config error: ${error}`],
      checksPassed: 0,
    };
  }

  // Run dependency checks if enabled
  let checksPassed = 0;
  if (options?.waitForDependencies !== false) {
    const dependencyTimeout = options?.dependencyTimeout ?? 15000;
    console.log('[Bootstrap] Running dependency checks...');

    try {
      const dependencyChecks = await runRoleDependencyChecks(role);
      const unhealthy = dependencyChecks.filter((c) => c.status === 'unhealthy');

      if (unhealthy.length > 0) {
        console.error('[Bootstrap] Dependency checks failed:', unhealthy);
        return {
          success: false,
          errors: unhealthy.map(c => `${c.name}: ${c.error}`),
          checksPassed: dependencyChecks.length - unhealthy.length,
        };
      }

      checksPassed = dependencyChecks.length;
      console.log('[Bootstrap] Dependency checks passed');
    } catch (error) {
      console.error('[Bootstrap] Dependency check error:', error);
      return {
        success: false,
        errors: [`Dependency check error: ${error}`],
        checksPassed: 0,
      };
    }
  }

  // Register shutdown handlers
  registerGracefulShutdownHandlers({
    onShutdown: async (reason) => {
      console.log(`[Bootstrap] Shutting down: ${reason}`);
    },
  });

  console.log('[Bootstrap] Runtime bootstrap complete');

  return {
    success: true,
    errors: [],
    checksPassed,
  };
}

/**
 * Bootstrap specific runtime role
 */
export async function bootstrapRuntimeRole(
  role: RuntimeRole,
  options?: Omit<RuntimeBootstrapOptions, 'role'>
): Promise<BootstrapResult> {
  return bootstrapRuntime({ ...options, role });
}

// =============================================================================
// LIFECYCLE HOOKS
// =============================================================================

/** Registered lifecycle hooks */
let lifecycleHooks: RuntimeLifecycleHooks = {};

/**
 * Register runtime lifecycle hooks
 */
export function registerRuntimeLifecycleHooks(hooks: RuntimeLifecycleHooks): void {
  lifecycleHooks = { ...lifecycleHooks, ...hooks };
}

/**
 * Get registered lifecycle hooks
 */
export function getLifecycleHooks(): RuntimeLifecycleHooks {
  return lifecycleHooks;
}
