/**
 * Migration Script for publish_jobs table
 * Run SQL migration to Supabase
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse connection from SUPABASE_URL
const supabaseUrl = process.env.SUPABASE_URL || '';
const urlMatch = supabaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(\w+)/);

if (!urlMatch) {
  console.error('❌ Could not parse SUPABASE_URL');
  process.exit(1);
}

const [, user, password, host, port, database] = urlMatch;

const config = {
  host,
  port: parseInt(port, 10),
  database,
  user,
  password: decodeURIComponent(password),
  ssl: { rejectUnauthorized: false },
};

console.log('🔄 Connecting to Supabase...');

const client = new pg.Client(config);

async function runMigrations() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase\n');

    // Migration 1: Create trigger function
    console.log('📄 Creating trigger function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    console.log('  ✅ Trigger function created\n');

    // Migration 2: Create table
    console.log('📄 Creating publish_jobs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.publish_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES affiliate_products(id) ON DELETE CASCADE,
        content_id UUID NOT NULL REFERENCES affiliate_contents(id) ON DELETE CASCADE,
        channel TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        scheduled_at TIMESTAMPTZ NULL,
        ready_at TIMESTAMPTZ NULL,
        published_at TIMESTAMPTZ NULL,
        priority INTEGER NOT NULL DEFAULT 0,
        payload JSONB NOT NULL DEFAULT '{}',
        error_message TEXT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        idempotency_key TEXT UNIQUE NULL,
        source_metadata JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('  ✅ Table created\n');

    // Migration 3: Create indexes
    console.log('📄 Creating indexes...');

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_publish_jobs_channel ON public.publish_jobs(channel)',
      'CREATE INDEX IF NOT EXISTS idx_publish_jobs_status ON public.publish_jobs(status)',
      'CREATE INDEX IF NOT EXISTS idx_publish_jobs_scheduled_at ON public.publish_jobs(scheduled_at ASC) WHERE scheduled_at IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_publish_jobs_ready_at ON public.publish_jobs(ready_at ASC) WHERE ready_at IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_publish_jobs_created_at ON public.publish_jobs(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_publish_jobs_channel_status_scheduled ON public.publish_jobs(channel, status, scheduled_at ASC) WHERE status IN (\'pending\', \'scheduled\', \'ready\')',
      'CREATE INDEX IF NOT EXISTS idx_publish_jobs_idempotency_key ON public.publish_jobs(idempotency_key) WHERE idempotency_key IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_publish_jobs_product_id ON public.publish_jobs(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_publish_jobs_content_id ON public.publish_jobs(content_id)',
    ];

    for (const idx of indexes) {
      try {
        await client.query(idx);
        console.log(`  ✅ ${idx.split(' ')[2]}`);
      } catch (err) {
        const error = err as Error;
        if (!error.message.includes('already exists')) {
          console.log(`  ⚠️ ${error.message.substring(0, 50)}`);
        }
      }
    }
    console.log();

    // Migration 4: Create trigger
    console.log('📄 Creating trigger...');
    try {
      await client.query(`
        CREATE TRIGGER update_publish_jobs_updated_at
        BEFORE UPDATE ON public.publish_jobs
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
      `);
      console.log('  ✅ Trigger created\n');
    } catch (err) {
      const error = err as Error;
      if (!error.message.includes('already exists')) {
        console.log(`  ⚠️ ${error.message.substring(0, 80)}`);
      }
    }

    // Migration 5: RLS
    console.log('📄 Setting up Row Level Security...');
    await client.query(`ALTER TABLE public.publish_jobs ENABLE ROW LEVEL SECURITY`);
    await client.query(`
      CREATE POLICY "Service role full access publish_jobs" ON public.publish_jobs
      FOR ALL TO service_role USING (true) WITH CHECK (true)
    `);
    console.log('  ✅ RLS enabled\n');

    // Migration 6: Comments
    console.log('📄 Adding comments...');
    await client.query(`COMMENT ON TABLE public.publish_jobs IS 'Stores scheduled publish jobs for multi-channel content distribution'`);
    await client.query(`COMMENT ON COLUMN public.publish_jobs.channel IS 'Target channel: tiktok, facebook, website, etc.'`);
    await client.query(`COMMENT ON COLUMN public.publish_jobs.status IS 'Job status: pending, scheduled, ready, publishing, published, failed, cancelled'`);
    await client.query(`COMMENT ON COLUMN public.publish_jobs.payload IS 'Channel-specific content payload for publishing'`);
    await client.query(`COMMENT ON COLUMN public.publish_jobs.idempotency_key IS 'Unique key to prevent duplicate jobs'`);
    await client.query(`COMMENT ON COLUMN public.publish_jobs.source_metadata IS 'Metadata about source product and content'`);
    console.log('  ✅ Comments added\n');

    // Verify table
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'publish_jobs'
    `);

    if (result.rows.length > 0) {
      console.log('✅ ✅ ✅ Table publish_jobs created successfully!');

      // Show table structure
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'publish_jobs'
        ORDER BY ordinal_position
      `);

      console.log('\n📋 Table structure:');
      columns.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const def = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`   ${col.column_name}: ${col.data_type} ${nullable}${def}`);
      });

      // Show indexes
      const indexes = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'publish_jobs'
      `);

      console.log('\n🔍 Indexes:');
      indexes.rows.forEach(idx => {
        console.log(`   - ${idx.indexname}`);
      });
    } else {
      console.log('\n❌ Table not found');
    }

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
