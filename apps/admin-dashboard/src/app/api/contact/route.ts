/**
 * Contact API — POST /api/contact
 *
 * Handles contact form submissions.
 *
 * Current implementation: stores submission to a local JSON file
 * (simple, works out of the box, requires no external service).
 *
 * For production, replace the storage logic with your preferred method:
 *   - Email via SendGrid / Resend / SMTP
 *   - Form service (Tally, Basin, Formspree)
 *   - Database table
 *   - Slack webhook
 *
 * Configuration:
 *   NEXT_PUBLIC_CONTACT_EMAIL — shown to users; also used as From address for email
 *   CONTACT_SUBMISSION_PATH   — path to JSON file (default: ./data/contact-submissions.json)
 *   CONTACT_ENABLE_EMAIL     — set to "true" to send email (requires SMTP or API key env vars)
 *   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS — SMTP credentials for email
 *
 * All submissions are validated server-side before processing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const MAX_MESSAGE_LENGTH = 2000;
const MAX_EMAIL_LENGTH = 254; // RFC 5321

const ALLOWED_TOPICS = new Set([
  'general',
  'bug',
  'suggestion',
  'partnership',
  'dpo',     // Data Protection / GDPR: request to delete data
  'other',
]);

const STORAGE_PATH = process.env.CONTACT_SUBMISSION_PATH
  ?? path.join(process.cwd(), 'data', 'contact-submissions.json');

interface ContactSubmission {
  id: string;
  timestamp: string;
  email: string;           // may be empty string
  topic: string;
  message: string;
  ip?: string;             // intentionally not logged by default
  userAgent?: string;
}

/** Basic email validation (RFC 5321 simplified). */
function isValidEmail(email: string): boolean {
  if (!email || email.length > MAX_EMAIL_LENGTH) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** XSS sanitisation — strip HTML tags from all string fields. */
function sanitise(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/<[^>]*>/g, '').trim().slice(0, MAX_MESSAGE_LENGTH);
}

/** Generate a short unique-ish ID without external libraries. */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Load existing submissions from storage file. */
async function loadSubmissions(): Promise<ContactSubmission[]> {
  try {
    if (!existsSync(STORAGE_PATH)) return [];
    const { readFile } = await import('fs/promises');
    const raw = await readFile(STORAGE_PATH, 'utf-8');
    return JSON.parse(raw) as ContactSubmission[];
  } catch {
    return [];
  }
}

/** Save a new submission to the storage file. */
async function saveSubmission(submission: ContactSubmission): Promise<void> {
  const dir = path.dirname(STORAGE_PATH);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  const existing = await loadSubmissions();
  existing.unshift(submission); // newest first
  await writeFile(STORAGE_PATH, JSON.stringify(existing, null, 2), 'utf-8');
}

// ── POST handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Yêu cầu không hợp lệ.' },
      { status: 400 }
    );
  }

  const email = sanitise(body.email ?? '');
  const topic = sanitise(body.topic ?? '');
  const message = sanitise(body.message ?? '');

  // ── Validation ────────────────────────────────────────────────────────────
  if (!message || message.length < 10) {
    return NextResponse.json(
      { error: 'Nội dung quá ngắn. Vui lòng nhập ít nhất 10 ký tự.' },
      { status: 422 }
    );
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Nội dung quá dài. Tối đa ${MAX_MESSAGE_LENGTH} ký tự.` },
      { status: 422 }
    );
  }

  if (email && !isValidEmail(email)) {
    return NextResponse.json(
      { error: 'Địa chỉ email không hợp lệ.' },
      { status: 422 }
    );
  }

  if (!ALLOWED_TOPICS.has(topic)) {
    return NextResponse.json(
      { error: 'Chủ đề không hợp lệ.' },
      { status: 422 }
    );
  }

  // ── Build submission ──────────────────────────────────────────────────────
  const submission: ContactSubmission = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    email: email || '(không cung cấp)',
    topic,
    message,
    // IP and User-Agent intentionally excluded by default — no tracking
  };

  // ── Store ──────────────────────────────────────────────────────────────────
  try {
    await saveSubmission(submission);
  } catch (err) {
    console.error('[contact] Failed to save submission:', err);
    return NextResponse.json(
      { error: 'Không thể lưu phản hồi. Vui lòng thử lại sau.' },
      { status: 500 }
    );
  }

  // ── Future: send email ─────────────────────────────────────────────────────
  // To enable email notifications, add your email sending logic here.
  // Example with Resend (resend.com):
  //
  // if (process.env.CONTACT_ENABLE_EMAIL === 'true') {
  //   const { Resend } = await import('resend');
  //   const resend = new Resend(process.env.RESEND_API_KEY);
  //   await resend.emails.send({
  //     from: 'VoucherFinder <noreply@voucherfinder.app>',
  //     to: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
  //     subject: `[Phản hồi] ${topic} — từ ${email || 'không rõ email'}`,
  //     text: `Topic: ${topic}\nEmail: ${email}\n\n${message}`,
  //   });
  // }

  return NextResponse.json(
    {
      success: true,
      message: 'Phản hồi của bạn đã được gửi. Chúng tôi sẽ phản hồi trong 2–5 ngày làm việc.',
    },
    { status: 200 }
  );
}

// ── GET handler (optional: list submissions for admin) ─────────────────────────
// Disabled by default — requires admin authentication
//
// export async function GET(request: NextRequest) {
//   // TODO: Add admin auth check here
//   const submissions = await loadSubmissions();
//   return NextResponse.json({ submissions });
// }
