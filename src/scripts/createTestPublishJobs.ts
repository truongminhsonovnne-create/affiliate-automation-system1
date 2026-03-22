/**
 * Create Test Publish Jobs
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
  console.log('📦 Creating test publish jobs...\n');

  await client.connect();

  // Get a product with content
  const productResult = await client.query(`
    SELECT p.id as product_id, c.id as content_id
    FROM affiliate_products p
    LEFT JOIN affiliate_contents c ON c.product_id = p.id
    WHERE c.id IS NOT NULL
    LIMIT 1
  `);

  if (productResult.rows.length === 0) {
    console.log('❌ No products with content found');
    await client.end();
    return;
  }

  const { product_id, content_id } = productResult.rows[0];
  console.log(`   Using product: ${product_id}`);

  // Create test jobs
  const testJobs = [
    {
      channel: 'tiktok',
      status: 'ready',
      priority: 10,
      payload: {
        title: 'iPhone 15 Pro Max Review',
        caption: '🔥 Amazing iPhone 15 Pro Max - Best phone ever! Camera 48MP, A17 Pro chip. Check it out! 📱',
        hashtags: ['iphone15', 'apple', 'smartphone', 'tech', 'review'],
        productUrl: 'https://shopee.vn/test-product',
        productTitle: 'iPhone 15 Pro Max',
      },
    },
    {
      channel: 'facebook',
      status: 'ready',
      priority: 5,
      payload: {
        caption: '📱 iPhone 15 Pro Max - Siêu phẩm flagship của Apple! Camera 48MP, chip A17 Pro mạnh mẽ, thiết kế titan sang trọng. Xem ngay!',
        hashtags: ['iphone', 'apple', 'smartphone', 'deals'],
        productUrl: 'https://shopee.vn/test-product',
        productTitle: 'iPhone 15 Pro Max',
      },
    },
    {
      channel: 'website',
      status: 'ready',
      priority: 3,
      payload: {
        title: 'iPhone 15 Pro Max - Đánh giá chi tiết 2024',
        body: 'iPhone 15 Pro Max là chiếc flagship đỉnh cao nhất của Apple với nhiều cải tiến vượt trội. Thiết kế khung titan nhẹ hơn, bền hơn. Camera chính 48MP cho chất lượng ảnh tuyệt vời. Chip A17 Pro mang đến hiệu năng mạnh mẽ nhất từ trước đến nay.',
        summary: 'iPhone 15 Pro Max - Flagship đỉnh cao với camera 48MP và chip A17 Pro',
        keywords: ['iphone', 'apple', 'smartphone', 'điện thoại'],
        productUrl: 'https://shopee.vn/test-product',
        productTitle: 'iPhone 15 Pro Max',
      },
    },
  ];

  for (const job of testJobs) {
    await client.query(`
      INSERT INTO publish_jobs (
        product_id, content_id, channel, status, priority, payload
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [product_id, content_id, job.channel, job.status, job.priority, JSON.stringify(job.payload)]);

    console.log(`   ✅ Created job for ${job.channel} (${job.status})`);
  }

  // Verify
  const verifyResult = await client.query(`
    SELECT channel, status, priority
    FROM publish_jobs
    ORDER BY created_at DESC
    LIMIT 10
  `);

  console.log('\n📋 Current Jobs:');
  for (const job of verifyResult.rows) {
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

  console.log('\n✅ Test jobs created!');

  await client.end();
}

main().catch(console.error);
