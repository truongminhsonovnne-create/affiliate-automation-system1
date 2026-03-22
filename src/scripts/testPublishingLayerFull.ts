/**
 * Full Test Publishing Layer - Test all channels
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

// Mock repositories
const mockPublishJobRepo = {
  async findEquivalentPendingOrScheduledJob(productId: string, contentId: string, channel: string) {
    const result = await client.query(
      `SELECT * FROM publish_jobs
       WHERE product_id = $1 AND content_id = $2 AND channel = $3
       AND status IN ('pending', 'scheduled', 'ready')
       ORDER BY created_at DESC LIMIT 1`,
      [productId, contentId, channel]
    );
    return result.rows[0] || null;
  },
  async insertPublishJob(data: any) {
    const result = await client.query(
      `INSERT INTO publish_jobs (product_id, content_id, channel, status, scheduled_at, priority, payload, idempotency_key, source_metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.product_id,
        data.content_id,
        data.channel,
        data.status,
        data.scheduled_at,
        data.priority,
        JSON.stringify(data.payload),
        data.idempotency_key,
        JSON.stringify(data.source_metadata)
      ]
    );
    return result.rows[0] || null;
  }
};

async function main() {
  console.log('🧪 Full Publishing Layer Test...\n');

  await client.connect();

  // Get test product
  const productResult = await client.query(`
    SELECT p.*, c.id as content_id, c.rewritten_title, c.social_caption, c.review_content,
           c.hashtags, c.confidence_score, c.recommendation
    FROM affiliate_products p
    LEFT JOIN affiliate_contents c ON c.product_id = p.id
    ORDER BY p.created_at DESC
    LIMIT 1
  `);

  if (productResult.rows.length === 0) {
    console.log('❌ No products found');
    await client.end();
    return;
  }

  const product = productResult.rows[0];

  console.log(`📦 Testing with product: ${product.title}`);
  console.log(`   Content ID: ${product.content_id}`);
  console.log(`   Confidence: ${product.confidence_score}\n`);

  // Import modules
  const { evaluatePublishEligibility } = await import('../publishing/eligibility.js');
  const { buildPublishPayload } = await import('../publishing/payloadBuilder.js');
  const { schedulePublishJob } = await import('../publishing/scheduler.js');
  const { persistPublishJob, mapPreparedPayloadToPublishJobRecord } = await import('../publishing/persistence.js');

  // Test all channels
  const channels = ['tiktok', 'facebook', 'website'] as const;
  const productWithContent = { product, content: product };

  // 1. Eligibility
  console.log('🎯 Step 1: Eligibility Evaluation');
  const eligibilityResult = await evaluatePublishEligibility(
    productWithContent as any,
    channels,
    {},
    mockPublishJobRepo as any
  );

  console.log(`   Overall: ${eligibilityResult.overallEligible ? '✅' : '❌'}`);
  console.log(`   Eligible: ${eligibilityResult.eligibleChannels.join(', ')}\n`);

  // 2. Build payloads
  console.log('📝 Step 2: Payload Building');
  const payloads: any[] = [];

  for (const channel of channels) {
    if (!eligibilityResult.eligibleChannels.includes(channel)) {
      console.log(`   ${channel}: ⏭️ Skipped (not eligible)`);
      continue;
    }

    const result = buildPublishPayload(productWithContent as any, channel);

    if (result.success && result.payload) {
      console.log(`   ${channel}: ✅ Built`);
      console.log(`     - Title: ${('title' in result.payload ? result.payload.title : 'N/A')?.substring(0, 40) || 'N/A'}...`);
      console.log(`     - Caption length: ${result.payload.caption?.length || result.payload.body?.length || 0}`);
      console.log(`     - Hashtags: ${result.payload.hashtags?.length || 0}`);
      payloads.push({ channel, payload: result.payload });
    } else {
      console.log(`   ${channel}: ❌ Failed - ${result.error}`);
    }
  }

  // 3. Schedule & Persist
  console.log('\n⏰ Step 3: Scheduling & Persistence');

  for (const { channel, payload } of payloads) {
    // Schedule
    const scheduleResult = schedulePublishJob(payload, { mode: 'slot_based' });

    // Map to job record
    const jobInput = mapPreparedPayloadToPublishJobRecord(payload, {
      status: scheduleResult.scheduledAt ? 'scheduled' : 'pending',
      scheduledAt: scheduleResult.scheduledAt,
      priority: scheduleResult.priority
    });

    // Persist
    const persistResult = await persistPublishJob(jobInput, {}, mockPublishJobRepo as any);

    console.log(`   ${channel}:`);
    console.log(`     - Scheduled: ${scheduleResult.scheduled ? '✅' : '❌'} (${scheduleResult.mode})`);
    console.log(`     - At: ${scheduleResult.scheduledAt?.toISOString() || 'immediate'}`);
    console.log(`     - Priority: ${scheduleResult.priority}`);
    console.log(`     - Persisted: ${persistResult.success ? '✅' : '❌'} (${persistResult.action})`);
  }

  // 4. Show all jobs
  console.log('\n📋 All Publish Jobs:');
  const jobsResult = await client.query(`
    SELECT id, channel, status, scheduled_at, priority, created_at
    FROM publish_jobs
    ORDER BY created_at DESC
  `);

  console.log(`   Total: ${jobsResult.rows.length} jobs\n`);

  for (const job of jobsResult.rows) {
    const statusIcon = {
      'pending': '⏳',
      'scheduled': '📅',
      'ready': '✅',
      'publishing': '📤',
      'published': '🎉',
      'failed': '❌',
      'cancelled': '🚫'
    }[job.status] || '❓';

    console.log(`   ${statusIcon} ${job.channel.padEnd(10)} | ${job.status.padEnd(12)} | ${job.scheduled_at ? new Date(job.scheduled_at).toLocaleString() : 'immediate'.padEnd(20)} | P${job.priority}`);
  }

  // Show job payloads
  console.log('\n📄 Sample Payload (TikTok):');
  const tiktokJob = jobsResult.rows.find(j => j.channel === 'tiktok');
  if (tiktokJob) {
    const payloadResult = await client.query(
      'SELECT payload FROM publish_jobs WHERE id = $1',
      [tiktokJob.id]
    );
    if (payloadResult.rows.length > 0) {
      const payload = payloadResult.rows[0].payload;
      console.log(`   Channel: ${payload.channel}`);
      console.log(`   Title: ${payload.title?.substring(0, 50)}...`);
      console.log(`   Caption: ${payload.caption?.substring(0, 80)}...`);
      console.log(`   Hashtags: ${payload.hashtags?.join(', ')}`);
    }
  }

  console.log('\n✅ Full Publishing Layer Test Completed!');

  await client.end();
}

main().catch(console.error);
