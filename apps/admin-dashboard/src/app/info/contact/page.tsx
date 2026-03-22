'use client';

/**
 * Contact Page — /contact
 *
 * Working contact form with server-side submission.
 * Expectations are set honestly — real response path, no live support.
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Mail, Clock, CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { InfoPageLayout } from '@/components/public';
import { useAnalytics } from '@/lib/public/analytics-context';
import { SITE_CONFIG } from '@/lib/public/site-config';

// ── Types ────────────────────────────────────────────────────────────────────

type Topic = 'general' | 'bug' | 'suggestion' | 'partnership' | 'dpo' | 'other';

type FormState = 'idle' | 'loading' | 'success' | 'error';

interface FormError {
  field: 'email' | 'topic' | 'message' | 'general';
  message: string;
}

// ── Response time config ─────────────────────────────────────────────────────

const RESPONSE_TIMES = [
  { type: 'Câu hỏi chung', time: '2–5 ngày làm việc' },
  { type: 'Báo lỗi hệ thống', time: '1–3 ngày làm việc' },
  { type: 'Yêu cầu xóa dữ liệu', time: '3–7 ngày làm việc' },
  { type: 'Hợp tác / Partnership', time: '5–10 ngày làm việc' },
];

const TOPIC_OPTIONS: { value: Topic; label: string }[] = [
  { value: 'general', label: 'Câu hỏi chung' },
  { value: 'bug', label: 'Báo lỗi' },
  { value: 'suggestion', label: 'Đề xuất tính năng' },
  { value: 'partnership', label: 'Hợp tác / Partnership' },
  { value: 'dpo', label: 'Yêu cầu xóa dữ liệu' },
  { value: 'other', label: 'Khác' },
];

// ── Form component ────────────────────────────────────────────────────────────

function ContactForm() {
  const { trackEvent } = useAnalytics();

  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState<Topic | ''>('');
  const [message, setMessage] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [errors, setErrors] = useState<FormError[]>([]);

  const clearError = (field: FormError['field']) =>
    setErrors((prev) => prev.filter((e) => e.field !== field));

  const getError = (field: FormError['field']) =>
    errors.find((e) => e.field === field)?.message;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrors([]);
      setFormState('loading');

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, topic, message }),
        });

        const data = (await res.json()) as { error?: string; success?: boolean };

        if (!res.ok || data.error) {
          // Parse field-level errors from the 422 response
          const errorMessage = data.error ?? 'Đã xảy ra lỗi. Vui lòng thử lại.';
          const fieldMap: Record<string, FormError['field']> = {
            'email': 'email',
            'topic': 'topic',
            'Nội dung': 'message',
          };
          const field = fieldMap[errorMessage.split(' ')[0]] ?? 'general';
          setErrors([{ field, message: errorMessage }]);
          setFormState('error');
          trackEvent('contact_submit_fail', { errorCode: res.status.toString(), errorMessage: errorMessage });
          return;
        }

        setFormState('success');
        trackEvent('contact_submit_success', { topic: topic || 'unknown' });
      } catch {
        setErrors([{ field: 'general', message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại.' }]);
        setFormState('error');
        trackEvent('contact_submit_fail', { errorCode: 'NETWORK', errorMessage: 'Network error' });
      }
    },
    [email, topic, message, trackEvent]
  );

  if (formState === 'success') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-3">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-6 w-6 text-emerald-600" aria-hidden="true" />
          </div>
        </div>
        <p className="text-sm font-semibold text-emerald-800">
          Phản hồi đã được gửi
        </p>
        <p className="text-xs text-emerald-700 leading-relaxed">
          Chúng tôi đã nhận được tin nhắn của bạn và sẽ phản hồi trong 2–5 ngày làm việc.
          {email && <> Kiểm tra hộp thư <strong>{email}</strong> nếu bạn muốn được phản hồi trực tiếp.</>}
        </p>
        <button
          type="button"
          onClick={() => {
            setFormState('idle');
            setEmail('');
            setTopic('');
            setMessage('');
            setErrors([]);
          }}
          className="text-xs text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
        >
          Gửi phản hồi khác
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5"
    >
      {/* General error */}
      {getError('general') && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{getError('general')}</span>
        </div>
      )}

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="contact-email" className="block text-xs font-medium text-gray-700">
          Email của bạn
          <span className="ml-1 text-gray-400 font-normal">(không bắt buộc — cần điền nếu bạn muốn được phản hồi)</span>
        </label>
        <input
          id="contact-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
          placeholder="you@example.com"
          disabled={formState === 'loading'}
          aria-describedby={getError('email') ? 'email-error' : undefined}
          aria-invalid={!!getError('email')}
          style={{
            borderColor: getError('email') ? '#fca5a5' : undefined,
          }}
          className={[
            'w-full rounded-lg border px-3 py-2.5 text-sm transition-colors',
            'placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-brand-400',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            getError('email')
              ? 'border-red-300 bg-red-50/50 focus:border-red-400 focus:ring-red-100'
              : 'border-gray-200 focus:border-brand-400',
          ].join(' ')}
        />
        {getError('email') && (
          <p id="email-error" role="alert" className="text-xs text-red-600">{getError('email')}</p>
        )}
      </div>

      {/* Topic */}
      <div className="space-y-1.5">
        <label htmlFor="contact-topic" className="block text-xs font-medium text-gray-700">
          Chủ đề <span className="text-red-500">*</span>
        </label>
        <select
          id="contact-topic"
          value={topic}
          onChange={(e) => { setTopic(e.target.value as Topic); clearError('topic'); }}
          disabled={formState === 'loading'}
          required
          aria-invalid={!!getError('topic')}
          className={[
            'w-full rounded-lg border px-3 py-2.5 text-sm bg-white transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-brand-400',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            getError('topic')
              ? 'border-red-300 bg-red-50/50 focus:border-red-400 focus:ring-red-100'
              : 'border-gray-200 focus:border-brand-400',
          ].join(' ')}
        >
          <option value="">Chọn chủ đề</option>
          {TOPIC_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {getError('topic') && (
          <p role="alert" className="text-xs text-red-600">{getError('topic')}</p>
        )}
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <label htmlFor="contact-message" className="block text-xs font-medium text-gray-700">
          Nội dung <span className="text-red-500">*</span>
          <span className="ml-1 text-gray-400 font-normal">(tối thiểu 20 ký tự)</span>
        </label>
        <textarea
          id="contact-message"
          rows={5}
          value={message}
          onChange={(e) => { setMessage(e.target.value); clearError('message'); }}
          placeholder="Mô tả vấn đề hoặc câu hỏi của bạn..."
          disabled={formState === 'loading'}
          required
          aria-describedby={getError('message') ? 'message-error' : 'message-hint'}
          aria-invalid={!!getError('message')}
          className={[
            'w-full rounded-lg border px-3 py-2.5 text-sm transition-colors resize-none',
            'placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-brand-400',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            getError('message')
              ? 'border-red-300 bg-red-50/50 focus:border-red-400 focus:ring-red-100'
              : 'border-gray-200 focus:border-brand-400',
          ].join(' ')}
        />
        <div className="flex items-start justify-between">
          {getError('message') ? (
            <p id="message-error" role="alert" className="text-xs text-red-600">{getError('message')}</p>
          ) : (
            <p id="message-hint" className="text-xs text-gray-400">{message.length}/2000</p>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-xs text-gray-400">
          Không chia sẻ thông tin này với bên thứ ba.
        </p>
        <button
          type="submit"
          disabled={formState === 'loading'}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-brand-sm hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {formState === 'loading' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Đang gửi...</span>
            </>
          ) : (
            <>
              <span>Gửi phản hồi</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ContactPage() {
  const contactEmail = SITE_CONFIG.email;

  return (
    <InfoPageLayout
      title="Liên hệ"
      description="Chúng tôi sẵn sàng lắng nghe. Chọn kênh phù hợp với mục đích của bạn."
      breadcrumb={{ label: 'Liên hệ', href: '/contact' }}
    >
      {/* What to expect */}
      <section>
        <h2>Thời gian phản hồi</h2>
        <p>
          VoucherFinder là dự án cá nhân được vận hành bởi một nhóm nhỏ. Chúng tôi không có
          đội ngũ hỗ trợ 24/7, nhưng cam kết đọc và phản hồi mọi tin nhắn thực sự.
        </p>
        <table>
          <thead>
            <tr>
              <th>Loại yêu cầu</th>
              <th>Thời gian phản hồi</th>
            </tr>
          </thead>
          <tbody>
            {RESPONSE_TIMES.map(({ type, time }) => (
              <tr key={type}>
                <td>{type}</td>
                <td className="font-medium text-gray-800">{time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Contact channels */}
      <section>
        <h2>Các kênh liên hệ</h2>
        <div className="not-prose grid gap-4 sm:grid-cols-2">
          {/* Email */}
          <a
            href={`mailto:${contactEmail}`}
            className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-brand-200 hover:shadow-sm group"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Mail className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Email trực tiếp</p>
              <p className="mt-0.5 text-xs font-medium text-brand-600 group-hover:underline underline-offset-2">
                {contactEmail}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
                <Clock className="h-3 w-3" aria-hidden="true" />
                <span>Phản hồi trong 2–5 ngày làm việc</span>
              </div>
            </div>
          </a>

          {/* Form */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Form phản hồi</p>
                <p className="text-xs text-gray-500">Gửi trực tiếp từ trang này. Không cần đăng ký.</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              <Link href="#contact-form" className="text-brand-600 hover:underline underline-offset-2">
                Cuộn xuống form bên dưới
              </Link>{' '}
              để gửi phản hồi ngay.
            </p>
          </div>
        </div>
      </section>

      {/* Feedback form */}
      <section id="contact-form">
        <h2>Gửi phản hồi</h2>
        <p>
          Form dưới đây gửi phản hồi trực tiếp đến đội ngũ VoucherFinder.
          Không cần đăng ký tài khoản.
          Nếu bạn muốn được phản hồi, hãy điền email — chúng tôi sẽ trả lời khi có thể.
        </p>
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
          <ContactForm />
        </div>
      </section>

      {/* What we do NOT do */}
      <section>
        <h2>Những gì chúng tôi không hỗ trợ</h2>
        <ul>
          <li>Hỗ trợ mua hàng trên Shopee — vui lòng liên hệ bộ phận hỗ trợ của Shopee.</li>
          <li>Giải quyết tranh chấp với người bán — sử dụng kênh khiếu nại của Shopee.</li>
          <li>Hỗ trợ kỹ thuật cho các công cụ khác ngoài VoucherFinder.</li>
          <li>Phản hồi yêu cầu qua mạng xã hội không chính thức.</li>
        </ul>
        <div className="note">
          <p className="note-title">Kênh không chính thức</p>
          <p>
            Nếu bạn nhận được tin nhắn từ tài khoản tự xưng là VoucherFinder trên mạng xã hội,
            hãy báo cho chúng tôi qua email chính thức:{' '}
            <strong>{contactEmail}</strong>.
          </p>
        </div>
      </section>
    </InfoPageLayout>
  );
}
