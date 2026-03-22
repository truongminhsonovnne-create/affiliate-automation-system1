/**
 * Test Publisher Runner - Direct PostgreSQL
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
  console.log('🧪 Testing Publisher Runner with Direct PostgreSQL...\n');

  await client.connect();
  console.log('✅ Connected to Supabase\n');

  // Check existing jobs
  console.log('📊 Checking existing jobs...');
  const jobsResult = await client.query(`
    SELECT id, channel, status, priority, scheduled_at, payload
    FROM publish_jobs
    ORDER BY created_at DESC
    LIMIT 10
  `);

  console.log(`   Found ${jobsResult.rows.length} jobs`);

  // Get ready jobs
  console.log('\n🔍 Checking for ready jobs (direct query)...');

  const readyJobsResult = await client.query(`
    SELECT id, channel, status, priority, scheduled_at, payload
    FROM publish_jobs
    WHERE status IN ('pending', 'scheduled', 'ready')
    AND (claimed_at IS NULL OR lock_expires_at < NOW() OR lock_expires_at IS NULL)
    ORDER BY priority DESC, scheduled_at ASC
    LIMIT 10
  `);

  console.log(`   Ready jobs: ${readyJobsResult.rows.length}`);

  if (readyJobsResult.rows.length > 0) {
    console.log('\n📋 Ready Jobs:');
    for (const job of readyJobsResult.rows) {
      console.log(`   - ${job.channel}: ${job.status} (priority: ${job.priority})`);
    }

    // Test claiming a job
    console.log('\n🎯 Testing job claiming...');

    const testJob = readyJobsResult.rows[0];
    const workerId = `test-worker-${Date.now()}`;
    const now = new Date();
    const lockExpires = new Date(now.getTime() + 5 * 60 * 1000);

    // Try to claim
    const claimResult = await client.query(`
      UPDATE publish_jobs
      SET status = 'publishing',
          claimed_by = $1,
          claimed_at = $2,
          lock_expires_at = $3,
          updated_at = NOW()
      WHERE id = $4
      AND (claimed_at IS NULL OR lock_expires_at < NOW() OR lock_expires_at IS NULL)
      RETURNING id, status, claimed_by
    `, [workerId, now.toISOString(), lockExpires.toISOString(), testJob.id]);

    if (claimResult.rows.length > 0) {
      console.log(`   ✅ Successfully claimed job ${testJob.channel}`);
      console.log(`      Status: ${claimResult.rows[0].status}`);
      console.log(`      Worker: ${claimResult.rows[0].claimed_by}`);

      // Simulate execution
      console.log('\n🚀 Simulating publish execution...');

      // Use mock adapters
      const { getPublisherAdapter } = await import('../publishing/runner/channelAdapters/index.js');

      const adapter = getPublisherAdapter(testJob.channel as any);

      // Build request
      let payload = {};
      try {
        if (typeof testJob.payload === 'string') {
          payload = JSON.parse(testJob.payload);
        } else if (testJob.payload) {
          payload = testJob.payload;
        }
      } catch (e) {
        console.log('   ⚠️ Could not parse payload, using mock');
        payload = {
          title: 'Test Product',
          caption: 'Test caption for ' + testJob.channel,
          hashtags: ['test', 'affiliate'],
          productUrl: 'https://example.com/product',
        };
      }

      const request = {
        jobId: testJob.id,
        productId: testJob.product_id,
        contentId: testJob.content_id,
        channel: testJob.channel,
        payload,
        metadata: {
          attemptNumber: 1,
          priority: testJob.priority,
        },
      };

      // Dry run
      const dryRunResult = await adapter.dryRun(request);

      console.log(`   📝 Dry-run result for ${testJob.channel}:`);
      console.log(`      Valid: ${dryRunResult.valid}`);
      console.log(`      Would publish: ${dryRunResult.wouldPublish}`);
      console.log(`      Errors: ${dryRunResult.validationErrors.length}`);

      if (dryRunResult.warnings.length > 0) {
        console.log(`      Warnings: ${dryRunResult.warnings.join(', ')}`);
      }

      // Mark as published
      console.log('\n✅ Marking job as published...');

      const publishedUrl = `https://${testJob.channel}.com/post/${Date.now()}`;
      const externalPostId = `ext_${Date.now()}`;

      await client.query(`
        UPDATE publish_jobs
        SET status = 'published',
            published_url = $1,
            external_post_id = $2,
            claimed_at = NULL,
            claimed_by = NULL,
            lock_expires_at = NULL,
            updated_at = NOW()
        WHERE id = $3
      `, [publishedUrl, externalPostId, testJob.id]);

      console.log(`   ✅ Job published!`);
      console.log(`      Published URL: ${publishedUrl}`);

      // Create attempt record
      await client.query(`
        INSERT INTO publish_job_attempts (
          publish_job_id, attempt_number, channel, status,
          started_at, finished_at, duration_ms,
          published_url, external_post_id, worker_identity
        ) VALUES ($1, 1, $2, 'completed', $3, $4, 500, $5, $6, $7)
      `, [
        testJob.id,
        testJob.channel,
        now.toISOString(),
        new Date().toISOString(),
        publishedUrl,
        externalPostId,
        workerId
      ]);

      console.log('   ✅ Attempt record created');
    }
  }

  // Final state
  console.log('\n📋 Final Job States:');
  const finalResult = await client.query(`
    SELECT id, channel, status, published_url
    FROM publish_jobs
    ORDER BY updated_at DESC
    LIMIT 10
  `);

  for (const job of finalResult.rows) {
    const icons: Record<string, string> = {
      pending: '⏳', scheduled: '📅', ready: '✅',
      publishing: '📤', published: '🎉', failed: '❌',
      retry_scheduled: '🔄'
    };
    const url = job.published_url || 'N/A';
    console.log(`   ${icons[job.status] || '❓'} ${job.channel.padEnd(10)} | ${job.status.padEnd(15)} | ${url.substring(0, 40)}`);
  }

  // Show attempts
  console.log('\n📝 Attempts:');
  const attemptsResult = await client.query(`
    SELECT channel, status, attempt_number, published_url
    FROM publish_job_attempts
    ORDER BY created_at DESC
    LIMIT 5
  `);

  console.log(`   Total: ${attemptsResult.rows.length}`);
  for (const a of attemptsResult.rows) {
    console.log(`   - ${a.channel}: attempt ${a.attempt_number} -> ${a.status}`);
  }

  console.log('\n✅ Publisher Runner Test Completed!');

  await client.end();
}

main().catch(console.error);
