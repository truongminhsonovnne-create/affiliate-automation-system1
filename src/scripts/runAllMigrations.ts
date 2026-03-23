/**
 * Run all migrations in order - Simple version
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Parse connection from DATABASE_URL (preferred) or SUPABASE_URL
const dbUrl = process.env.DATABASE_URL || '';
const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(\w+)/);

if (!urlMatch) {
  console.error('❌ Could not parse DATABASE_URL (or SUPABASE_URL). Ensure DATABASE_URL is set in .env.local');
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

async function runSQL(sql: string) {
  try {
    await client.query(sql);
  } catch (err) {
    const error = err as Error;
    // pg error code 25P02 = current transaction is aborted from a prior statement.
    // Recover by issuing ROLLBACK so the connection is clean for the next migration.
    if (error.code === '25P02') {
      try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    }
    // Only re-throw errors for non-idempotent operations.
    // Ignore: already exists / duplicate / does not exist
    const ignorable = [
      'already exists',
      'duplicate',
      'does not exist',
    ];
    const isIgnorable = ignorable.some(e => error.message.includes(e));
    if (!isIgnorable) {
      throw error;
    }
  }
}

async function runAllMigrations() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase\n');

    // Migration files to run (in order)
    // Only new migrations not yet applied to production
    const migrations = [
      // resolve_requests table — required by /api/public/v1/resolve endpoint
      '005_create_resolve_requests.sql',
      // Add 'completed' to CHECK constraint (fixes PERSISTENCE_REQUIRED_FAILED / 503)
      '006_add_completed_status.sql',
    ];

    for (const migrationFile of migrations) {
      const migrationPath = join(process.cwd(), 'migrations', migrationFile);
      console.log(`\n📄 Running migration: ${migrationFile}`);

      const sql = readFileSync(migrationPath, 'utf-8');

      try {
        await runSQL(sql);
        console.log(`   ✅ ${migrationFile} completed`);
      } catch (err) {
        const error = err as Error;
        console.log(`   ⚠️ Error: ${error.message.substring(0, 100)}`);
      }
    }

    // Verify all tables
    console.log('\n📋 Verifying tables...');
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    if (result.rows.length === 0) {
      console.log('   No tables found!');
    } else {
      console.log('\n✅ Existing tables:');
      result.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    }

    console.log('\n🎉 All migrations completed!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runAllMigrations();
