import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import Groq from "groq-sdk";
import { jsonrepair as repair } from "jsonrepair";

const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey) {
  console.error("ERROR: GROQ_API_KEY not set!");
  process.exit(1);
}

const groq = new Groq({ apiKey: groqApiKey });

const CONFIG = {
  articlesPerDay: parseInt(process.env.ARTICLES_PER_DAY || "2"),
  deleteAfterDays: parseInt(process.env.DELETE_AFTER_DAYS || "30"),
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY!,
  aihordeApiKey: process.env.AIHORDE_API_KEY || "0000000000",
  supabaseStorageUrl: process.env.SUPABASE_URL!,
};

// ============================================================
// PROMPTS
// ============================================================
const PROMPTS = [
  {
    prompt: `Bạn là chuyên gia SEO Việt Nam. Viết bài SEO tổng hợp deals.

YÊU CẦU:
- Tiêu đề dưới 60 ký tự, có từ khóa chính
- Meta description dưới 160 ký tự, hấp dẫn
- Nội dung 800-1200 từ, viết tự nhiên
- Có H2, H3, bullet points, danh sách mã giảm giá, CTA
- VIẾT BẰNG TIẾNG VIỆT TỰ NHIÊN
- Nội dung content viết LIỀN TRÊN 1 DÒNG, không xuống dòng trong JSON

Định dạng trả về (JSON 1 dòng duy nhất):
{"title":"Tiêu đề","meta_description":"Mô tả","slug":"duong-dan","content":"Nội dung HTML viết liền, không xuống dòng trong chuỗi","keywords":["kw1","kw2"],"category":"voucher","featured_image_prompt":"English prompt 1-2 sentences for AI image generation, vibrant colorful blog cover style"}

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

Định dạng trả về (JSON 1 dòng duy nhất):
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
  const jsonStr = cleaned.substring(start, end + 1);
  try {
    return JSON.parse(repair(jsonStr));
  } catch {
    return null;
  }
}

// ============================================================
// 1. FETCH DEALS
// ============================================================
async function fetchDeals(): Promise<any[]> {
  const apiKey = process.env.ACCESSTRADE_API_KEY;
  if (!apiKey) {
    console.log("Using mock deals (no ACCESSTRADE_API_KEY)");
    return [
      { name: "Giảm 50% Lazada Friday", merchant: "Lazada", discount: "50%", code: "LAZADA50", expires: "2026-03-31" },
      { name: "Freeship Shopee 0đ", merchant: "Shopee", discount: "Freeship", code: "FREESHIP0", expires: "2026-03-31" },
      { name: "Mã 30% Tiki", merchant: "Tiki", discount: "30%", code: "TIKI30", expires: "2026-04-15" },
      { name: "Giảm 100k Lazada", merchant: "Lazada", discount: "100k", code: "LAZADA100", expires: "2026-03-31" },
      { name: "Sale 70% Điện thoại", merchant: "Shopee", discount: "70%", code: "PHONE70", expires: "2026-04-01" },
    ];
  }
  try {
    const res = await fetch("https://api.accesstrade.vn/v1/deals?status=active&limit=50", {
      headers: { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    console.log(`Fetched ${data.data?.length || 0} deals from AccessTrade`);
    return data.data || [];
  } catch {
    return [];
  }
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
    const raw = result.choices[0]?.message?.content || "";
    const article = extractArticle(raw);
    if (!article || !article.title || !article.content || !article.slug) {
      console.error("Invalid article from AI:", article);
      return null;
    }
    article.slug = `${article.slug}-${Date.now()}`;
    console.log(`Article ready: "${article.title}"`);
    return article;
  } catch (e) {
    console.error("Groq error:", e);
    return null;
  }
}

// ============================================================
// 3. AI HORDE TẠO ẢNH
// ============================================================
async function generateImage(prompt: string, slug: string): Promise<string | null> {
  const hasKey = CONFIG.aihordeApiKey !== "0000000000";
  const isAnon = !hasKey;

  // Anonymous: max 512x512, max 30 steps. Has key: 1024x576, 25 steps
  const imgW = isAnon ? 512 : 512;
  const imgH = isAnon ? 512 : 512;
  const steps = isAnon ? 30 : 25;

  console.log(`AI Horde ${isAnon ? "(anonymous)" : "(with API key)"} generating image: ${imgW}x${imgH}, ${steps} steps`);

  try {
    // Submit
    const res = await fetch("https://aihorde.net/api/v2/generate/async", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: CONFIG.aihordeApiKey },
      body: JSON.stringify({
        prompt: prompt,
        params: { sampler_name: "k_euler", steps, width: imgW, height: imgH, cfg_scale: 7.5 },
        models: ["Flux1.1"],
        nsfw: false,
        trusted_workers: false,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      // If kudos error, try smaller
      if (err.includes("kudos") || err.includes("KudosUpfront")) {
        console.log("Anonymous kudos limit, trying smaller image (384x384, 20 steps)...");
        const res2 = await fetch("https://aihorde.net/api/v2/generate/async", {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: CONFIG.aihordeApiKey },
          body: JSON.stringify({
            prompt: prompt,
            params: { sampler_name: "k_euler", steps: 20, width: 384, height: 384, cfg_scale: 7.5 },
            models: ["Flux1.1"],
            nsfw: false,
            trusted_workers: false,
          }),
        });
        if (!res2.ok) {
          console.error("Image gen failed:", await res2.text());
          return null;
        }
        var submitData = await res2.json();
      } else {
        console.error("Image gen failed:", err);
        return null;
      }
    } else {
      var submitData = await res.json();
    }

    const reqId = submitData.id;
    console.log(`Horde ID: ${reqId}, polling...`);

    // Poll
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const stat = await fetch(`https://aihorde.net/api/v2/generate/status/${reqId}`, {
        headers: { apikey: CONFIG.aihordeApiKey }
      });
      if (!stat.ok) continue;

      const data = await stat.json();
      // State can be in different places
      const state = data.state || data.status;
      console.log(`State: ${state} (${i + 1}/60)`);

      if (state === "completed") {
        const gen = data.generations?.[0]?.img || data.generations?.[0]?.base64;
        if (gen) {
          console.log(`Image ready (${gen.length} chars)`);
          return `data:image/png;base64,${gen}`;
        }
      }
      if (state === "failed" || state === "cancelled") break;
    }
    console.log("Image timeout");
    return null;
  } catch (e) {
    console.error("Image gen error:", e);
    return null;
  }
}

// ============================================================
// 4. UPLOAD ẢNH LÊN SUPABASE
// ============================================================
async function uploadImage(dataUrl: string, slug: string): Promise<string | null> {
  console.log("Uploading image to Supabase...");
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
      console.error("Upload failed:", await res.text());
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
// 5. LƯU BÀI VÀO SUPABASE
// ============================================================
async function saveArticle(article: any, imgUrl: string | null): Promise<boolean> {
  console.log(`Saving article: "${article.title}"...`);
  try {
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
      const errText = await res.text();
      console.error("Save failed:", res.status, errText);
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
  const cutoffStr = cutoff.toISOString();

  try {
    const sel = await fetch(
      `${CONFIG.supabaseUrl}/rest/v1/posts?created_at=lt.${cutoffStr}&status=eq.published&source=eq.auto-generated&select=id,slug`,
      { headers: { apikey: CONFIG.supabaseKey, Authorization: `Bearer ${CONFIG.supabaseKey}` } }
    );
    if (!sel.ok) return 0;
    const old = await sel.json();
    if (!old.length) { console.log("No old articles to delete"); return 0; }

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
  } catch (e) {
    console.error("Cleanup error:", e);
    return 0;
  }
}

// ============================================================
// COUNT ARTICLES
// ============================================================
async function countArticles(): Promise<number> {
  try {
    const res = await fetch(`${CONFIG.supabaseUrl}/rest/v1/posts?status=eq.published&select=id`, {
      headers: { apikey: CONFIG.supabaseKey, Authorization: `Bearer ${CONFIG.supabaseKey}` }
    });
    if (!res.ok) return 0;
    return (await res.json()).length;
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
  if (!deals.length) { console.error("No deals!"); process.exit(1); }

  let ok = 0;
  const results: { title: string; img: string | null }[] = [];

  for (let i = 0; i < CONFIG.articlesPerDay; i++) {
    console.log(`\n--- Article ${i + 1}/${CONFIG.articlesPerDay} ---`);
    const article = await writeArticle(deals, i);
    if (!article) { console.error("Failed to write article"); continue; }

    let imgUrl: string | null = null;
    if (article.featured_image_prompt) {
      imgUrl = await generateImage(article.featured_image_prompt, article.slug);
    }

    if (imgUrl) {
      imgUrl = await uploadImage(imgUrl, article.slug);
    }

    const saved = await saveArticle(article, imgUrl);
    if (saved) { ok++; results.push({ title: article.title, img: imgUrl }); }

    if (i < CONFIG.articlesPerDay - 1) {
      console.log("Waiting 15s...");
      await new Promise(r => setTimeout(r, 15000));
    }
  }

  const deleted = await cleanupOld();
  const after = await countArticles();

  console.log("\n====================================================");
  console.log("REPORT");
  console.log(`New articles: ${ok}/${CONFIG.articlesPerDay}`);
  console.log(`Images: ${results.filter(r => r.img).length}/${ok}`);
  console.log(`Deleted: ${deleted}`);
  console.log(`Articles after: ${after}`);
  results.forEach((r, i) => console.log(` ${i + 1}. "${r.title}"${r.img ? `\n    Image: ${r.img}` : ""}`));
  console.log("====================================================");

  if (ok === CONFIG.articlesPerDay) {
    console.log("SUCCESS!");
  } else {
    process.exit(1);
  }
}

main();
