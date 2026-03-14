/**
 * Supabase Client Module
 *
 * Initializes and manages Supabase connection using
 * service role key for administrative operations.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { log } from '../utils/logger.js';

// ============================================
// Singleton Instance
// ============================================

let supabaseClient: SupabaseClient | null = null;

/**
 * Create and return Supabase client with service role key
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY for admin privileges
 * (bypass RLS policies for bulk operations)
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient && !supabaseClient.auth.getSession().catch(() => null)) {
    // Client exists but may be stale, recreate
    supabaseClient = null;
  }

  if (!supabaseClient) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
    }

    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        // No need to persist session for service role
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          'x-client-info': 'affiliate-automation-system',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        },
      },
      // Increase timeout for bulk operations
      db: {
        schema: 'public',
      },
    });

    log.info({
      supabaseUrl: env.SUPABASE_URL,
      hasServiceKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
    }, 'Supabase client initialized with service role');
  }

  return supabaseClient;
}

/**
 * Test connection to Supabase
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();

    // Simple query to test connection
    const { data, error } = await client
      .from('affiliate_products')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (error) {
      log.warn({ error }, 'Supabase connection test returned error');
      return false;
    }

    log.info('Supabase connection successful');
    return true;
  } catch (error) {
    log.error({ error }, 'Supabase connection test failed');
    return false;
  }
}

/**
 * Test table existence
 */
export async function testTableExists(tableName: string = 'affiliate_products'): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.from(tableName).select('*').limit(1);

    if (error) {
      log.warn({ error, tableName }, 'Table may not exist');
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Close Supabase client (cleanup)
 */
export function closeSupabaseClient(): void {
  supabaseClient = null;
  log.info('Supabase client closed');
}

/**
 * Get Supabase URL from environment
 */
export function getSupabaseUrl(): string {
  return env.SUPABASE_URL;
}

// ============================================
// Export
// ============================================

export type { SupabaseClient };
export default getSupabaseClient;
