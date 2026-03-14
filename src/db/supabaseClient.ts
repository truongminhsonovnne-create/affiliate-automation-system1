/**
 * Supabase Client Module
 *
 * Backend/Server-side Supabase client initialization
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

// ============================================
// Singleton Instance
// ============================================

let supabaseClient: SupabaseClient | null = null;

/**
 * Create and return Supabase client
 * Uses SERVICE_ROLE_KEY for backend operations (bypasses RLS)
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseClient;
}

/**
 * Get Supabase URL
 */
export function getSupabaseUrl(): string {
  return env.SUPABASE_URL;
}

export type { SupabaseClient };
export default getSupabaseClient;
