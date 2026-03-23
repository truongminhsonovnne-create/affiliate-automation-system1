/**
 * Run all resolve_requests migrations in order.
 *
 * Each migration file runs in its own transaction so that a failure in one file
 * does not abort the entire batch. Uses the pg driver's direct SQL interface
 * (no Supabase client needed).
 *
 * Run: npx tsx src/scripts/runAllMigrations.ts
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.DATABASE_URL || '';
const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(\w+)/);

if (!urlMatch) {
  console.error('❌ Could not parse DATABASE_URL. Ensure it is set in .env (or .env.local loaded by your shell).');
  console.error('   Format: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres');
  process.exit(1);
}

const [, user, password, host, port, database] = urlMatch;

const pool = new pg.Pool({
  host,
  port: parseInt(port, 10),
  database,
  user,
  password: decodeURIComponent(password),
  ssl: { rejectUnauthorized: false },
  max: 2,
});

/** Execute a raw SQL file in its own BEGIN/COMMIT (or ROLLBACK on failure). */
async function runMigrationFile(filePath: string): Promise<void> {
  const name = filePath.split(/[/\\]/).pop() ?? filePath;
  const sql = readFileSync(filePath, 'utf-8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`   ✅ ${name} — committed`);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    const error = err as pg.Error;
    const code = error.code ?? '';
    const msg = error.message ?? String(err);

    // Ignorable patterns (idempotent — safe to skip)
    const ignorable = [
      'already exists',
      'duplicate',
      'does not exist',
      'would cause duplicate',
    ];
    const isIgnorable = ignorable.some((e) => msg.includes(e));

    if (isIgnorable) {
      console.log(`   ✅ ${name} — skipped (already applied): ${msg.substring(0, 80)}`);
    } else {
      console.error(`   ❌ ${name} — FAILED [${code}]: ${msg}`);
      throw err;
    }
  } finally {
    client.release();
  }
}

async function verifyTable(tableName: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return result.rows.length > 0;
}

async function runAllMigrations() {
  try {
    // Quick connection check
    await pool.query('SELECT 1');
    console.log('✅ Connected to Supabase\n');

    const migrations = [
      join(process.cwd(), 'migrations', '005_create_resolve_requests.sql'),
      join(process.cwd(), 'migrations', '006_add_completed_status.sql'),
      join(process.cwd(), 'supabase', 'migrations', '027_create_resolve_requests_rls.sql'),
    ];

    for (const filePath of migrations) {
      const name = filePath.split(/[/\\]/).pop() ?? filePath;
      console.log(`\n📄 ${name}`);
      await runMigrationFile(filePath);
    }

    // Verify
    console.log('\n📋 Verifying resolve_requests table...');
    const exists = await verifyTable('resolve_requests');
    if (exists) {
      console.log('✅ resolve_requests table confirmed in database');
    } else {
      console.error('❌ resolve_requests table NOT found — migration may have failed silently');
    }

    console.log('\n🎉 All migrations completed!');
  } catch (error) {
    console.error('\n❌ Migration aborted:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runAllMigrations();
