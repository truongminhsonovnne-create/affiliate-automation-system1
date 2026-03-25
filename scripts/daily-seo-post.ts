import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ============================================================
// CẤU HÌNH
// ============================================================
const CONFIG = {
  articlesPerDay: parseInt(process.env.ARTICLES_PER_DAY || "2"),
  deleteAfterDays: parseInt(process.env.DELETE_AFTER_DAYS || "30"),
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY!,
  aihordeApiKey: process.env.AIHORDE_API_KEY || "0000000000",
  supabaseStorageUrl: process.env.SUPABASE_URL!,
};

// ============================================================
// PROMPTS SEO
// ============================================================
const PROMPTS = [
  {
    prompt: `
Bạn là chuyên gia SEO Việt Nam. Dựa vào dữ liệu deals bên dưới, viết bài SEO hoàn chỉnh.

## YÊU CẦU:
- Tiêu đề dưới 60 ký tự, có từ khóa chính
- Meta description dưới 160 ký tự, hấp dẫn
- Nội dung 800-1200 từ, viết tự nhiên
- Có H2, H3, bullet points
- Có danh sách mã giảm giá
- Kết thúc bằng CTA
- VIẾT BẰNG TIẾNG VIỆT TỰ NHIÊN

## Định dạng trả về JSON:
{
  "title": "Tiêu đề bài viết",
  "meta_description": "Mô tả meta",
  "slug": "duong-dan-url",
  "content": "Nội dung HTML đầy đủ",
  "keywords": ["kw1", "kw2"],
  "category": "voucher",
  "featured_image_prompt": "Mô tả ngắn gọn cho ảnh cover (TIẾNG ANH, 1-2 câu, style vibrant colorful blog cover)"
}

## Dữ liệu deals:
{DEALS_DATA}

CHỈ TRẢ VỀ JSON, không giải thích.
`
  },
  {
    prompt: `
Bạn là chuyên gia SEO Việt Nam. Viết bài so sánh/hướng dẫn dựa trên deals.

## YÊU CẦU:
- Tiêu đề dưới 60 ký tự
- Meta description dưới 160 ký tự
- Nội dung 800-1200 từ
- Cấu trúc: Giới thiệu → So sánh → Hướng dẫn → Kết luận
- Có bullet points, CTA cuối bài
- VIẾT BẰNG TIẾNG VIỆT TỰ NHIÊN

## Định dạng trả về JSON:
{
  "title": "Tiêu đề bài viết",
  "meta_description": "Mô tả meta",
  "slug": "duong-dan-url",
  "content": "Nội dung HTML đầy đủ",
  "keywords": ["kw1", "kw2"],
  "category": "review",
  "featured_image_prompt": "Mô tả ngắn gọn cho ảnh cover (TIẾNG ANH, 1-2 câu, style vibrant colorful blog cover)"
}

## Dữ liệu deals:
{DEALS_DATA}

CHỈ TRẢ VỀ JSON, không giải thích.
`
  }
];

// ============================================================
// 1. FETCH DEALS TỪ ACCESSTRADE
// ============================================================
async function fetchAccessTradeDeals(): Promise<any[]> {
  const apiKey = process.env.ACCESSTRADE_API_KEY;

  if (!apiKey) {
    console.log("⚠️  ACCESSTRADE_API_KEY not set, dùng mock data...");
    return getMockDeals();
  }

  try {
    const response = await fetch(
      "https://api.accesstrade.vn/v1/deals?status=active&limit=50",
      {
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) return getMockDeals();

    const data = await response.json();
    console.log(`✅ Fetched ${data.data?.length || 0} deals from AccessTrade`);
    return data.data || [];
  } catch {
    return getMockDeals();
  }
}

function getMockDeals() {
  return [
    { name: "Giảm 50% Lazada Friday", merchant: "Lazada", discount: "50%", code: "LAZADA50", expires: "2026-03-31" },
    { name: "Freeship Shopee 0đ", merchant: "Shopee", discount: "Freeship", code: "FREESHIP0", expires: "2026-03-31" },
    { name: "Mã 30% Tiki Tháng 3", merchant: "Tiki", discount: "30%", code: "TIKI30", expires: "2026-04-15" },
    { name: "Giảm 100k cho đơn 500k", merchant: "Lazada", discount: "100k", code: "LAZADA100", expires: "2026-03-31" },
    { name: "Sale 70% Điện thoại", merchant: "Shopee", discount: "70%", code: "PHONE70", expires: "2026-04-01" },
  ];
}

// ============================================================
// 2. GROQ AI VIẾT BÀI SEO
// ============================================================
async function generateSEOArticle(deals: any[], promptIndex: number): Promise<any | null> {
  const template = PROMPTS[promptIndex].prompt;
  const dealsText = JSON.stringify(deals, null, 2);
  const prompt = template.replace("{DEALS_DATA}", dealsText);

  console.log(`🤖 Groq AI đang viết bài #${promptIndex + 1}...`);

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 4096,
    });

    const response = chatCompletion.choices[0]?.message?.content || "";
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error("❌ Không parse được JSON từ Groq");
      return null;
    }

    const article = JSON.parse(jsonMatch[0]);
    const timestamp = Date.now();
    article.slug = `${article.slug}-${timestamp}`;
    article.articleIndex = promptIndex + 1;

    console.log(`✅ Hoàn thành bài: "${article.title}"`);
    return article;
  } catch (error) {
    console.error("❌ Lỗi Groq AI:", error);
    return null;
  }
}

// ============================================================
// 3. AI HORDE TẠO ẢNH COVER
// ============================================================
async function generateCoverImage(imagePrompt: string, articleSlug: string): Promise<string | null> {
  console.log(`🎨 AI Horde đang tạo ảnh: "${imagePrompt}"`);

  const hordeEndpoint = "https://aihorde.net/api/v2";

  try {
    // Submit request
    const submitResponse = await fetch(`${hordeEndpoint}/generate/async`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": CONFIG.aihordeApiKey,
      },
      body: JSON.stringify({
        prompt: imagePrompt,
        params: {
          sampler_name: "k_euler",
          steps: 25,
          width: 1024,
          height: 576,
          cfg_scale: 7.5,
          seed_variation: 1,
        },
        models: ["Flux1.1"],
        nsfw: false,
        trusted_workers: false,
      }),
    });

    if (!submitResponse.ok) {
      const err = await submitResponse.text();
      console.error("❌ AI Horde submit error:", err);
      return null;
    }

    const submitData = await submitResponse.json();
    const requestId = submitData.id;
    console.log(`⏳ Request ID: ${requestId}, đang chờ...`);

    // Poll cho đến khi xong
    let imageBase64: string | null = null;
    let retries = 0;
    const maxRetries = 60;

    while (retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      retries++;

      const statusResponse = await fetch(
        `${hordeEndpoint}/generate/status/${requestId}`,
        {
          headers: {
            "apikey": CONFIG.aihordeApiKey,
          },
        }
      );

      if (!statusResponse.ok) {
        console.log(`⏳ Đang chờ... (${retries}/${maxRetries})`);
        continue;
      }

      const statusData = await statusResponse.json();
      const state = statusData.state;

      console.log(`⏳ State: ${state} (${retries}/${maxRetries})`);

      if (state === "completed") {
        const generations = statusData.generations;
        if (generations && generations.length > 0) {
          imageBase64 = generations[0].img;
        }
        break;
      } else if (state === "failed" || state === "cancelled") {
        console.error(`❌ Generation ${state}`);
        break;
      }
    }

    if (imageBase64) {
      console.log(`✅ Ảnh đã tạo (${imageBase64.length} chars base64)`);
      return `data:image/png;base64,${imageBase64}`;
    } else {
      console.log(`⚠️  Timeout hoặc lỗi (retried ${retries} lần)`);
      return null;
    }
  } catch (error) {
    console.error("❌ Lỗi AI Horde:", error);
    return null;
  }
}

// ============================================================
// 4. UPLOAD ẢNH LÊN SUPABASE STORAGE
// ============================================================
async function uploadImageToSupabase(imageData: string, articleSlug: string): Promise<string | null> {
  console.log(`📤 Đang upload ảnh lên Supabase Storage...`);

  try {
    const base64Match = imageData.match(/^data:(.+);base64,(.+)$/);
    if (!base64Match) {
      console.error("❌ Invalid base64 image format");
      return null;
    }

    const mimeType = base64Match[1];
    const base64Data = base64Match[2];
    const imageBuffer = Buffer.from(base64Data, "base64");

    const fileName = `${articleSlug}.png`;
    const filePath = `covers/${fileName}`;

    const uploadResponse = await fetch(
      `${CONFIG.supabaseStorageUrl}/storage/v1/object/blog-images/${filePath}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CONFIG.supabaseKey}`,
          "Content-Type": mimeType,
          "x-upsert": "true",
        },
        body: imageBuffer,
      }
    );

    if (!uploadResponse.ok) {
      const err = await uploadResponse.text();
      console.error("❌ Upload failed:", err);
      return null;
    }

    const publicUrl = `${CONFIG.supabaseStorageUrl}/storage/v1/object/public/blog-images/${filePath}`;
    console.log(`✅ Ảnh đã upload: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error("❌ Lỗi upload ảnh:", error);
    return null;
  }
}

// ============================================================
// 5. LƯU BÀI VIẾT VÀO SUPABASE DATABASE
// ============================================================
async function saveArticle(article: any, imageUrl: string | null): Promise<boolean> {
  try {
    const response = await fetch(`${CONFIG.supabaseUrl}/rest/v1/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: CONFIG.supabaseKey,
        Authorization: `Bearer ${CONFIG.supabaseKey}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        title: article.title,
        slug: article.slug,
        content: article.content,
        meta_description: article.meta_description,
        keywords: article.keywords,
        category: article.category,
        featured_image_url: imageUrl,
        featured_image_prompt: article.featured_image_prompt,
        status: "published",
        source: "auto-generated",
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.error("❌ Lỗi lưu bài:", response.status);
      return false;
    }

    const data = await response.json();
    console.log(`💾 Đã lưu bài: "${article.title}" (ID: ${data[0]?.id})`);
    return true;
  } catch (error) {
    console.error("❌ Lỗi Supabase:", error);
    return false;
  }
}

// ============================================================
// 6. XÓA BÀI CŨ HƠN 30 NGÀY
// ============================================================
async function deleteOldArticles(): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CONFIG.deleteAfterDays);
  const cutoffStr = cutoffDate.toISOString();

  console.log(`🗑️ Xóa bài cũ hơn ${CONFIG.deleteAfterDays} ngày...`);

  try {
    const selectResponse = await fetch(
      `${CONFIG.supabaseUrl}/rest/v1/posts?created_at=lt.${cutoffStr}&status=eq.published&source=eq.auto-generated&select=id,slug`,
      {
        headers: {
          apikey: CONFIG.supabaseKey,
          Authorization: `Bearer ${CONFIG.supabaseKey}`,
        },
      }
    );

    if (!selectResponse.ok) return 0;
    const oldArticles = await selectResponse.json();

    if (oldArticles.length === 0) {
      console.log("✅ Không có bài cũ cần xóa");
      return 0;
    }

    // Xóa ảnh cũ
    for (const article of oldArticles) {
      const fileName = `covers/${article.slug}.png`;
      await fetch(
        `${CONFIG.supabaseStorageUrl}/storage/v1/object/blog-images/${fileName}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${CONFIG.supabaseKey}`,
          },
        }
      );
    }

    // Xóa bài viết
    const ids = oldArticles.map((a: any) => a.id).join(",");
    await fetch(
      `${CONFIG.supabaseUrl}/rest/v1/posts?id=in.(${ids})`,
      {
        method: "DELETE",
        headers: {
          apikey: CONFIG.supabaseKey,
          Authorization: `Bearer ${CONFIG.supabaseKey}`,
        },
      }
    );

    console.log(`✅ Đã xóa ${oldArticles.length} bài cũ + ảnh đi kèm`);
    return oldArticles.length;
  } catch (error) {
    console.error("❌ Lỗi xóa bài cũ:", error);
    return 0;
  }
}

// ============================================================
// ĐẾM SỐ BÀI
// ============================================================
async function countArticles(): Promise<number> {
  try {
    const response = await fetch(
      `${CONFIG.supabaseUrl}/rest/v1/posts?status=eq.published&select=id`,
      {
        headers: {
          apikey: CONFIG.supabaseKey,
          Authorization: `Bearer ${CONFIG.supabaseKey}`,
        },
      }
    );
    if (!response.ok) return 0;
    const data = await response.json();
    return data.length;
  } catch {
    return 0;
  }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("🚀 DAILY SEO + AI HORDE IMAGE PIPELINE");
  console.log(`📅 ${new Date().toLocaleString("vi-VN")}`);
  console.log("═══════════════════════════════════════════════════");

  const currentCount = await countArticles();
  console.log(`📊 Bài viết hiện có: ${currentCount}`);

  const deals = await fetchAccessTradeDeals();
  if (deals.length === 0) {
    console.log("❌ Không có deals");
    process.exit(1);
  }

  let successCount = 0;
  const results: { title: string; imageUrl: string | null }[] = [];

  for (let i = 0; i < CONFIG.articlesPerDay; i++) {
    console.log(`\n${"─".repeat(50)}`);
    console.log(`📝 BÀI VIẾT #${i + 1}/${CONFIG.articlesPerDay}`);
    console.log("─".repeat(50));

    // AI viết bài
    const article = await generateSEOArticle(deals, i);
    if (!article) continue;

    // AI Horde tạo ảnh
    let imageUrl: string | null = null;
    if (article.featured_image_prompt) {
      imageUrl = await generateCoverImage(article.featured_image_prompt, article.slug);
    }

    // Upload ảnh lên Supabase
    if (imageUrl) {
      imageUrl = await uploadImageToSupabase(imageUrl, article.slug);
    }

    // Lưu bài
    const saved = await saveArticle(article, imageUrl);
    if (saved) {
      successCount++;
      results.push({ title: article.title, imageUrl });
    }

    // Đợi 20 giây giữa 2 bài
    if (i < CONFIG.articlesPerDay - 1) {
      console.log("⏳ Đợi 20 giây...");
      await new Promise(resolve => setTimeout(resolve, 20000));
    }
  }

  // Xóa bài cũ
  const deletedCount = await deleteOldArticles();
  const finalCount = await countArticles();

  // Tổng kết
  console.log("\n" + "═".repeat(50));
  console.log("📊 BÁO CÁO CUỐI NGÀY");
  console.log("═".repeat(50));
  console.log(`✅ Bài viết mới: ${successCount}/${CONFIG.articlesPerDay}`);
  console.log(`🎨 Ảnh cover: ${results.filter(r => r.imageUrl).length}/${successCount}`);
  console.log(`🗑️  Bài đã xóa: ${deletedCount}`);
  console.log(`📊 Tổng bài: ${finalCount}`);
  console.log("═".repeat(50));

  results.forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.title}`);
    if (r.imageUrl) console.log(`      🖼️  ${r.imageUrl}`);
  });

  console.log("═".repeat(50));

  if (successCount === CONFIG.articlesPerDay) {
    console.log("🎉 HOÀN THÀNH! Chúc bạn ngày mới tốt lành!");
  } else {
    process.exit(1);
  }
}

main();
