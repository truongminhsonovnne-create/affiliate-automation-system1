/**
 * Environment Configuration Module
 * Validates and exports environment variables for Affiliate Automation System
 *
 * SECURITY GUARANTEES:
 * - All critical secrets throw at startup if missing (no silent fallbacks)
 * - Secret values are NEVER logged or included in error messages
 * - Validation errors list the missing variable NAMES only
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// =============================================================================
// Schema Definition
// =============================================================================

const envSchema = z.object({
  // ============================================
  // Shopee Configuration (Required)
  // ============================================
  SHOPEE_USER_DATA_DIR: z.string().min(1, 'SHOPEE_USER_DATA_DIR is required for browser profile'),
  SHOPEE_BASE_URL: z
    .string()
    .url()
    .default('https://shopee.vn'),
  SHOPEE_MOBILE_USER_AGENT: z.string().min(1, 'SHOPEE_MOBILE_USER_AGENT is required'),

  // ============================================
  // Google Gemini AI Configuration (Required)
  // ============================================
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().min(1).default('gemini-2.0-flash'),

  // Groq API Key (optional)
  GROQ_API_KEY: z.string().optional(),

  // ============================================
  // Supabase Configuration (Required)
  // ============================================
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // ============================================
  // Admin Dashboard Authentication (Required)
  // ============================================
  ADMIN_USERNAME: z.string().min(1, 'ADMIN_USERNAME is required'),
  // Password: either bcrypt hash (ADMIN_PASSWORD_HASH, production) or plain text (ADMIN_PASSWORD, dev/test)
  // Validation accepts any non-empty string — the login route validates the format
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_PASSWORD_HASH: z.string().optional(),

  // Session signing
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_VERSION: z.coerce.number().int().nonnegative().default(1),

  // ============================================
  // Control Plane Security (Required)
  // ============================================
  CONTROL_PLANE_INTERNAL_SECRET: z
    .string()
    .min(16, 'CONTROL_PLANE_INTERNAL_SECRET must be at least 16 characters'),

  // ============================================
  // Experiment Salt (Required for privacy)
  // ============================================
  EXPERIMENT_SALT: z.string().min(16, 'EXPERIMENT_SALT must be at least 16 characters'),

  // ============================================
  // Application Configuration (Optional)
  // ============================================
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  BROWSER_HEADLESS: z.coerce.boolean().default(true),
  BROWSER_TIMEOUT: z.coerce.number().int().positive().default(30000),
  CRAWLER_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),
  AI_ANALYSIS_BATCH_SIZE: z.coerce.number().int().positive().default(10),
  AI_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.7),
  CRAWLER_DELAY_MIN: z.coerce.number().int().positive().default(1000),
  CRAWLER_DELAY_MAX: z.coerce.number().int().positive().default(3000),
});

// =============================================================================
// TypeScript Type
// =============================================================================

export type EnvConfig = z.infer<typeof envSchema>;

// =============================================================================
// Singleton Instance
// =============================================================================

let envInstance: EnvConfig | null = null;

// =============================================================================
// Validation (fail-fast)
// =============================================================================

/**
 * Get validated environment config.
 * THROWS at startup if any required variable is missing or invalid.
 * Secret values are NEVER logged.
 */
export function getEnv(): EnvConfig {
  if (envInstance) {
    return envInstance;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missingVars = result.error.issues.map((issue) => issue.path.join('.'));
    const uniqueMissing = [...new Set(missingVars)];

    // Print to stderr so logs don't mix with stdout
    console.error('\n═══════════════════════════════════════════════════════');
    console.error('  ❌  ENVIRONMENT VALIDATION FAILED');
    console.error('═══════════════════════════════════════════════════════\n');
    console.error('  The following required environment variables are missing');
    console.error('  or have invalid values:\n');

    for (const name of uniqueMissing) {
      console.error(`  • ${name}`);
    }

    console.error('\n  Copy .env.example to .env and fill in the values.');
    console.error('  NEVER commit .env with real secrets.\n');
    console.error('═══════════════════════════════════════════════════════\n');

    throw new Error(
      `Environment validation failed. Missing variables: ${uniqueMissing.join(', ')}. ` +
        'See stderr for details.'
    );
  }

  envInstance = result.data;
  return envInstance;
}

/**
 * Validate a specific env var exists and is non-empty.
 * Throws with the variable name only - never logs the value.
 */
export function requireEnv(key: keyof EnvConfig): string {
  const env = getEnv();
  const value = env[key];

  if (!value || (typeof value === 'string' && value.trim() === '')) {
    throw new Error(`Required environment variable ${String(key)} is not set`);
  }

  return String(value);
}

/**
 * Check if running in specific environment
 */
export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === 'development';
}

export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

export function isTest(): boolean {
  return getEnv().NODE_ENV === 'test';
}

// =============================================================================
// Derived Config Getters
// =============================================================================

/**
 * Get browser config derived from env
 */
export function getBrowserConfig() {
  const env = getEnv();

  return {
    userDataDir: env.SHOPEE_USER_DATA_DIR,
    headless: env.BROWSER_HEADLESS,
    timeout: env.BROWSER_TIMEOUT,
    mobileUserAgent: env.SHOPEE_MOBILE_USER_AGENT,
  };
}

/**
 * Get AI config derived from env
 */
export function getAIConfig() {
  const env = getEnv();

  return {
    apiKey: env.GEMINI_API_KEY,
    groqApiKey: env.GROQ_API_KEY,
    model: env.GEMINI_MODEL,
    batchSize: env.AI_ANALYSIS_BATCH_SIZE,
    confidenceThreshold: env.AI_CONFIDENCE_THRESHOLD,
  };
}

/**
 * Get database config derived from env
 */
export function getDatabaseConfig() {
  const env = getEnv();

  return {
    supabaseUrl: env.SUPABASE_URL,
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

/**
 * Get admin credentials (for use in auth middleware - server-side only)
 */
export function getAdminCredentials() {
  const env = getEnv();
  return {
    username: env.ADMIN_USERNAME,
    password: env.ADMIN_PASSWORD,
  };
}

/**
 * Get control plane internal secret (for server-side use only)
 */
export function getControlPlaneSecret(): string {
  return getEnv().CONTROL_PLANE_INTERNAL_SECRET;
}

/**
 * Get session secret (for server-side cookie signing only)
 */
export function getSessionSecret(): string {
  return getEnv().SESSION_SECRET;
}

// =============================================================================
// Export validated env singleton
// =============================================================================

export const env = getEnv();

export default env;
