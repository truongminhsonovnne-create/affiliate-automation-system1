/**
 * Runtime Layer - Runtime Configuration
 * Loads runtime config based on role and environment
 */

import type { RuntimeRole, RuntimeEnvironment, RuntimeConfigSummary, WorkerConfig } from '../types';
import { resolveRuntimeEnvironment, resolveRuntimeRole } from '../environment';
import { getSecurityConfig } from '../../security/config/secureEnv';
import {
  DEFAULT_PORTS,
  DEFAULT_WORKER_CONCURRENCY,
  QUEUE_POLL_INTERVAL_MS,
  HEARTBEAT_INTERVAL_MS,
  DEFAULT_FEATURE_FLAGS,
  ENVIRONMENT_SAFETY,
  LOG_LEVELS,
  STORAGE_PATHS,
} from '../constants';

// =============================================================================
// CONFIG LOADING
// =============================================================================

/** Runtime configuration */
export interface RuntimeConfig {
  role: RuntimeRole;
  environment: RuntimeEnvironment;
  port: number;
  logLevel: string;
  features: Record<string, boolean>;
  safety: {
    allowMutations: boolean;
    allowMigrations: boolean;
    requireApproval: boolean;
    dryRunDefault: boolean;
  };
  worker?: WorkerConfig;
  storage: {
    sessions: string;
    logs: string;
    temp: string;
  };
}

/**
 * Load runtime configuration
 */
export function loadRuntimeConfig(
  role?: RuntimeRole,
  environment?: RuntimeEnvironment,
  options?: {
    overridePort?: number;
    overrideFeatures?: Record<string, boolean>;
  }
): RuntimeConfig {
  const resolvedRole = role ?? resolveRuntimeRole();
  const resolvedEnvironment = environment ?? resolveRuntimeEnvironment();

  // Get feature flags for environment
  const features = {
    ...DEFAULT_FEATURE_FLAGS[resolvedEnvironment],
    ...options?.overrideFeatures,
  };

  // Get safety settings for environment
  const safety = ENVIRONMENT_SAFETY[resolvedEnvironment];

  // Get log level for environment
  const logLevel = LOG_LEVELS[resolvedEnvironment];

  // Build worker config if role is worker
  let worker: WorkerConfig | undefined;
  if (resolvedRole.startsWith('worker-')) {
    worker = {
      role: resolvedRole as any,
      concurrency: DEFAULT_WORKER_CONCURRENCY[resolvedRole] ?? 1,
      pollInterval: QUEUE_POLL_INTERVAL_MS,
      heartbeatInterval: HEARTBEAT_INTERVAL_MS,
      shutdownTimeout: 30000,
    };
  }

  return {
    role: resolvedRole,
    environment: resolvedEnvironment,
    port: options?.overridePort ?? DEFAULT_PORTS[resolvedRole] ?? 0,
    logLevel,
    features,
    safety,
    worker,
    storage: {
      sessions: STORAGE_PATHS.sessions,
      logs: STORAGE_PATHS.logs,
      temp: STORAGE_PATHS.temp,
    },
  };
}

/**
 * Get role-specific configuration
 */
export function getRoleSpecificConfig(
  role: RuntimeRole,
  options?: {
    environment?: RuntimeEnvironment;
  }
): Record<string, unknown> {
  const environment = options?.environment ?? resolveRuntimeEnvironment();

  const config: Record<string, unknown> = {
    role,
    environment,
  };

  // Role-specific settings
  switch (role) {
    case 'web':
      config.port = DEFAULT_PORTS.web;
      config.type = 'nextjs';
      break;

    case 'control-plane':
      config.port = DEFAULT_PORTS['control-plane'];
      config.type = 'express';
      config.security = getSecurityConfig();
      break;

    case 'worker-crawler':
      config.concurrency = DEFAULT_WORKER_CONCURRENCY['worker-crawler'] ?? 3;
      config.type = 'worker';
      break;

    case 'worker-ai':
      config.concurrency = DEFAULT_WORKER_CONCURRENCY['worker-ai'] ?? 5;
      config.type = 'worker';
      break;

    case 'worker-publisher':
      config.concurrency = DEFAULT_WORKER_CONCURRENCY['worker-publisher'] ?? 10;
      config.type = 'worker';
      break;

    case 'ops-runner':
      config.type = 'scheduler';
      break;
  }

  return config;
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentSpecificConfig(
  environment: RuntimeEnvironment,
  options?: {
    role?: RuntimeRole;
  }
): Record<string, unknown> {
  const role = options?.role ?? resolveRuntimeRole();

  return {
    environment,
    role,
    features: DEFAULT_FEATURE_FLAGS[environment],
    safety: ENVIRONMENT_SAFETY[environment],
    logLevel: LOG_LEVELS[environment],
  };
}

/**
 * Build runtime config summary
 */
export function buildRuntimeConfigSummary(config: RuntimeConfig): RuntimeConfigSummary {
  return {
    role: config.role,
    environment: config.environment,
    version: process.env.APP_VERSION ?? '0.0.0',
    instanceId: process.env.INSTANCE_ID ?? 'unknown',
    features: config.features,
    limits: config.worker
      ? {
          maxConcurrency: config.worker.concurrency,
          timeout: config.worker.shutdownTimeout,
        }
      : undefined,
  };
}

/**
 * Get config for current runtime
 */
export function getCurrentRuntimeConfig(): RuntimeConfig {
  return loadRuntimeConfig();
}
