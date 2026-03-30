import * as dotenv from "dotenv";
import * as path from "path";

// Load .env first (base defaults), then .env.local (real credentials override)
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import Groq from "groq-sdk";
import { jsonrepair as repair } from "jsonrepair";

// Force reload env - support both naming conventions
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const AIHORDE_API_KEY = process.env.AIHORDE_API_KEY || "0000000000";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("FATAL: SUPABASE_URL or SUPABASE_SERVICE_KEY not set!");
  console.error("SUPABASE_URL:", SUPABASE_URL ? "OK" : "MISSING");
  console.error("SUPABASE_SERVICE_KEY:", SUPABASE_SERVICE_KEY ? "OK" : "MISSING");
  console.error("  (Note: env var may be named SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey) {
  console.error("FATAL: GROQ_API_KEY not set!");
  process.exit(1);
}

const groq = new Groq({ apiKey: groqApiKey });

const CONFIG = {
  articlesPerDay: parseInt(process.env.ARTICLES_PER_DAY || "2"),
  deleteAfterDays: parseInt(process.env.DELETE_AFTER_DAYS || "30"),
  supabaseUrl: SUPABASE_URL,
  supabaseKey: SUPABASE_SERVICE_KEY,
  aihordeApiKey: AIHORDE_API_KEY,
  supabaseStorageUrl: SUPABASE_URL,
};

console.log("Config loaded:");
console.log("  Supabase:", CONFIG.supabaseUrl);
console.log("  Supabase Key:", CONFIG.supabaseKey.substring(0, 8) + "...");
console.log("  Groq Key:", groqApiKey.substring(0, 8) + "...");
console.log("  AI Horde:", CONFIG.aihordeApiKey === "0000000000" ? "Anonymous" : "Has key");

// ============================================================
// MOCK DEALS
// ============================================================
const MOCK_DEALS = [
  { name: "Giảm 50% Lazada Friday", merchant: "Lazada", discount: "50%", code: "LAZADA50", expires: "2026-03-31" },
  { name: "Freeship Shopee 0đ", merchant: "Shopee", discount: "Freeship", code: "FREESHIP0", expires: "2026-03-31" },
  { name: "Mã 30% Tiki", merchant: "Tiki", discount: "30%", code: "TIKI30", expires: "2026-04-15" },
  { name: "Giảm 100k Lazada", merchant: "Lazada", discount: "100k", code: "LAZADA100", expires: "2026-03-31" },
  { name: "Sale 70% Điện thoại", merchant: "Shopee", discount: "70%", code: "PHONE70", expires: "2026-04-01" },
  { name: "Giảm 25% Tiki Sách", merchant: "Tiki", discount: "25%", code: "SAH25", expires: "2026-04-10" },
];

// ============================================================
// IMAGE PROMPT SYSTEM — Prompt Engineering cho AI Horde / Flux
// ============================================================
// Nguyên tắc:
// 1. Prompt phải MÔ TẢ CỤ THỂ nội dung bài viết (merchant, deal, context)
// 2. Style phải PHÙ HỢP với category & nội dung
// 3. Gồm: subject + scene + lighting + style + composition + negative
// 4. Dùng tiếng Anh rõ ràng, tránh ambiguous words
// ============================================================

const IMAGE_STYLES: Record<string, {
  base: string;
  negative: string;
  lighting: string;
}> = {
  voucher: {
    base: "flat lay product photography, discount tags, voucher coupons scattered on marble surface, shopping bags, smartphone with shopping apps, credit card",
    negative: "ugly, blurry, low quality, distorted face, watermark, text, logo, brand name, people, cartoon, anime",
    lighting: "bright natural window light, clean white background, soft shadows"
  },
  review: {
    base: "side-by-side product comparison, two shopping carts with wrapped gifts, price tags, rating stars, smooth gradient background",
    negative: "ugly, blurry, low quality, distorted face, watermark, text overlay, logo, cartoon, anime",
    lighting: "studio lighting, gradient backdrop, professional e-commerce style"
  },
  news: {
    base: "breaking news graphic, bold headline text implied in scene, trending shopping scene, viral product viral moment, festive sale atmosphere",
    negative: "ugly, blurry, low quality, watermark, distorted face, cartoon, anime, busy cluttered background",
    lighting: "editorial magazine lighting, dramatic but clean"
  },
  tutorial: {
    base: "step-by-step illustrated guide, phone screen showing mobile app, hand holding phone, how-to shopping tutorial scene, checklist clipboard",
    negative: "ugly, blurry, low quality, watermark, distorted face, cartoon, anime, clutter",
    lighting: "bright flat lay, top-down or 45-degree angle, clean workspace"
  },
};

const MERCHANT_VISUALS: Record<string, string> = {
  shopee: "Shopee orange branding elements, orange shopping bag,虾皮标志颜色",
  lazada: "red and orange Lazada theme, Lazada box delivery, red delivery bag",
  tiki: "Tiki blue theme, Tiki logo blue, blue delivery packaging",
  tiktok: "black and white TikTok shop aesthetic, TikTok phone screen, trending product",
  default: "colorful Southeast Asian e-commerce lifestyle, multiple shopping platforms"
};

function buildImagePrompt(
  articleTitle: string,
  category: string,
  merchants: string[]
): string {
  const style = IMAGE_STYLES[category] ?? IMAGE_STYLES["voucher"];

  // Map merchant names to visual keywords
  const merchantKeywords = merchants
    .map(m => {
      const lower = m.toLowerCase();
      if (lower.includes("shopee")) return MERCHANT_VISUALS["shopee"];
      if (lower.includes("lazada")) return MERCHANT_VISUALS["lazada"];
      if (lower.includes("tiki")) return MERCHANT_VISUALS["tiki"];
      if (lower.includes("tiktok")) return MERCHANT_VISUALS["tiktok"];
      return MERCHANT_VISUALS["default"];
    })
    .filter(Boolean);

  // Extract key topic from title
  const titleKeywords = articleTitle
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(" ")
    .filter(w => w.length > 3)
    .slice(0, 5)
    .join(" ");

  // Build final prompt following Flux SDXL best practices
  // Flux works best with: subject + environment + style + lighting + quality tags
  const parts = [
    // Subject: specific to this article
    `${titleKeywords}, ${merchantKeywords[0] ?? "e-commerce shopping"}`,

    // Action/scene
    "Vietnamese e-commerce lifestyle, shopping online on smartphone, discount promotion",

    // Composition
    "centered composition, clean layout, blog cover dimensions, 512x512 or 1024x1024",

    // Style
    style.base,

    // Quality tags for Flux
    "4k, high quality, sharp focus, professional photography, masterpiece",

    // Lighting
    style.lighting,
  ];

  return parts.join(", ");
}

// ============================================================
// ARTICLE PROMPTS
// ============================================================
const VOUCHER_PROMPT = `Bạn là chuyên gia SEO Việt Nam. Viết bài SEO tổng hợp deals khuyến mãi.

YÊU CẦU:
- Tiêu đề dưới 60 ký tự, có từ khóa chính (chứa tên merchant hoặc deal nổi bật)
- Meta description dưới 160 ký tự, hấp dẫn, có CTA
- Nội dung 800-1200 từ, viết tự nhiên bằng tiếng Việt
- Cấu trúc: H2 tiêu đề chính, H3 phụ, bullet points, danh sách mã giảm giá cụ thể, CTA cuối bài
- Trích xuất DANH SÁCH MÃ từ deals (code + merchant + giá trị) để đưa vào content
- VIẾT BẰNG TIẾNG VIỆT TỰ NHIÊN
- Content viết LIỀN TRÊN 1 DÒNG trong JSON

Định dạng trả về (JSON 1 dòng):
{"title":"Tiêu đề dưới 60 ký tự với keyword chính","meta_description":"Mô tả dưới 160 ký tự","slug":"duong-dan-cho-seo","content":"Nội dung HTML bằng tiếng Việt, viết liền 1 dòng trong JSON","keywords":["kw1","kw2","kw3"],"category":"voucher","merchants":["Merchant1","Merchant2"]}

Dữ liệu deals thực tế:
{DEALS_DATA}

QUAN TRỌNG:
- merchants: array tên merchants thực tế từ deals data
- Chỉ trả về JSON thuần, không có markdown code block`;

const REVIEW_PROMPT = `Bạn là chuyên gia SEO Việt Nam. Viết bài so sánh/savec/hướng dẫn từ deals.

YÊU CẦU:
- Tiêu đề dưới 60 ký tự, dạng so sánh hoặc hướng dẫn
- Meta description dưới 160 ký tự, hấp dẫn
- Nội dung 800-1200 từ, VIẾT BẰNG TIẾNG VIỆT TỰ NHIÊN
- Cấu trúc: Giới thiệu → So sánh/Đánh giá → Hướng dẫn → Kết luận → CTA
- Liệt kê các deals nổi bật trong bài
- Content viết LIỀN TRÊN 1 DÒNG trong JSON

Định dạng trả về (JSON 1 dòng):
{"title":"Tiêu đề so sánh/hướng dẫn","meta_description":"Mô tả dưới 160 ký tự","slug":"duong-dan-cho-seo","content":"Nội dung HTML bằng tiếng Việt, viết liền 1 dòng","keywords":["kw1","kw2","kw3"],"category":"review","merchants":["Merchant1","Merchant2"]}

Dữ liệu deals:
{DEALS_DATA}

QUAN TRỌNG:
- merchants: array tên merchants thực tế từ deals data
- Chỉ trả về JSON thuần, không markdown`;

const PROMPTS = [
  { category: "voucher", prompt: VOUCHER_PROMPT, generateImagePrompt: buildImagePrompt },
  { category: "review",  prompt: REVIEW_PROMPT,  generateImagePrompt: buildImagePrompt },
];

// ============================================================
// HELPER: Extract + repair JSON
// ============================================================
function extractArticle(raw: string): any | null {
  let cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(repair(cleaned.substring(start, end + 1)));
  } catch {
    return null;
  }
}

// ============================================================
// 1. FETCH DEALS
// ============================================================
async function fetchDeals(): Promise<any[]> {
  const apiKey = process.env.ACCESSTRADE_API_KEY;
  if (!apiKey) return MOCK_DEALS;
  try {
    const res = await fetch("https://api.accesstrade.vn/v1/campaigns?status=active&limit=50", {
      headers: { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" },
    });
    if (!res.ok) return MOCK_DEALS;
    const data = await res.json();
    if (data.data && data.data.length > 0) {
      const campaigns = data.data.slice(0, 10).map((c: any) => ({
        name: c.name || "Campaign",
        merchant: c.advertiser_name || "Unknown",
        discount: typeof c.description === "string" ? c.description.substring(0, 80) : String(c.description ?? "").substring(0, 80),
        code: c.code || "",
        expires: c.end_date || "2026-12-31",
      }));
      console.log(`Fetched ${campaigns.length} campaigns from AccessTrade`);
      return campaigns;
    }
  } catch { /* use mock */ }
  return MOCK_DEALS;
}

// ============================================================
// 2. GROQ VIẾT BÀI
// ============================================================
async function writeArticle(deals: any[], idx: number): Promise<any | null> {
  const template = PROMPTS[idx];
  const prompt = template.prompt.replace("{DEALS_DATA}", JSON.stringify(deals));
  console.log(`Groq writing article #${idx + 1} [${template.category}]...`);
  try {
    const result = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 4096,
    });
    const article = extractArticle(result.choices[0]?.message?.content || "");
    if (!article?.title || !article?.content || !article?.slug) {
      console.error("Invalid article:", article);
      return null;
    }

    // Tạo slug unique + timestamp
    article.slug = `${article.slug}-${Date.now()}`;

    // Extract merchants từ deals để build image prompt
    const merchants = deals.map((d: any) => d.merchant).filter(Boolean).slice(0, 5);
    article._category = template.category;
    article._merchants = merchants;

    // Build specific image prompt cho bài này
    article.featured_image_prompt = template.generateImagePrompt(
      article.title,
      template.category,
      merchants
    );

    console.log(`Ready: "${article.title}"`);
    console.log(`Image prompt: "${article.featured_image_prompt.substring(0, 80)}..."`);
    return article;
  } catch (e) {
    console.error("Groq error:", e);
    return null;
  }
}

// ============================================================
// 3. AI HORDE TẠO ẢNH (skip nếu anonymous quá chậm)
// ============================================================
async function generateImage(prompt: string, slug: string): Promise<string | null> {
  // 1. Thử AI Horde trước (nếu có key và không phải anonymous)
  if (CONFIG.aihordeApiKey && CONFIG.aihordeApiKey !== "0000000000") {
    const img = await generateImageAIHorde(prompt, slug);
    if (img) return img;
  }

  // 2. Fallback: Pollinations AI (luôn online, miễn phí)
  console.log("AI Horde timeout → falling back to Pollinations AI...");
  return await generateImagePollinations(prompt, slug);
}

// ============================================================
// 3a. AI HORDE (thử trước)
// ============================================================
async function generateImageAIHorde(prompt: string, slug: string): Promise<string | null> {
  console.log(`AI Horde generating image...`);
  try {
    const res = await fetch("https://aihorde.net/api/v2/generate/async", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: CONFIG.aihordeApiKey },
      body: JSON.stringify({
        prompt,
        params: { sampler_name: "k_euler", steps: 25, width: 512, height: 512, cfg_scale: 7.5 },
        models: ["Flux1.1"],
        nsfw: false,
        trusted_workers: false,
      }),
    });

    if (!res.ok) {
      console.error("AI Horde error:", (await res.text()).substring(0, 200));
      return null;
    }

    const { id: reqId } = await res.json();
    console.log(`Horde ID: ${reqId}, polling...`);

    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const stat = await fetch(`https://aihorde.net/api/v2/generate/status/${reqId}`, {
          headers: { apikey: CONFIG.aihordeApiKey }
        });
        if (!stat.ok) continue;
        const data = await stat.json();
        const state = data.state || "";
        console.log(`State: ${state} (${i + 1}/30)`);
        if (state === "completed") {
          const img = data.generations?.[0]?.img;
          if (img) {
            console.log(`Image ready (${img.length} chars)`);
            return `data:image/png;base64,${img}`;
          }
        }
        if (state === "failed" || state === "cancelled") break;
      } catch { /* continue */ }
    }
    console.log("AI Horde timeout");
    return null;
  } catch (e) {
    console.error("AI Horde error:", e);
    return null;
  }
}

// ============================================================
// 3b. POLLINATIONS AI (fallback — luôn online)
// ============================================================
async function generateImagePollinations(prompt: string, slug: string): Promise<string | null> {
  console.log(`Pollinations generating image...`);

  // Encode prompt cho Pollinations: spaces → %20, special chars escape
  const encodedPrompt = encodeURIComponent(prompt).replace(/%20/g, "+");
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&seed=${Date.now() % 9999}&nologo=true`;

  console.log(`Pollinations URL: ${imageUrl.substring(0, 80)}...`);

  // Download ảnh từ Pollinations
  try {
    const imgRes = await fetch(imageUrl, {
      signal: AbortSignal.timeout(30_000),
    });

    if (!imgRes.ok) {
      console.error(`Pollinations fetch failed: ${imgRes.status}`);
      return null;
    }

    // Convert sang base64 để upload lên Supabase Storage
    const imgBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(imgBuffer).toString("base64");
    const mimeType = imgRes.headers.get("content-type") || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    console.log(`Image downloaded (${(imgBuffer.byteLength / 1024).toFixed(1)} KB)`);
    return dataUrl;
  } catch (e) {
    console.error("Pollinations download error:", e);
    return null;
  }
}

// ============================================================
// 4. UPLOAD ẢNH
// ============================================================
async function uploadImage(dataUrl: string, slug: string): Promise<string | null> {
  console.log("Uploading image...");
  try {
    const m = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!m) return null;
    const buf = Buffer.from(m[2], "base64");
    const fp = `covers/${slug}.png`;
    const res = await fetch(`${CONFIG.supabaseStorageUrl}/storage/v1/object/blog-images/${fp}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${CONFIG.supabaseKey}`, "Content-Type": m[1], "x-upsert": "true" },
      body: buf,
    });
    if (!res.ok) {
      console.error("Upload failed:", (await res.text()).substring(0, 200));
      return null;
    }
    const url = `${CONFIG.supabaseStorageUrl}/storage/v1/object/public/blog-images/${fp}`;
    console.log("Image URL:", url);
    return url;
  } catch (e) {
    console.error("Upload error:", e);
    return null;
  }
}

// ============================================================
// 5. LƯU BÀI
// ============================================================
async function saveArticle(article: any, imgUrl: string | null): Promise<boolean> {
  console.log(`Saving: "${article.title}"...`);
  const body = {
    title: article.title,
    slug: article.slug,
    content: article.content,
    meta_description: article.meta_description || "",
    keywords: article.keywords || [],
    category: article.category || "voucher",
    featured_image_url: imgUrl,
    featured_image_prompt: article.featured_image_prompt || "",
    status: "published",
    source: "auto-generated",
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  try {
    const res = await fetch(`${CONFIG.supabaseUrl}/rest/v1/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: CONFIG.supabaseKey,
        Authorization: `Bearer ${CONFIG.supabaseKey}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Save failed:", res.status, err.substring(0, 300));
      return false;
    }

    const data = await res.json();
    console.log(`Saved! ID: ${data[0]?.id}`);
    return true;
  } catch (e) {
    console.error("Save error:", e);
    return false;
  }
}

// ============================================================
// 6. XÓA BÀI CŨ
// ============================================================
async function cleanupOld(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - CONFIG.deleteAfterDays);
  try {
    const sel = await fetch(
      `${CONFIG.supabaseUrl}/rest/v1/posts?created_at=lt.${cutoff.toISOString()}&status=eq.published&source=eq.auto-generated&select=id,slug`,
      { headers: { apikey: CONFIG.supabaseKey, Authorization: `Bearer ${CONFIG.supabaseKey}` } }
    );
    if (!sel.ok) return 0;
    const old = await sel.json();
    if (!old.length) return 0;
    for (const a of old) {
      await fetch(`${CONFIG.supabaseStorageUrl}/storage/v1/object/blog-images/covers/${a.slug}.png`, {
        method: "DELETE", headers: { Authorization: `Bearer ${CONFIG.supabaseKey}` }
      });
    }
    const ids = old.map((a: any) => a.id).join(",");
    await fetch(`${CONFIG.supabaseUrl}/rest/v1/posts?id=in.(${ids})`, {
      method: "DELETE",
      headers: { apikey: CONFIG.supabaseKey, Authorization: `Bearer ${CONFIG.supabaseKey}` }
    });
    console.log(`Deleted ${old.length} old articles`);
    return old.length;
  } catch (e) { console.error("Cleanup error:", e); return 0; }
}

// ============================================================
// COUNT
// ============================================================
async function countArticles(): Promise<number> {
  try {
    const res = await fetch(`${CONFIG.supabaseUrl}/rest/v1/posts?status=eq.published&select=id`, {
      headers: { apikey: CONFIG.supabaseKey, Authorization: `Bearer ${CONFIG.supabaseKey}` }
    });
    return res.ok ? (await res.json()).length : 0;
  } catch { return 0; }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("====================================================");
  console.log("DAILY SEO PIPELINE");
  console.log(`Time: ${new Date().toLocaleString("vi-VN")}`);
  console.log("====================================================");

  const before = await countArticles();
  console.log(`Articles before: ${before}`);

  const deals = await fetchDeals();
  console.log(`Deals: ${deals.length}`);

  let ok = 0;
  const results: { title: string; img: string | null }[] = [];

  for (let i = 0; i < CONFIG.articlesPerDay; i++) {
    console.log(`\n--- Article ${i + 1}/${CONFIG.articlesPerDay} ---`);
    const article = await writeArticle(deals, i);
    if (!article) continue;

    let imgUrl: string | null = null;
    if (article.featured_image_prompt) {
      imgUrl = await generateImage(article.featured_image_prompt, article.slug);
    }
    if (imgUrl) imgUrl = await uploadImage(imgUrl, article.slug);

    if (await saveArticle(article, imgUrl)) {
      ok++;
      results.push({ title: article.title, img: imgUrl });
    }

    if (i < CONFIG.articlesPerDay - 1) {
      console.log("Waiting 15s...");
      await new Promise(r => setTimeout(r, 15000));
    }
  }

  const deleted = await cleanupOld();
  const after = await countArticles();

  console.log("\n====================================================");
  console.log("REPORT");
  console.log(`New: ${ok}/${CONFIG.articlesPerDay}`);
  console.log(`Images: ${results.filter(r => r.img).length}/${ok}`);
  console.log(`Deleted: ${deleted}`);
  console.log(`Total: ${after}`);
  results.forEach((r, i) => console.log(` ${i + 1}. "${r.title}"${r.img ? `\n    Img: ${r.img}` : ""}`));
  console.log("====================================================");

  if (ok === CONFIG.articlesPerDay) console.log("SUCCESS!");
  else process.exit(1);
}

main();
