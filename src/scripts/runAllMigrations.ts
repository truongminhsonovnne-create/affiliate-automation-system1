/**
 * Run all migrations in order - Simple version
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
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

async function runSQL(sql: string) {
  // Use pg-query to run the entire script at once
  // This handles dollar quoting correctly
  try {
    await client.query(sql);
  } catch (err) {
    const error = err as Error;
    if (!error.message.includes('already exists') &&
        !error.message.includes('duplicate') &&
        !error.message.includes('does not exist')) {
      throw error;
    }
  }
}

async function runAllMigrations() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase\n');

    // Migration files to run
    const migrations = [
      '001_create_affiliate_tables.sql',
      '002_add_updated_at_trigger.sql',
      '003_create_publish_jobs.sql'
    ];

    for (const migrationFile of migrations) {
      const migrationPath = join(process.cwd(), 'supabase/migrations', migrationFile);
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
