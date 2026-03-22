/**
 * Run Observability Migration
 *
 * Creates the observability-related tables in Supabase.
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

    // System Events Table
    console.log('📄 Creating system_events table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.system_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id TEXT UNIQUE,
        category TEXT NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        correlation_id TEXT,
        operation TEXT,
        channel TEXT,
        job_id TEXT,
        worker_id TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('  ✅ Table created');

    // Indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_system_events_category ON public.system_events(category)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_system_events_severity ON public.system_events(severity)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_system_events_created_at ON public.system_events(created_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_system_events_correlation_id ON public.system_events(correlation_id)`);
    console.log('  ✅ Indexes created');

    // Worker Heartbeats Table
    console.log('\n📄 Creating worker_heartbeats table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.worker_heartbeats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        worker_id TEXT UNIQUE NOT NULL,
        worker_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'alive',
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        current_job_id TEXT,
        current_operation TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('  ✅ Table created');

    await client.query(`CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_worker_id ON public.worker_heartbeats(worker_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_status ON public.worker_heartbeats(status)`);
    console.log('  ✅ Indexes created');

    // Dead Letter Jobs Table
    console.log('\n📄 Creating dead_letter_jobs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.dead_letter_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        original_job_id UUID,
        channel TEXT,
        operation TEXT NOT NULL,
        payload JSONB DEFAULT '{}',
        error_code TEXT,
        error_message TEXT NOT NULL,
        error_category TEXT,
        attempt_count INTEGER NOT NULL DEFAULT 1,
        last_attempt_at TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL DEFAULT 'quarantined',
        resolution TEXT,
        resolved_at TIMESTAMPTZ,
        resolved_by TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('  ✅ Table created');

    await client.query(`CREATE INDEX IF NOT EXISTS idx_dead_letter_jobs_status ON public.dead_letter_jobs(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_dead_letter_jobs_original_job_id ON public.dead_letter_jobs(original_job_id)`);
    console.log('  ✅ Indexes created');

    // Verify tables
    console.log('\n📋 Verifying tables...');
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('system_events', 'worker_heartbeats', 'dead_letter_jobs')
      ORDER BY table_name
    `);

    console.log('\n✅ Observability tables:');
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
