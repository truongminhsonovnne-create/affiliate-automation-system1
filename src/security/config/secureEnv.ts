/**
 * Security Layer - Secure Environment Configuration
 * Reads and validates environment variables with strict security policies
 */

import { z } from 'zod';
import type { ConfigSensitivity, SecurityConfig } from '../types';
import {
  CONFIG_SENSITIVITY,
  DEFAULT_SECURITY_CONFIG,
} from '../constants';

// =============================================================================
// SCHEMAS
// =============================================================================

/** Schema for public-safe config */
const publicConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'local']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
});

/** Schema for server-only config */
const serverOnlyConfigSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Internal Auth
  INTERNAL_AUTH_SECRET: z.string().min(32).optional(),

  // Session
  SESSION_SECRET: z.string().min(32).optional(),
});

/** Schema for high-sensitivity secrets */
const highSensitivityConfigSchema = z.object({
  // AI Services
  GEMINI_API_KEY: z.string().min(1).optional(),

  // External Services
  SHOPEE_API_KEY: z.string().min(1).optional(),
  LAZADA_API_KEY: z.string().min(1).optional(),
  TIKI_API_KEY: z.string().min(1).optional(),

  // Publishing
  FACEBOOK_ACCESS_TOKEN: z.string().min(1).optional(),
  TIKTOK_ACCESS_TOKEN: z.string().min(1).optional(),

  // Admin
  ADMIN_INVITE_TOKEN: z.string().min(1).optional(),
});

// =============================================================================
// STATE
// =============================================================================

let configCache: {
  public: z.infer<typeof publicConfigSchema> | null;
  serverOnly: z.infer<typeof serverOnlyConfigSchema> | null;
  highSensitivity: z.infer<typeof highSensitivityConfigSchema> | null;
} = {
  public: null,
  serverOnly: null,
  highSensitivity: null,
};

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate environment configuration
 */
function validateEnv(): void {
  const env = process.env;
  const nodeEnv = env.NODE_ENV || 'development';

  // Validate public config
  try {
    configCache.public = publicConfigSchema.parse(env);
  } catch (error) {
    throw new Error(`Public config validation failed: ${error}`);
  }

  // Validate server-only config
  try {
    configCache.serverOnly = serverOnlyConfigSchema.parse(env);
  } catch (error) {
    if (nodeEnv === 'production') {
      throw new Error(`Server-only config validation failed: ${error}`);
    }
    // In non-production, allow missing optional secrets with warning
    console.warn(`[Security] Missing server-only config in ${nodeEnv}: ${error}`);
    configCache.serverOnly = serverOnlyConfigSchema.partial().parse(env);
  }

  // Validate high-sensitivity config
  try {
    configCache.highSensitivity = highSensitivityConfigSchema.parse(env);
  } catch (error) {
    if (nodeEnv === 'production') {
      throw new Error(`High-sensitivity config validation failed: ${error}`);
    }
    console.warn(`[Security] Missing high-sensitivity config in ${nodeEnv}: ${error}`);
    configCache.highSensitivity = highSensitivityConfigSchema.partial().parse(env);
  }
}

/**
 * Load secure environment configuration
 * Call this once at application startup
 */
export function loadSecureEnv(): void {
  validateEnv();
}

/**
 * Get public-safe configuration
 * Can be safely used in client-side code
 */
export function getPublicSafeConfig(): z.infer<typeof publicConfigSchema> {
  if (!configCache.public) {
    loadSecureEnv();
  }
  return configCache.public!;
}

/**
 * Get server-only configuration
 * MUST only be used in server-side code
 */
export function getServerOnlyConfig(): z.infer<typeof serverOnlyConfigSchema> {
  if (!configCache.serverOnly) {
    loadSecureEnv();
  }
  return configCache.serverOnly!;
}

/**
 * Get a specific server-only secret by name
 */
export function getServerOnlySecret(name: keyof z.infer<typeof serverOnlyConfigSchema>): string | undefined {
  const config = getServerOnlyConfig();
  return config[name];
}

/**
 * Get high-sensitivity configuration
 * MUST only be used in server-side code with strict access controls
 */
export function getHighSensitivityConfig(): z.infer<typeof highSensitivityConfigSchema> {
  if (!configCache.highSensitivity) {
    loadSecureEnv();
  }
  return configCache.highSensitivity!;
}

/**
 * Get a specific high-sensitivity secret by name
 */
export function getHighSensitivitySecret(name: keyof z.infer<typeof highSensitivityConfigSchema>): string | undefined {
  const config = getHighSensitivityConfig();
  return config[name];
}

// =============================================================================
// SERVER RUNTIME ASSERTIONS
// =============================================================================

/** Check if we're in a server environment */
function isServerEnvironment(): boolean {
  return typeof window === 'undefined';
}

/**
 * Assert that code is running in server environment
 * Throws if called from client-side
 */
export function assertServerRuntimeForSecretAccess(): void {
  if (!isServerEnvironment()) {
    throw new Error(
      '[Security] Attempted to access server-only secrets from client environment. ' +
      'This is a security violation.'
    );
  }
}

/**
 * Get configuration by sensitivity level
 */
export function getConfigBySensitivity(sensitivity: ConfigSensitivity): unknown {
  assertServerRuntimeForSecretAccess();

  switch (sensitivity) {
    case CONFIG_SENSITIVITY.PUBLIC:
      return getPublicSafeConfig();
    case CONFIG_SENSITIVITY.SERVER_ONLY:
      return getServerOnlyConfig();
    case CONFIG_SENSITIVITY.HIGH_SENSITIVITY:
      return getHighSensitivityConfig();
    default:
      throw new Error(`Unknown sensitivity level: ${sensitivity}`);
  }
}

// =============================================================================
// MASKING
// =============================================================================

import {
  DEFAULT_MASK_CHARACTER,
  SECRET_MIN_LENGTH_FOR_MASKING,
  SECRET_SHOW_FIRST_COUNT,
  SECRET_SHOW_LAST_COUNT,
} from '../constants';

/**
 * Mask a secret value for logging
 */
export function maskSecretForLogs(
  value: string | undefined | null,
  options?: {
    preserveLength?: boolean;
    maskCharacter?: string;
    showFirst?: number;
    showLast?: number;
  }
): string {
  if (!value) return '[REDACTED]';

  const preserveLength = options?.preserveLength ?? false;
  const maskChar = options?.maskCharacter ?? DEFAULT_MASK_CHARACTER;
  const showFirst = options?.showFirst ?? SECRET_SHOW_FIRST_COUNT;
  const showLast = options?.showLast ?? SECRET_SHOW_LAST_COUNT;

  if (value.length < SECRET_MIN_LENGTH_FOR_MASKING) {
    return maskChar.repeat(preserveLength ? value.length : 8);
  }

  const first = value.substring(0, showFirst);
  const last = value.substring(value.length - showLast);
  const middleLength = value.length - showFirst - showLast;
  const middle = maskChar.repeat(Math.min(middleLength, preserveLength ? middleLength : 8));

  return `${first}${middle}${last}`;
}

/**
 * Check if a value looks like a secret
 */
export function looksLikeSecret(value: string): boolean {
  const secretPatterns = [
    /^[A-Za-z0-9_-]{20,}$/, // Long alphanumeric (token-like)
    /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, // JWT
    /^sk-[A-Za-z0-9]{20,}$/, // OpenAI-style key
    /^SG\.[A-Za-z0-9_-]{22,}\.[A-Za-z0-9_-]{27,}$/, // SendGrid
  ];

  return secretPatterns.some((pattern) => pattern.test(value));
}

// =============================================================================
// SECURITY CONFIG
// =============================================================================

/**
 * Get security configuration for current environment
 */
export function getSecurityConfig(): SecurityConfig {
  const env = getPublicSafeConfig();
  const nodeEnv = env.NODE_ENV || 'development';

  return DEFAULT_SECURITY_CONFIG[nodeEnv] ?? DEFAULT_SECURITY_CONFIG.development;
}

/**
 * Get session TTL in minutes for current environment
 */
export function getSessionTTLMinutes(): number {
  return getSecurityConfig().sessionTTLMinutes;
}

/**
 * Get token TTL in minutes for current environment
 */
export function getTokenTTLMinutes(): number {
  return getSecurityConfig().tokenTTLMinutes;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  const env = getPublicSafeConfig();
  return env.NODE_ENV === 'production';
}

/**
 * Check if running in restricted environment
 */
export function isRestrictedEnvironment(): boolean {
  return isProduction();
}
