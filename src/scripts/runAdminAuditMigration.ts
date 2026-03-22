/**
 * Run Admin Audit Migration
 *
 * Creates admin_action_logs table for auditing admin operations.
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const urlMatch = supabaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(\w+)/);

if (!urlMatch) {
  console.error('❌ Could not parse SUPABASE_URL');
  process.exit(1);
}

const [, user, password, host, port, database] = urlMatch;

const client = new pg.Client({
  host,
  port: parseInt(port, 10),
  database,
  user,
  password: decodeURIComponent(password),
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase\n');

    // Create table
    console.log('📄 Creating admin_action_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.admin_action_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_id TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        actor_email TEXT,
        action_type TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        request_payload JSONB,
        result_status TEXT NOT NULL,
        result_summary TEXT,
        result_error_code TEXT,
        correlation_id TEXT,
        source_ip TEXT,
        user_agent TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('  ✅ Table created');

    // Create indexes
    console.log('\n📄 Creating indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_admin_action_logs_action_type ON public.admin_action_logs(action_type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_admin_action_logs_target_type ON public.admin_action_logs(target_type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_admin_action_logs_target_id ON public.admin_action_logs(target_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_admin_action_logs_actor_id ON public.admin_action_logs(actor_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created_at ON public.admin_action_logs(created_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_admin_action_logs_correlation_id ON public.admin_action_logs(correlation_id)`);
    console.log('  ✅ Indexes created');

    // Verify
    console.log('\n📋 Verifying tables...');
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'admin_action_logs'
    `);

    if (result.rows.length > 0) {
      console.log('\n✅ Migration completed!');
      console.log(`   - admin_action_logs table ready`);
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
