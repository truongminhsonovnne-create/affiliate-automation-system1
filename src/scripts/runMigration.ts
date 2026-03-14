/**
 * Migration Script
 * Run SQL migration to Supabase
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase connection config
const config = {
  host: 'db.qenmkvlzxidmgeqviplf.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'hoanglam123',
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
