'use client';

/**
 * CreatePublishJobModal
 *
 * Full-screen slide-over (drawer) for creating a new publish job.
 * Invoked from the Publish Jobs page via the "Tạo Job" button.
 *
 * Flow:
 *  1. Admin fills in: platform, content type, channel, schedule, etc.
 *  2. Admin clicks "Tạo & Chạy ngay" or "Lên lịch"
 *  3. POST /api/admin/publish-jobs → control plane
 *  4. On success: close modal, refetch jobs table, show toast
 *  5. On error: show inline error message
 */

import { useState, useCallback } from 'react';
import { X, Send, Calendar, Zap, ChevronRight } from 'lucide-react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';

export interface CreatePublishJobPayload {
  platform: string;
  contentType?: string;
  sourceType?: string;
  productIds?: string;
  scheduledAt?: string | null;
  channel?: string;
  priority?: number;
  title?: string;
  description?: string;
}

export interface CreatePublishJobModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after job is created successfully — pass { createdJobId } or just void */
  onCreated?: (result: { jobId: string }) => void;
}

// ── Form state ──────────────────────────────────────────────────────────────

interface FormValues {
  platform: string;
  contentType: string;
  channel: string;
  sourceType: string;
  productIds: string;
  scheduleMode: 'immediate' | 'scheduled';
  scheduledDate: string;
  scheduledTime: string;
  priority: string;
  title: string;
  description: string;
}

const EMPTY_FORM: FormValues = {
  platform: '',
  contentType: '',
  channel: 'website',
  sourceType: '',
  productIds: '',
  scheduleMode: 'immediate',
  scheduledDate: '',
  scheduledTime: '',
  priority: '5',
  title: '',
  description: '',
};

// ── Options ───────────────────────────────────────────────────────────────────

const PLATFORM_OPTIONS = [
  { value: '', label: '— Chọn nền tảng —' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'lazada', label: 'Lazada' },
  { value: 'tiktok', label: 'TikTok Shop' },
  { value: 'tiki', label: 'Tiki' },
];

const CONTENT_TYPE_OPTIONS = [
  { value: '', label: '— Tự động (mặc định) —' },
  { value: 'deal', label: 'Deal / Khuyến mãi' },
  { value: 'voucher', label: 'Voucher' },
  { value: 'product', label: 'Sản phẩm' },
  { value: 'seo_article', label: 'Bài viết SEO' },
  { value: 'social', label: 'Social Media' },
];

const CHANNEL_OPTIONS = [
  { value: 'website', label: 'Website (trang chủ)' },
  { value: 'blog', label: 'Blog / Resources' },
  { value: 'tiktok', label: 'TikTok Shop' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'seo', label: 'SEO sitemap' },
  { value: 'email', label: 'Email campaign' },
];

const SOURCE_TYPE_OPTIONS = [
  { value: '', label: '— Tất cả nguồn —' },
  { value: 'masoffer', label: 'MasOffer' },
  { value: 'accesstrade', label: 'AccessTrade' },
  { value: 'crawl', label: 'Tự crawl' },
  { value: 'manual', label: 'Nhập tay' },
];

const PRIORITY_OPTIONS = [
  { value: '0', label: '0 — Thấp nhất' },
  { value: '3', label: '3 — Thấp' },
  { value: '5', label: '5 — Bình thường' },
  { value: '7', label: '7 — Cao' },
  { value: '10', label: '10 — Gấp' },
];

// ── Component ───────────────────────────────────────────────────────────────

export function CreatePublishJobModal({ open, onClose, onCreated }: CreatePublishJobModalProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [submitMode, setSubmitMode] = useState<'immediate' | 'schedule'>('immediate');
  const [error, setError] = useState<string | null>(null);
  const [successJobId, setSuccessJobId] = useState<string | null>(null);

  // Reset form when modal opens (values reset at open=true via key)
  const handleClose = useCallback(() => {
    setValues(EMPTY_FORM);
    setError(null);
    setSuccessJobId(null);
    setSubmitMode('immediate');
    onClose();
  }, [onClose]);

  const set = (field: keyof FormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    if (error) setError(null);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (mode: 'immediate' | 'schedule') => {
    setSubmitMode(mode);
    setError(null);

    // Validate required fields
    if (!values.platform) {
      setError('Vui lòng chọn nền tảng.');
      return;
    }
    if (mode === 'schedule') {
      if (!values.scheduledDate || !values.scheduledTime) {
        setError('Vui lòng chọn ngày và giờ để lên lịch.');
        return;
      }
    }

    // Build scheduledAt
    let scheduledAt: string | null = null;
    if (mode === 'schedule' && values.scheduledDate && values.scheduledTime) {
      const iso = new Date(`${values.scheduledDate}T${values.scheduledTime}:00`).toISOString();
      scheduledAt = iso;
    }

    const payload: CreatePublishJobPayload = {
      platform: values.platform,
      ...(values.contentType && { contentType: values.contentType }),
      ...(values.channel && { channel: values.channel }),
      ...(values.sourceType && { sourceType: values.sourceType }),
      ...(values.productIds && { productIds: values.productIds }),
      scheduledAt,
      priority: parseInt(values.priority, 10) || 5,
      ...(values.title && { title: values.title }),
      ...(values.description && { description: values.description }),
    };

    setLoading(true);

    try {
      const res = await fetch('/api/admin/publish-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json() as { data?: { id?: string; jobId?: string; job_id?: string }; error?: string; message?: string };

      if (!res.ok) {
        setError(json.error ?? json.message ?? `Lỗi không xác định (HTTP ${res.status})`);
        return;
      }

      const jobId = json.data?.id ?? json.data?.jobId ?? json.data?.job_id ?? '—';
      setSuccessJobId(jobId as string);

      // Auto-close after 2s, or let user close manually
      setTimeout(() => {
        handleClose();
        onCreated?.({ jobId: jobId as string });
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  const isSubmitting = loading;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={successJobId ? 'Tạo thành công!' : 'Tạo Publish Job'}
      description={
        successJobId
          ? `Job đã được tạo. ID: ${successJobId}`
          : 'Điền thông tin bên dưới để tạo một job đăng bài mới.'
      }
      size="xl"
      closeOnOverlay={!isSubmitting}
      showClose={!isSubmitting}
    >
      {/* ── Success state ───────────────────────────────────────────────── */}
      {successJobId ? (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 border border-green-100">
            <Send className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">Publish Job đã được tạo!</p>
            <p className="mt-1 text-sm text-gray-500">
              Job sẽ được xử lý trong vài phút. Kiểm tra trạng thái ở bảng bên dưới.
            </p>
          </div>
          <code className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md font-mono">
            Job ID: {successJobId}
          </code>
        </div>
      ) : (
        <>
          {/* ── Form ──────────────────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Platform (required) */}
            <Select
              label="Nền tảng *"
              options={PLATFORM_OPTIONS}
              value={values.platform}
              onChange={set('platform')}
              error={error && !values.platform ? 'Bắt buộc' : undefined}
            />

            {/* Content Type */}
            <Select
              label="Loại nội dung"
              options={CONTENT_TYPE_OPTIONS}
              value={values.contentType}
              onChange={set('contentType')}
              helperText="Để trống để hệ thống tự chọn loại phù hợp nhất."
            />

            {/* Channel */}
            <Select
              label="Kênh đăng bài"
              options={CHANNEL_OPTIONS}
              value={values.channel}
              onChange={set('channel')}
            />

            {/* Title override */}
            <Input
              label="Tiêu đề job (tùy chọn)"
              placeholder="VD: [DEAL] Giảm giá Shopee cuối tuần"
              value={values.title}
              onChange={set('title')}
              helperText="Để trống để dùng tiêu đề mặc định."
            />

            {/* Description */}
            <Textarea
              label="Mô tả / Ghi chú (tùy chọn)"
              placeholder="VD: Deal thuộc chương trình khuyến mãi 3.3..."
              value={values.description}
              onChange={set('description')}
              rows={2}
            />

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Source Type */}
            <Select
              label="Nguồn sản phẩm"
              options={SOURCE_TYPE_OPTIONS}
              value={values.sourceType}
              onChange={set('sourceType')}
              helperText="Lọc sản phẩm theo nguồn. Để trống để lấy tất cả."
            />

            {/* Product IDs override */}
            <Input
              label="IDs sản phẩm cụ thể (tùy chọn)"
              placeholder="id1, id2, id3  hoặc để trống lấy tất cả"
              value={values.productIds}
              onChange={set('productIds')}
              helperText="Cách nhau bằng dấu phẩy. Để trống để lấy tất cả sản phẩm thuộc nền tảng đã chọn."
            />

            {/* Priority */}
            <Select
              label="Độ ưu tiên"
              options={PRIORITY_OPTIONS}
              value={values.priority}
              onChange={set('priority')}
            />

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Schedule mode */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Thời điểm chạy</p>

              <div className="flex gap-3">
                {/* Immediate */}
                <label
                  className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    values.scheduleMode === 'immediate'
                      ? 'border-brand-400 bg-brand-50 ring-1 ring-brand-300'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="scheduleMode"
                    value="immediate"
                    checked={values.scheduleMode === 'immediate'}
                    onChange={() => setValues((v) => ({ ...v, scheduleMode: 'immediate' }))}
                    className="sr-only"
                  />
                  <Zap
                    className={`h-4 w-4 flex-shrink-0 ${
                      values.scheduleMode === 'immediate' ? 'text-brand-500' : 'text-gray-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${values.scheduleMode === 'immediate' ? 'text-brand-700' : 'text-gray-700'}`}>
                      Chạy ngay
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Xử lý trong vài phút tới</p>
                  </div>
                  {values.scheduleMode === 'immediate' && (
                    <ChevronRight className="h-4 w-4 text-brand-400 ml-auto flex-shrink-0" />
                  )}
                </label>

                {/* Scheduled */}
                <label
                  className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    values.scheduleMode === 'scheduled'
                      ? 'border-brand-400 bg-brand-50 ring-1 ring-brand-300'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="scheduleMode"
                    value="scheduled"
                    checked={values.scheduleMode === 'scheduled'}
                    onChange={() => setValues((v) => ({ ...v, scheduleMode: 'scheduled' }))}
                    className="sr-only"
                  />
                  <Calendar
                    className={`h-4 w-4 flex-shrink-0 ${
                      values.scheduleMode === 'scheduled' ? 'text-brand-500' : 'text-gray-400'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${values.scheduleMode === 'scheduled' ? 'text-brand-700' : 'text-gray-700'}`}>
                      Lên lịch
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Chạy vào thời điểm chỉ định</p>
                  </div>
                  {values.scheduleMode === 'scheduled' && (
                    <ChevronRight className="h-4 w-4 text-brand-400 ml-auto flex-shrink-0" />
                  )}
                </label>
              </div>

              {/* Date + Time pickers (only when scheduled) */}
              {values.scheduleMode === 'scheduled' && (
                <div className="grid grid-cols-2 gap-3 animate-slide-up">
                  <Input
                    type="date"
                    label="Ngày"
                    value={values.scheduledDate}
                    onChange={set('scheduledDate')}
                    min={new Date().toISOString().split('T')[0]}
                    error={
                      submitMode === 'schedule' && !values.scheduledDate
                        ? 'Bắt buộc'
                        : undefined
                    }
                  />
                  <Input
                    type="time"
                    label="Giờ"
                    value={values.scheduledTime}
                    onChange={set('scheduledTime')}
                    error={
                      submitMode === 'schedule' && !values.scheduledTime
                        ? 'Bắt buộc'
                        : undefined
                    }
                  />
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>

          {/* ── Footer ──────────────────────────────────────────────────────── */}
          <ModalFooter className="mt-6">
            <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
              Hủy
            </Button>

            {values.scheduleMode === 'scheduled' ? (
              <Button
                variant="primary"
                icon={<Calendar className="h-4 w-4" />}
                iconPosition="left"
                loading={isSubmitting && submitMode === 'schedule'}
                onClick={() => handleSubmit('schedule')}
              >
                Lên lịch job
              </Button>
            ) : (
              <Button
                variant="primary"
                icon={<Zap className="h-4 w-4" />}
                iconPosition="left"
                loading={isSubmitting && submitMode === 'immediate'}
                onClick={() => handleSubmit('immediate')}
              >
                Tạo &amp; chạy ngay
              </Button>
            )}
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

export default CreatePublishJobModal;
