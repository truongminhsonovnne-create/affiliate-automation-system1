/**
 * Migration Script for publisher runner tracking
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

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

const client = new pg.Client(config);

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase\n');

    // Migration 1: Add columns to publish_jobs
    console.log('📄 Adding columns to publish_jobs...');

    const columnsToAdd = [
      'ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ NULL',
      'ADD COLUMN IF NOT EXISTS claimed_by TEXT NULL',
      'ADD COLUMN IF NOT EXISTS lock_expires_at TIMESTAMPTZ NULL',
      'ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ NULL',
      'ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ NULL',
      'ADD COLUMN IF NOT EXISTS published_url TEXT NULL',
      'ADD COLUMN IF NOT EXISTS external_post_id TEXT NULL',
      'ADD COLUMN IF NOT EXISTS execution_metadata JSONB NULL DEFAULT \'{}\'',
    ];

    for (const col of columnsToAdd) {
      try {
        await client.query(`ALTER TABLE public.publish_jobs ${col}`);
        console.log(`  ✅ ${col}`);
      } catch (err) {
        const error = err as Error;
        if (!error.message.includes('already exists')) {
          console.log(`  ⚠️ ${error.message.substring(0, 60)}`);
        }
      }
    }

    // Migration 2: Create indexes
    console.log('\n📄 Creating indexes...');

    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_publish_jobs_claimable ON public.publish_jobs(channel, status, scheduled_at ASC) WHERE status IN ('pending', 'scheduled', 'ready') AND (claimed_at IS NULL OR lock_expires_at < NOW())`,
      `CREATE INDEX IF NOT EXISTS idx_publish_jobs_retry_eligible ON public.publish_jobs(channel, next_retry_at ASC) WHERE status = 'failed' AND next_retry_at IS NOT NULL AND next_retry_at <= NOW()`,
      `CREATE INDEX IF NOT EXISTS idx_publish_jobs_stale_claims ON public.publish_jobs(claimed_at ASC) WHERE claimed_at IS NOT NULL AND lock_expires_at < NOW()`,
    ];

    for (const idx of indexes) {
      try {
        await client.query(idx);
        console.log(`  ✅ ${idx.split(' ')[2]}`);
      } catch (err) {
        const error = err as Error;
        if (!error.message.includes('already exists')) {
          console.log(`  ⚠️ ${error.message.substring(0, 60)}`);
        }
      }
    }

    // Migration 3: Create publish_job_attempts table
    console.log('\n📄 Creating publish_job_attempts table...');

    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.publish_job_attempts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          publish_job_id UUID NOT NULL REFERENCES publish_jobs(id) ON DELETE CASCADE,
          attempt_number INTEGER NOT NULL,
          channel TEXT NOT NULL,
          status TEXT NOT NULL,
          started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          finished_at TIMESTAMPTZ NULL,
          duration_ms INTEGER NULL,
          error_message TEXT NULL,
          error_code TEXT NULL,
          error_category TEXT NULL,
          response_metadata JSONB NULL DEFAULT '{}',
          published_url TEXT NULL,
          external_post_id TEXT NULL,
          worker_identity TEXT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      console.log('  ✅ Table created');
    } catch (err) {
      const error = err as Error;
      console.log(`  ⚠️ ${error.message.substring(0, 80)}`);
    }

    // Indexes for attempts
    console.log('\n📄 Creating attempt indexes...');

    const attemptIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_publish_job_attempts_job_id ON public.publish_job_attempts(publish_job_id)',
      'CREATE INDEX IF NOT EXISTS idx_publish_job_attempts_status ON public.publish_job_attempts(status)',
      'CREATE INDEX IF NOT EXISTS idx_publish_job_attempts_latest ON public.publish_job_attempts(publish_job_id, attempt_number DESC)',
    ];

    for (const idx of attemptIndexes) {
      try {
        await client.query(idx);
        console.log(`  ✅ ${idx.split(' ')[2]}`);
      } catch (err) {
        const error = err as Error;
        if (!error.message.includes('already exists')) {
          console.log(`  ⚠️ ${error.message.substring(0, 60)}`);
        }
      }
    }

    // RLS for attempts
    console.log('\n📄 Setting up RLS...');

    try {
      await client.query(`ALTER TABLE public.publish_job_attempts ENABLE ROW LEVEL SECURITY`);
      await client.query(`
        CREATE POLICY "Service role full access publish_job_attempts" ON public.publish_job_attempts
        FOR ALL TO service_role USING (true) WITH CHECK (true)
      `);
      console.log('  ✅ RLS enabled');
    } catch (err) {
      const error = err as Error;
      console.log(`  ⚠️ ${error.message.substring(0, 60)}`);
    }

    // Verify tables
    console.log('\n📋 Verifying tables...');
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'publish%'
      ORDER BY table_name
    `);

    console.log('\n✅ Tables:');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    console.log('\n🎉 Migration completed!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
