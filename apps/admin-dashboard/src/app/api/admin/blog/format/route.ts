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
import type { Role } from '@/lib/auth/rbac';

// ── OpenAI-compatible call via Groq ──────────────────────────────────────────

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? '';
const AI_MODEL = 'llama-3.3-70b-versatile'; // fast, good quality, free tier
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const REQUEST_TIMEOUT_MS = 30_000;

interface FormatRequest {
  content: string;
  instruction: string;
}

interface FormatResponse {
  formatted: string;
  model: string;
  tokensUsed?: number;
}

async function callAI(content: string, instruction: string): Promise<FormatResponse> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured on the server.');
  }

  const systemPrompt = `Bạn là một biên tập viên nội dung blog chuyên nghiệp tiếng Việt.
Nhiệm vụ của bạn: chỉnh sửa và định dạng nội dung blog theo yêu cầu.

QUY TẮC NGHIÊM NGẶT:
1. CHỈ trả về nội dung đã chỉnh sửa, KHÔNG kèm giải thích hay bình luận
2. Dùng HTML sạch: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <br>
3. KHÔNG dùng Markdown thô (##, **, -, ###, v.v.)
4. KHÔNG nhét hashtag (#...) vào body bài viết
5. Heading phải tách hợp lý: 1 <h2> chính, có <h3> sub-heading nếu cần
6. Đoạn văn ngắn gọn, mỗi đoạn <p> không quá 3-4 câu
7. Giữ nguyên ý nghĩa và thông tin gốc, chỉ cải thiện cấu trúc và định dạng
8. Nếu nội dung đã tốt, vẫn trả về bản đã định dạng HTML sạch
9. Trả lời bằng tiếng Việt, giữ nguyên giọng điệu của bài viết gốc`;

  const userPrompt = `YÊU CẦU CHỈNH SỬA: ${instruction}

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

  const { content, instruction } = body as FormatRequest;

  // Validate
  if (!content || typeof content !== 'string' || content.trim().length < 20) {
    return NextResponse.json(
      { error: 'Nội dung bài viết phải có ít nhất 20 ký tự.' },
      { status: 400 }
    );
  }

  if (!instruction || typeof instruction !== 'string' || instruction.trim().length < 5) {
    return NextResponse.json(
      { error: 'Vui lòng nhập hướng dẫn chỉnh sửa (ít nhất 5 ký tự).' },
      { status: 400 }
    );
  }

  // Call AI
  try {
    const result = await callAI(content.trim(), instruction.trim());

    return NextResponse.json(
      {
        data: result,
        message: 'Nội dung đã được định dạng thành công.',
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
