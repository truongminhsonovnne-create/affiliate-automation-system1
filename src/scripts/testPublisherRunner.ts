/**
 * Test Publisher Runner
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Parse connection
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

async function main() {
  console.log('🧪 Testing Publisher Runner...\n');

  await client.connect();
  console.log('✅ Connected to Supabase\n');

  // 1. Check for existing jobs
  console.log('📊 Checking existing jobs...');
  const jobsResult = await client.query(`
    SELECT id, channel, status, priority, scheduled_at
    FROM publish_jobs
    ORDER BY created_at DESC
    LIMIT 10
  `);

  console.log(`   Found ${jobsResult.rows.length} jobs`);

  // 2. Create test job if none exists
  if (jobsResult.rows.length === 0) {
    console.log('\n⚠️ No jobs found. Creating test jobs...');

    // Get a product with content
    const productResult = await client.query(`
      SELECT p.id as product_id, c.id as content_id
      FROM affiliate_products p
      LEFT JOIN affiliate_contents c ON c.product_id = p.id
      LIMIT 1
    `);

    if (productResult.rows.length === 0 || !productResult.rows[0].content_id) {
      console.log('❌ No products with content found');
      await client.end();
      return;
    }

    const { product_id, content_id } = productResult.rows[0];

    // Create test jobs
    const channels = ['tiktok', 'facebook', 'website'];
    for (const channel of channels) {
      await client.query(`
        INSERT INTO publish_jobs (product_id, content_id, channel, status, priority, payload)
        VALUES ($1, $2, $3, 'ready', 5, $4)
      `, [
        product_id,
        content_id,
        channel,
        JSON.stringify({
          title: 'Test Product',
          caption: 'Test caption for ' + channel,
          hashtags: ['test', 'affiliate'],
          productUrl: 'https://example.com/product',
        })
      ]);
      console.log(`   Created job for ${channel}`);
    }
  }

  // 3. Check jobs again
  const updatedJobs = await client.query(`
    SELECT id, channel, status, priority, scheduled_at, claimed_at, claimed_by
    FROM publish_jobs
    ORDER BY created_at DESC
    LIMIT 10
  `);

  console.log('\n📋 Current Jobs:');
  for (const job of updatedJobs.rows) {
    const statusIcon = {
      'pending': '⏳',
      'scheduled': '📅',
      'ready': '✅',
      'publishing': '📤',
      'published': '🎉',
      'failed': '❌',
    }[job.status] || '❓';

    console.log(`   ${statusIcon} ${job.channel.padEnd(10)} | ${job.status.padEnd(12)} | P${job.priority}`);
  }

  // 4. Test the runner
  console.log('\n🚀 Testing Publisher Runner...');

  const { runPublisherOnce, createWorkerIdentity } = await import('../publishing/runner/index.js');

  const workerIdentity = createWorkerIdentity({ workerName: 'Test Runner' });

  console.log(`   Worker: ${workerIdentity.workerId}`);

  const result = await runPublisherOnce({
    dryRun: true,
    limit: 5,
    workerIdentity,
  });

  console.log('\n📊 Results:');
  console.log(`   Status: ${result.status}`);
  console.log(`   Selected: ${result.selectedCount}`);
  console.log(`   Claimed: ${result.claimedCount}`);
  console.log(`   Executed: ${result.executedCount}`);
  console.log(`   Published: ${result.publishedCount}`);
  console.log(`   Failed: ${result.failedCount}`);
  console.log(`   Duration: ${result.durationMs}ms`);

  // 5. Check attempts
  const attemptsResult = await client.query(`
    SELECT id, publish_job_id, channel, status, attempt_number
    FROM publish_job_attempts
    ORDER BY created_at DESC
    LIMIT 10
  `);

  console.log('\n📝 Attempt Records:');
  console.log(`   Total: ${attemptsResult.rows.length}`);

  for (const attempt of attemptsResult.rows) {
    const statusIcon = {
      'started': '🔄',
      'completed': '✅',
      'failed': '❌',
      'retry_scheduled': '⏳',
    }[attempt.status] || '❓';

    console.log(`   ${statusIcon} ${attempt.channel} | Attempt ${attempt.attempt_number} | ${attempt.status}`);
  }

  // 6. Show final job states
  const finalJobs = await client.query(`
    SELECT id, channel, status, published_url, external_post_id, last_attempt_at
    FROM publish_jobs
    ORDER BY updated_at DESC
    LIMIT 10
  `);

  console.log('\n📋 Final Job States:');
  for (const job of finalJobs.rows) {
    const statusIcon = {
      'pending': '⏳',
      'scheduled': '📅',
      'ready': '✅',
      'publishing': '📤',
      'published': '🎉',
      'failed': '❌',
      'retry_scheduled': '🔄',
    }[job.status] || '❓';

    console.log(`   ${statusIcon} ${job.channel.padEnd(10)} | ${job.status.padEnd(15)} | ${job.published_url || 'N/A'}`);
  }

  console.log('\n✅ Publisher Runner Test Completed!');

  await client.end();
}

main().catch(console.error);
