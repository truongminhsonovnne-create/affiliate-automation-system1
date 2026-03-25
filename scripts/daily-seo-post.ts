import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

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
// PROMPTS
// ============================================================
const PROMPTS = [
  {
    prompt: `Bạn là chuyên gia SEO Việt Nam. Viết bài SEO tổng hợp deals khuyến mãi.

YÊU CẦU:
- Tiêu đề dưới 60 ký tự, có từ khóa chính
- Meta description dưới 160 ký tự, hấp dẫn
- Nội dung 800-1200 từ, viết tự nhiên
- Có H2, H3, bullet points, danh sách mã giảm giá, CTA
- VIẾT BẰNG TIẾNG VIỆT TỰ NHIÊN
- Content viết LIỀN TRÊN 1 DÒNG trong JSON

Định dạng trả về (JSON 1 dòng):
{"title":"Tiêu đề","meta_description":"Mô tả","slug":"duong-dan","content":"Nội dung HTML viết liền không xuống dòng trong chuỗi","keywords":["kw1","kw2"],"category":"voucher","featured_image_prompt":"English prompt 1-2 sentences for AI image, vibrant colorful blog cover style"}

Dữ liệu deals:
{DEALS_DATA}

CHỈ TRẢ VỀ JSON, không giải thích.`
  },
  {
    prompt: `Bạn là chuyên gia SEO Việt Nam. Viết bài so sánh/hướng dẫn từ deals.

YÊU CẦU:
- Tiêu đề dưới 60 ký tự
- Meta description dưới 160 ký tự
- Nội dung 800-1200 từ
- Cấu trúc: Giới thiệu → So sánh → Hướng dẫn → Kết luận → CTA
- VIẾT BẰNG TIẾNG VIỆT TỰ NHIÊN
- Content viết LIỀN TRÊN 1 DÒNG trong JSON

Định dạng trả về (JSON 1 dòng):
{"title":"Tiêu đề","meta_description":"Mô tả","slug":"duong-dan","content":"Nội dung HTML viết liền không xuống dòng trong chuỗi","keywords":["kw1","kw2"],"category":"review","featured_image_prompt":"English prompt 1-2 sentences for AI image, vibrant colorful blog cover style"}

Dữ liệu deals:
{DEALS_DATA}

CHỈ TRẢ VỀ JSON, không giải thích.`
  }
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
        discount: typeof c.description === "string" ? c.description.substring(0, 80) : "",
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
  const prompt = PROMPTS[idx].prompt.replace("{DEALS_DATA}", JSON.stringify(deals));
  console.log(`Groq writing article #${idx + 1}...`);
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
    article.slug = `${article.slug}-${Date.now()}`;
    console.log(`Ready: "${article.title}"`);
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
  if (CONFIG.aihordeApiKey === "0000000000") {
    console.log("Skipping image (anonymous - AI Horde queue is slow)");
    return null;
  }

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
    console.log("Image timeout");
    return null;
  } catch (e) {
    console.error("Image error:", e);
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
