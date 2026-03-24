'use client';

/**
 * ContactForm — Interactive contact page form.
 *
 * Standalone client component so the page.tsx server component
 * can export metadata without 'use client'.
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Mail, Clock, CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { InfoPageLayout } from '@/components/public';
import { useAnalytics } from '@/lib/public/analytics-context';
import { SITE_CONFIG } from '@/lib/public/site-config';

type Topic = 'general' | 'bug' | 'suggestion' | 'partnership' | 'dpo' | 'other';

interface FormState {
  name: string;
  email: string;
  topic: Topic;
  message: string;
}

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

const TOPICS: { value: Topic; label: string }[] = [
  { value: 'general', label: 'Phản hồi chung' },
  { value: 'bug', label: 'Báo lỗi' },
  { value: 'suggestion', label: 'Đề xuất tính năng mới' },
  { value: 'partnership', label: 'Hợp tác / Đối tác' },
  { value: 'dpo', label: 'Yêu cầu về dữ liệu (DPO)' },
  { value: 'other', label: 'Khác' },
];

export function ContactForm() {
  const { trackEvent } = useAnalytics();
  const year = SITE_CONFIG.year;

  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    topic: 'general',
    message: '',
  });

  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = useCallback(
    (field: keyof FormState) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        if (status === 'error') setStatus('idle');
      },
    [status]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.message.trim() || !form.email.trim()) return;

      setStatus('loading');
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });

        if (res.ok) {
          setStatus('success');
          trackEvent('contact_form_submit', { topic: form.topic });
        } else {
          const data = await res.json().catch(() => ({})) as { error?: string };
          setErrorMsg(data.error ?? 'Đã xảy ra lỗi. Vui lòng thử lại.');
          setStatus('error');
        }
      } catch {
        setErrorMsg('Không thể kết nối máy chủ. Kiểm tra kết nối mạng.');
        setStatus('error');
      }
    },
    [form, trackEvent]
  );

  const isValid = form.message.trim().length >= 10 && form.email.includes('@');

  if (status === 'success') {
    return (
      <InfoPageLayout
        title="Liên hệ & Phản hồi"
        description="Gửi phản hồi, báo lỗi, hoặc đề xuất tính năng cho VoucherFinder."
        lastUpdated={`Tháng ${new Date().getMonth() + 1}, ${year}`}
        breadcrumb={{ label: 'Liên hệ', href: '/info/contact' }}
      >
        <div className="flex flex-col items-center text-center py-8">
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}
          >
            <CheckCircle className="h-7 w-7" style={{ color: '#16a34a' }} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Đã gửi thành công!
          </h2>
          <p className="text-sm text-gray-500 mb-6 max-w-sm">
            Cảm ơn bạn đã phản hồi. Chúng tôi sẽ trả lời qua email trong vòng 2–5 ngày làm việc.
          </p>
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700"
          >
            Quay về trang chủ
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </InfoPageLayout>
    );
  }

  return (
    <InfoPageLayout
      title="Liên hệ & Phản hồi"
      description="Gửi phản hồi, báo lỗi, hoặc đề xuất tính năng cho VoucherFinder."
      lastUpdated={`Tháng ${new Date().getMonth() + 1}, ${year}`}
      breadcrumb={{ label: 'Liên hệ', href: '/info/contact' }}
    >
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Tên (không bắt buộc)
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Nguyễn Văn A"
                value={form.name}
                onChange={handleChange('name')}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-shadow focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 disabled:opacity-60"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="email@example.com"
                required
                value={form.email}
                onChange={handleChange('email')}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-shadow focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 disabled:opacity-60"
              />
            </div>

            {/* Topic */}
            <div>
              <label
                htmlFor="topic"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Chủ đề
              </label>
              <select
                id="topic"
                value={form.topic}
                onChange={handleChange('topic')}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-shadow focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              >
                {TOPICS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Message */}
            <div>
              <label
                htmlFor="message"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Nội dung <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                rows={5}
                placeholder="Mô tả chi tiết vấn đề hoặc phản hồi của bạn..."
                required
                value={form.message}
                onChange={handleChange('message')}
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-shadow focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 disabled:opacity-60"
              />
              <p className="mt-1.5 text-xs text-gray-400">
                Tối thiểu 10 ký tự. {form.message.length}/1000
              </p>
            </div>

            {/* Error */}
            {status === 'error' && (
              <div
                className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!isValid || status === 'loading'}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                backgroundColor: isValid && status !== 'loading' ? '#f97316' : '#d1d5db',
                boxShadow: isValid && status !== 'loading'
                  ? '0 2px 12px rgba(249,115,22,0.3)'
                  : 'none',
              }}
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Gửi phản hồi
                </>
              )}
            </button>
          </form>
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <div
            className="rounded-2xl border border-gray-100 bg-gray-50 p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Cam kết
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-800">2–5 ngày làm việc</p>
                  <p className="text-xs text-gray-400">Phản hồi qua email</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Không có live chat</p>
                  <p className="text-xs text-gray-400">Chỉ nhận phản hồi qua form này</p>
                </div>
              </div>
            </div>
          </div>

          <div
            className="rounded-2xl border border-gray-100 bg-gray-50 p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Trước khi gửi
            </p>
            <ul className="space-y-2">
              {[
                'Kiểm tra FAQ để xem câu hỏi đã được trả lời chưa.',
                'Báo lỗi — cung cấp URL hoặc ảnh chụp màn hình nếu có thể.',
                'Đề xuất tính năng — mô tả rõ use case thực tế của bạn.',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                  <span className="mt-1.5 h-1 w-1 rounded-full flex-shrink-0 bg-gray-300" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <Link
            href="/resources/hoi-dap-voucher-shopee"
            className="flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700"
          >
            Xem câu hỏi thường gặp
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </InfoPageLayout>
  );
}
