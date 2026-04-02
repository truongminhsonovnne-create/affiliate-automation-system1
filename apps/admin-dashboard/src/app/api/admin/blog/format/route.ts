/**
 * Format blog post content via AI — /api/admin/blog/format
 *
 * Takes raw content + instruction prompt, sends to OpenAI,
 * returns formatted content that replaces the editor value.
 *
 * Auth: session cookie (server-side verified)
 * Permission: edit_blog_posts (operator+)
 *
 * Body:
 *   content    — raw HTML/text content from the editor
 *   instruction — user instruction (e.g. "chia lại heading, tách đoạn ngắn hơn")
 *
 * Response:
 *   formatted  — the AI-returned content (HTML)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/rbac';
import { sanitizeContent } from '@/lib/content/contentSanitizer';
import type { Role } from '@/lib/auth/rbac';

// ── OpenAI-compatible call via Groq ──────────────────────────────────────────

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? '';
const AI_MODEL = 'llama-3.3-70b-versatile'; // fast, good quality, free tier
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const REQUEST_TIMEOUT_MS = 30_000;

interface FormatRequest {
  content: string;
  instruction?: string;
  title?: string;
  excerpt?: string;
}

interface FormatResponse {
  formatted: string;
  model: string;
  tokensUsed?: number;
}

const DEFAULT_FORMAT_INSTRUCTION = `Hãy biên tập lại nội dung dưới đây để đăng trực tiếp lên blog.

- Chỉ trả về HTML sạch
- Dùng: <h2>, <h3>, <p>, <ul>, <li>, <strong>
- Chia lại heading rõ ràng
- Mỗi đoạn 2 đến 3 câu
- Tách đoạn dài
- Chuyển ý liệt kê thành bullet list
- Bỏ hashtag khỏi thân bài
- Giữ nguyên ý chính, không bịa thêm
- Viết dễ đọc trên mobile
- Kết thúc bằng phần Kết luận
- Viết theo giọng điệu gần gũi, như một người Việt Nam đang chia sẻ thật lòng, không trang trọng quá.
- Thêm chút cảm xúc cá nhân hoặc câu hỏi tu từ ở 1-2 chỗ.
- Sử dụng câu ngắn xen lẫn câu dài, tránh mọi câu đều có độ dài giống nhau.
- Thỉnh thoảng dùng từ nối tự nhiên: "thật ra", "mà", "nên nhớ là", "cực kỳ"…
- Không bao giờ dùng cụm từ máy móc kiểu "bài viết này sẽ phân tích", "tóm lại là", "hy vọng bài viết mang lại".
- Làm cho phần kết luận nghe như lời khuyên của bạn bè.`;

async function callAI(content: string, instruction: string): Promise<FormatResponse> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured on the server.');
  }

  const effectiveInstruction = instruction.trim() || DEFAULT_FORMAT_INSTRUCTION;

  const systemPrompt = `Bạn là biên tập viên blog tiếng Việt chuyên nghiệp. Bạn chỉ trả về nội dung đã biên tập, không kèm giải thích hay bình luận.`;

  const userPrompt = `${effectiveInstruction}

NỘI DUNG GỐC:
${content}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 4000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Groq API error ${res.status}: ${errBody}`);
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { total_tokens: number };
    };

    const formatted = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!formatted) {
      throw new Error('Groq returned empty response');
    }

    return {
      formatted,
      model: AI_MODEL,
      tokensUsed: data.usage?.total_tokens,
    };
  } catch (err) {
    clearTimeout(timer);

    if (err instanceof DOMException && err.name === 'AbortException') {
      throw new Error('AI request timed out. Please try again with shorter content.');
    }

    throw err;
  }
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(session.role as Role, 'edit_blog_posts')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { content, instruction, title, excerpt } = body as FormatRequest;

  // Validate
  if (!content || typeof content !== 'string' || content.trim().length < 20) {
    return NextResponse.json(
      { error: 'Nội dung bài viết phải có ít nhất 20 ký tự.' },
      { status: 400 }
    );
  }

  // instruction is optional — defaults to DEFAULT_FORMAT_INSTRUCTION on empty
  try {
    const result = await callAI(
      content.trim(),
      typeof instruction === 'string' ? instruction.trim() : ''
    );

    // Sanitize AI output: strip unsafe tags, remove duplicates, normalize
    const cleanContent = sanitizeContent(result.formatted, {
      title: typeof title === 'string' ? title : undefined,
      excerpt: typeof excerpt === 'string' ? excerpt : undefined,
      ensureConclusion: true,
    });

    return NextResponse.json(
      {
        data: { ...result, formatted: cleanContent },
        message: 'Nội dung đã được định dạng và làm sạch thành công.',
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI formatting failed';
    console.error('[BlogFormat]', message);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
