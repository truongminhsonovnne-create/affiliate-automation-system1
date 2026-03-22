/**
 * TikTok Shop Reference Pattern Repository
 */

import { getSupabaseClient } from '../../../db/supabaseClient.js';

export class TiktokReferencePatternRepository {
  async findAll() {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('tiktok_shop_reference_patterns')
      .select('*')
      .eq('is_active', true);
    return data || [];
  }

  async findByType(patternType: string) {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('tiktok_shop_reference_patterns')
      .select('*')
      .eq('pattern_type', patternType)
      .eq('is_active', true);
    return data || [];
  }
}

let repo: TiktokReferencePatternRepository | null = null;
export function getTiktokReferencePatternRepository() {
  if (!repo) repo = new TiktokReferencePatternRepository();
  return repo;
}
