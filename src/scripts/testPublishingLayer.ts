/**
 * Test Publishing Layer - Using direct PostgreSQL for loading
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

// Mock repository to use direct PostgreSQL
const mockProductRepo = {
  async findById(id: string) {
    const result = await client.query(
      'SELECT * FROM affiliate_products WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },
  async getLatestProducts(limit: number) {
    const result = await client.query(
      'SELECT * FROM affiliate_products ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }
};

const mockContentRepo = {
  async findLatestByProductId(productId: string) {
    const result = await client.query(
      'SELECT * FROM affiliate_contents WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1',
      [productId]
    );
    return result.rows[0] || null;
  }
};

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
        data.payload,
        data.idempotency_key,
        data.source_metadata
      ]
    );
    return result.rows[0] || null;
  }
};

async function main() {
  console.log('🧪 Testing Publishing Layer...\n');

  await client.connect();
  console.log('✅ Connected to Supabase\n');

  // 1. Check existing products
  console.log('📊 Checking existing products...');
  const productsResult = await client.query(`
    SELECT id, title, platform
    FROM affiliate_products
    ORDER BY created_at DESC
    LIMIT 5
  `);

  console.log(`   Found ${productsResult.rows.length} products`);

  let testProductId: string | null = null;

  if (productsResult.rows.length === 0) {
    console.log('\n⚠️ No products found. Creating test data...');

    // Create test product
    const productResult = await client.query(`
      INSERT INTO affiliate_products (
        title, platform, product_url, image_url, source_type,
        source_keyword, crawled_at, price, shop_name, rating,
        review_count, category
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `, [
      'Test Product - iPhone 15 Pro Max',
      'shopee',
      'https://shopee.vn/test-product-123',
      'https://via.placeholder.com/300',
      'search',
      'iphone',
      new Date().toISOString(),
      29990000,
      'Apple Store Official',
      4.8,
      1500,
      'Electronics'
    ]);

    testProductId = productResult.rows[0].id;

    // Create test content
    await client.query(`
      INSERT INTO affiliate_contents (
        product_id, rewritten_title, social_caption, review_content,
        hashtags, ai_model, prompt_version, confidence_score, recommendation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      testProductId,
      'iPhone 15 Pro Max - Điện thoại flagship đỉnh cao 2024',
      '🔥 iPhone 15 Pro Max - Siêu phẩm flagship của Apple! Camera 48MP, chip A17 Pro mạnh mẽ, thiết kế titan sang trọng. Đặt ngay! 📱',
      'iPhone 15 Pro Max là chiếc flagship đỉnh cao nhất của Apple với nhiều cải tiến vượt trội. Thiết kế khung titan nhẹ hơn, bền hơn. Camera chính 48MP cho chất lượng ảnh tuyệt vời. Chip A17 Pro mang đến hiệu năng mạnh mẽ nhất từ trước đến nay.',
      '{iphone15,apple,smartphone,flagship,tech}',
      'gemini-2.0-flash',
      'v1',
      0.85,
      'highly_recommended'
    ]);

    console.log(`   Created product: ${testProductId}`);
  } else {
    testProductId = productsResult.rows[0].id;
    console.log(`   Using product: ${productsResult.rows[0].title}`);
  }

  // Load product with content manually
  console.log('\n📦 Loading product with content...');
  const product = await mockProductRepo.findById(testProductId!);
  const content = await mockContentRepo.findLatestByProductId(testProductId!);

  console.log(`   Product: ${product.title}`);
  console.log(`   Has content: ${!!content}`);
  if (content) {
    console.log(`   Rewritten title: ${content.rewritten_title?.substring(0, 50)}...`);
    console.log(`   Social caption: ${content.social_caption?.substring(0, 50)}...`);
    console.log(`   Confidence: ${content.confidence_score}`);
  }

  // Test eligibility evaluation
  console.log('\n🎯 Testing eligibility evaluation...');
  const { evaluatePublishEligibility } = await import('../publishing/eligibility.js');

  // Create mock productWithContent
  const productWithContent = { product, content };

  const eligibilityResult = await evaluatePublishEligibility(
    productWithContent as any,
    ['tiktok', 'facebook', 'website'],
    {},
    mockPublishJobRepo as any
  );

  console.log(`   Overall eligible: ${eligibilityResult.overallEligible}`);
  console.log(`   Eligible channels: ${eligibilityResult.eligibleChannels.join(', ')}`);

  for (const check of eligibilityResult.checks) {
    console.log(`   - ${check.channel}: ${check.eligible ? '✅' : '❌'} ${check.reason || ''}`);
    if (check.warnings?.length) {
      check.warnings.forEach(w => console.log(`     ⚠️ ${w}`));
    }
  }

  // Test payload building
  console.log('\n📝 Testing payload building...');
  const { buildPublishPayload } = await import('../publishing/payloadBuilder.js');

  for (const channel of ['tiktok', 'facebook', 'website'] as const) {
    const result = buildPublishPayload(productWithContent as any, channel);
    console.log(`   - ${channel}: ${result.success ? '✅' : '❌'}`);
    if (!result.success) {
      console.log(`     Error: ${result.error}`);
    } else if (result.payload) {
      const p = result.payload;
      console.log(`     Title: ${('title' in p ? p.title : 'body' in p ? (p as any).body?.substring(0, 30) : 'N/A') || 'N/A'}`);
      console.log(`     Hashtags: ${p.hashtags?.length || 0}`);
    }
  }

  // Test scheduling
  console.log('\n⏰ Testing scheduling...');
  const { schedulePublishJob } = await import('../publishing/scheduler.js');

  const testPayload = {
    channel: 'tiktok' as const,
    productId: testProductId!,
    contentId: content?.id || '',
    productUrl: product.product_url,
    productTitle: product.title,
    productImageUrl: product.image_url,
    title: 'Test Title',
    caption: 'Test Caption',
    hashtags: ['test'],
    source: { platform: 'shopee' },
    createdAt: new Date().toISOString()
  };

  const scheduleResult = schedulePublishJob(testPayload, { mode: 'immediate' });
  console.log(`   Scheduled: ${scheduleResult.scheduled}`);
  console.log(`   Mode: ${scheduleResult.mode}`);
  console.log(`   Scheduled at: ${scheduleResult.scheduledAt || 'now'}`);
  console.log(`   Priority: ${scheduleResult.priority}`);

  // Test persistence
  console.log('\n💾 Testing persistence...');
  const { persistPublishJob, mapPreparedPayloadToPublishJobRecord } = await import('../publishing/persistence.js');

  const jobInput = mapPreparedPayloadToPublishJobRecord(testPayload, {
    status: 'scheduled',
    scheduledAt: scheduleResult.scheduledAt,
    priority: scheduleResult.priority
  });

  const persistResult = await persistPublishJob(jobInput, {}, mockPublishJobRepo as any);
  console.log(`   Action: ${persistResult.action}`);
  console.log(`   Job ID: ${persistResult.jobId || 'N/A'}`);
  console.log(`   Success: ${persistResult.success ? '✅' : '❌'}`);

  // Check persisted jobs
  console.log('\n📋 Checking persisted jobs...');
  const jobsResult = await client.query(`
    SELECT id, channel, status, scheduled_at, priority, created_at
    FROM publish_jobs
    ORDER BY created_at DESC
    LIMIT 10
  `);

  console.log(`   Found ${jobsResult.rows.length} jobs`);

  for (const job of jobsResult.rows) {
    console.log(`   - ${job.channel} | ${job.status} | ${job.scheduled_at || 'immediate'} | priority=${job.priority}`);
  }

  console.log('\n✅ Publishing Layer test completed!');

  await client.end();
}

main().catch(console.error);
