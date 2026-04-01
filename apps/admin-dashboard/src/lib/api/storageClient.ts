/**
 * Supabase Storage Client — Browser-Safe Upload
 *
 * Uploads images directly to Supabase Storage bucket from the browser
 * using a public bucket write policy (service_role key stays server-side only).
 *
 * Setup:
 *  1. Supabase Dashboard → Storage → Create bucket "blog-images" (public)
 *  2. Storage Policy: allow authenticated inserts to blog-images bucket
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getPublicSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _client;
}
