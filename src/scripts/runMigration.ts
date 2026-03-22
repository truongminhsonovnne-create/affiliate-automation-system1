/**
 * Migration Script
 * Run SQL migration to Supabase
 *
 * SECURITY: All credentials come from environment variables — never hardcoded.
 * Run: npx tsx src/scripts/runMigration.ts
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Required env vars ───────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD; // Direct DB password from Supabase dashboard

if (!SUPABASE_URL) {
  console.error('❌ Missing SUPABASE_URL environment variable.');
  console.error('   Set it to your Supabase project URL (e.g. https://xxx.supabase.co)');
  process.exit(1);
}

if (!SUPABASE_DB_PASSWORD) {
  console.error('❌ Missing SUPABASE_DB_PASSWORD environment variable.');
  console.error('   Set it to your Supabase database password (from Supabase Dashboard → Settings → Database).');
  console.error('   NOTE: This is the direct DB password, NOT the service role key.');
  process.exit(1);
}

// Extract host from SUPABASE_URL (e.g. https://xxx.supabase.co → db.xxx.supabase.co)
const hostMatch = SUPABASE_URL.match(/https?:\/\/([^.]+)/);
if (!hostMatch) {
  console.error('❌ Invalid SUPABASE_URL format.');
  process.exit(1);
}
const projectRef = hostMatch[1];
const dbHost = `db.${projectRef}.supabase.co`;

// Supabase connection config — all values from env
const config: pg.ClientConfig = {
  host: dbHost,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
};

async function runMigration() {
  console.log('🔄 Connecting to Supabase...');

  const client = new pg.Client(config);

  try {
    await client.connect();
    console.log('✅ Connected to Supabase');

    // Read migration file
    const migrationPath = join(__dirname, '../../migrations/001_create_affiliate_products.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('🔄 Running migration...');

    // Split by semicolon and run each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await client.query(statement);
        console.log('  ✅ Statement executed');
      } catch (err) {
        // Ignore some errors (like if index already exists)
        const error = err as Error;
        if (!error.message.includes('already exists')) {
          console.log('  ⚠️ Statement warning:', error.message.substring(0, 100));
        }
      }
    }

    console.log('✅ Migration completed!');

    // Verify table
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'affiliate_products'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Table affiliate_products created successfully!');
    } else {
      console.log('❌ Table not found');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
