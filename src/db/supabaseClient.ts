/**
 * Supabase Client Module
 *
 * Backend/Server-side Supabase client initialization
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

// ============================================
// Helper Functions
// ============================================

/**
 * Extract HTTP URL from PostgreSQL connection string
 * Format: postgresql://user:pass@host:port/database
 */
function extractHttpUrl(pgUrl: string): string {
  // If already HTTP URL, return as-is
  if (pgUrl.startsWith('http://') || pgUrl.startsWith('https://')) {
    return pgUrl;
  }

  // Parse PostgreSQL URL
  const match = pgUrl.match(/postgresql:\/\/[^@]+@([^:]+):(\d+)\/(\w+)/);
  if (match) {
    const [, host] = match;
    // Supabase HTTP URL format
    return `https://${host}`;
  }

  return pgUrl;
}

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

    // Extract HTTP URL from PostgreSQL connection string
    const httpUrl = extractHttpUrl(env.SUPABASE_URL);

    supabaseClient = createClient(httpUrl, env.SUPABASE_SERVICE_ROLE_KEY, {
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

// Default export - get the client instance
// This allows: import supabase from '../../db/supabaseClient.js'
// Then: supabase.from('table')
const supabase = getSupabaseClient();
export default supabase;
