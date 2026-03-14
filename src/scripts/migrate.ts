import { getSupabaseClient } from '../db/supabaseClient.js';
import { log } from '../utils/logger.js';

/**
 * Database migration script
 * Creates the affiliate_products table if it doesn't exist
 */
async function migrate() {
  log.info('Starting database migration...');

  const client = getSupabaseClient();

  // Create affiliate_products table
  const { error: createTableError } = await client.rpc('create_affiliate_products_table', {
    table_name: 'affiliate_products',
  }).catch(async () => {
    // If RPC doesn't exist, use direct SQL
    const { error } = await client.from('affiliate_products').select('id').limit(1);
    return { error };
  });

  if (createTableError) {
    log.warn({ error: createTableError }, 'Table may not exist, attempting to create...');

    // Create table using SQL
    const { error: sqlError } = await client.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.affiliate_products (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          external_id VARCHAR(255) NOT NULL,
          platform VARCHAR(50) NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          price DECIMAL(15,2) NOT NULL,
          original_price DECIMAL(15,2),
          currency VARCHAR(10) DEFAULT 'VND',
          images TEXT[] DEFAULT '{}',
          url TEXT NOT NULL,
          rating DECIMAL(3,2),
          review_count INTEGER,
          sold_count INTEGER,
          category VARCHAR(100),
          shop_name VARCHAR(255),
          shop_id VARCHAR(255),
          affiliate_link TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          ai_analysis JSONB,
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(external_id, platform)
        );

        CREATE INDEX IF NOT EXISTS idx_affiliate_products_platform ON public.affiliate_products(platform);
        CREATE INDEX IF NOT EXISTS idx_affiliate_products_status ON public.affiliate_products(status);
        CREATE INDEX IF NOT EXISTS idx_affiliate_products_created_at ON public.affiliate_products(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_affiliate_products_price ON public.affiliate_products(price);
      `,
    });

    if (sqlError) {
      log.error({ error: sqlError }, 'Failed to create table');
      throw sqlError;
    }
  }

  log.info('Database migration completed successfully');
}

// Run migration
migrate().catch((error) => {
  log.error({ error }, 'Migration failed');
  process.exit(1);
});
