/**
 * Environment Configuration Module
 * Validates and exports environment variables for Affiliate Automation System
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Environment variables schema with validation
 */
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

  // ============================================
  // Supabase Configuration (Required)
  // ============================================
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // ============================================
  // Optional Configuration
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

/**
 * TypeScript type inferred from schema
 */
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Singleton instance - parsed and validated environment
 */
let envInstance: EnvConfig | null = null;

/**
 * Get validated environment config
 * Throws clear error if validation fails
 */
export function getEnv(): EnvConfig {
  if (envInstance) {
    return envInstance;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formattedErrors = formatValidationErrors(result.error);

    console.error('\n❌ ENVIRONMENT VALIDATION FAILED\n');
    console.error('='.repeat(50));
    console.error('Missing or invalid environment variables:\n');
    console.error(formattedErrors);
    console.error('='.repeat(50));
    console.error('\n📝 Please check your .env file and restart the application.\n');

    throw new Error(`Environment validation failed: ${formattedErrors}`);
  }

  envInstance = result.data;
  return envInstance;
}

/**
 * Format Zod validation errors into readable output
 */
function formatValidationErrors(error: z.ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join('.');
    if (issue.code === 'invalid_type') {
      return `  • ${path}: ${issue.message}`;
    }
    return `  • ${path}: ${issue.message}`;
  });

  return issues.join('\n');
}

/**
 * Validate a specific env var exists
 */
export function requireEnv(key: keyof EnvConfig): string {
  const env = getEnv();
  const value = env[key];

  if (!value || (typeof value === 'string' && value.trim() === '')) {
    throw new Error(`Required environment variable ${key} is not set`);
  }

  return value;
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

/**
 * Get browser config derived from env
 */
export function getBrowserConfig() {
  const env = getEnv();

  return {
    userDataDir: env.SHOPEE_USER_DATA_DIR,
    headless: env.BROWSER_HEADLESS,
    timeout: env.BROWSER_TIMEOUT,
    maxRetries: env.CRAWLER_MAX_RETRIES,
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
 * Export validated env object (singleton)
 */
export const env = getEnv();

export default env;
