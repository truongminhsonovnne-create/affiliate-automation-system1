'use client';

/**
 * BlogPostEditor — Full-featured blog post editor modal
 *
 * Features:
 *  - Rich title input
 *  - Rich HTML content textarea (supports basic HTML/Markdown)
 *  - Image upload with drag & drop, preview
 *  - Category selection
 *  - Keyword tags
 *  - Draft / Publish toggle
 *  - Auto slug generation
 *  - Word count, read time estimation
 *  - Image prompt generator (optional)
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import NextImage from 'next/image';
import {
  X,
  Upload,
  Image as ImageIcon,
  Tag,
  AlignLeft,
  FileText,
  Save,
  Globe,
  Eye,
  Loader,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Trash2,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import {
  createBlogPost,
  updateBlogPost,
  uploadBlogImage,
  formatBlogContent,
} from '@/lib/api/blogApi';
import type {
  BlogPostRecord,
  CreateBlogPostPayload,
  UpdateBlogPostPayload,
} from '@/lib/types/api';

// ── Types ───────────────────────────────────────────────────────────────────

interface BlogPostEditorProps {
  open: boolean;
  post: BlogPostRecord | null; // null = create new
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  title: string;
  content: string;
  category: string;
  keywords: string;
  featured_image_url: string;
  featured_image_prompt: string;
  status: string;
  publishNow: boolean;
}

const EMPTY_FORM: FormState = {
  title: '',
  content: '',
  category: 'voucher',
  keywords: '',
  featured_image_url: '',
  featured_image_prompt: '',
  status: 'draft',
  publishNow: false,
};

// ── Constants ────────────────────────────────────────────────────────────────

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
- Kết thúc bằng phần Kết luận`;

// ── Options ─────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: 'voucher',     label: 'Voucher / Khuyến mãi' },
  { value: 'review',       label: 'Review / Đánh giá' },
  { value: 'huong-dan',   label: 'Hướng dẫn' },
  { value: 'tin-tuc',     label: 'Tin tức' },
  { value: 'meo-vat',     label: 'Mẹo vặt' },
  { value: 'so-sanh',     label: 'So sánh' },
];

const STATUS_OPTIONS = [
  { value: 'draft',     label: 'Lưu nháp' },
  { value: 'published', label: 'Đã đăng' },
  { value: 'archived',  label: 'Lưu trữ' },
];

// ── Client-side image compression helper (no npm package needed) ──────────────────

/**
 * Compress an image file using Canvas API and return a compressed Blob.
 * Falls back to original file if compression fails.
 */
async function compressImageWithCanvas(
  file: File,
  maxDim: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve) => {
    const imgEl = new Image();
    imgEl.onload = () => {
      // Scale down to maxDim while preserving aspect ratio
      let { width, height } = imgEl;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }

      ctx.drawImage(imgEl, 0, 0, width, height);

      // Try WebP first (smaller), fallback to JPEG
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(blob);
          } else {
            // JPEG fallback if WebP didn't help
            canvas.toBlob(
              (jpegBlob) => resolve(jpegBlob ?? file),
              'image/jpeg',
              0.85
            );
          }
        },
        'image/webp',
        quality
      );
    };
    imgEl.onerror = () => resolve(file);
    imgEl.src = URL.createObjectURL(file);
  });
}

// ── Component ───────────────────────────────────────────────────────────────

export function BlogPostEditor({ open, post, onClose, onSaved }: BlogPostEditorProps) {
  const isEditing = !!post;

  // ── Form state ───────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // ── Image upload state ──────────────────────────────────────────────────
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // ── Submit state ────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ── AI format state ─────────────────────────────────────────────────────
  const [formatting, setFormatting] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [formatSuccess, setFormatSuccess] = useState(false);
  const [formatInstruction, setFormatInstruction] = useState(DEFAULT_FORMAT_INSTRUCTION);

  // ── Populate form when editing ─────────────────────────────────────────
  useEffect(() => {
    if (open) {
      if (post) {
        setForm({
          title: post.title,
          content: post.content,
          category: post.category ?? 'voucher',
          keywords: (post.keywords ?? []).join(', '),
          featured_image_url: post.featured_image_url ?? '',
          featured_image_prompt: post.featured_image_prompt ?? '',
          status: post.status,
          publishNow: post.status === 'published',
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setErrors({});
      setSubmitError(null);
      setSuccess(false);
      setImageUploadError(null);
      setFormatError(null);
      setFormatSuccess(false);
      setFormatInstruction(DEFAULT_FORMAT_INSTRUCTION);
    }
  }, [open, post]);

  // ── Field helpers ───────────────────────────────────────────────────────
  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((err) => ({ ...err, [field]: undefined }));
    if (submitError) setSubmitError(null);
  };

  const setStatus = (value: string) => {
    setForm((f) => ({
      ...f,
      status: value,
      publishNow: value === 'published',
    }));
    if (errors.status) setErrors((err) => ({ ...err, status: undefined }));
  };

  // ── Word count & read time ─────────────────────────────────────────────
  const wordCount = form.content.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.round(wordCount / 200));

  // ── Image upload handlers ───────────────────────────────────────────────
  const handleUploadImage = useCallback(async (file: File) => {
    setImageUploadError(null);
    setUploadingImage(true);

    try {
      // Compress image using Canvas API (no npm package needed)
      const compressed = await compressImageWithCanvas(file, 1920, 2);

      // Use original filename with .webp extension for smaller size
      const originalName = file.name.replace(/\.[^.]+$/, '');
      const outputFileName = `${originalName}.webp`;
      const outputFile = new File([compressed], outputFileName, { type: 'image/webp' });

      const result = await uploadBlogImage(outputFile);
      setForm((f) => ({ ...f, featured_image_url: result.url }));
    } catch (err) {
      setImageUploadError(err instanceof Error ? err.message : 'Upload thất bại');
    } finally {
      setUploadingImage(false);
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUploadImage(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleUploadImage(file);
    } else {
      setImageUploadError('Vui lòng kéo thả file ảnh (JPEG, PNG, WebP, GIF)');
    }
  };

  const handleRemoveImage = () => {
    setForm((f) => ({ ...f, featured_image_url: '' }));
  };

  // ── AI content format ───────────────────────────────────────────────────
  const handleFormatContent = async () => {
    setFormatError(null);
    setFormatting(true);

    try {
      const result = await formatBlogContent({
        content: form.content,
        instruction: formatInstruction.trim() || DEFAULT_FORMAT_INSTRUCTION,
      });

      // Replace content in editor with formatted result
      setForm((f) => ({ ...f, content: result.formatted }));
      setFormatInstruction(DEFAULT_FORMAT_INSTRUCTION);
      setFormatSuccess(true);
      setTimeout(() => setFormatSuccess(false), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi định dạng nội dung';
      setFormatError(msg);
    } finally {
      setFormatting(false);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (mode: 'draft' | 'publish') => {
    // Validate
    const newErrors: Partial<Record<keyof FormState, string>> = {};

    if (!form.title.trim() || form.title.trim().length < 5) {
      newErrors.title = 'Tiêu đề phải có ít nhất 5 ký tự';
    }
    if (!form.content.trim() || form.content.trim().length < 50) {
      newErrors.content = 'Nội dung phải có ít nhất 50 ký tự';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    // Map 'publish' → 'published' for DB compatibility
    const effectiveStatus = mode === 'publish' ? 'published' : mode;
    const publishNow = mode === 'publish';

    try {
      const payload: CreateBlogPostPayload | UpdateBlogPostPayload = {
        ...(isEditing ? { id: post!.id } : {}),
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        keywords: form.keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        featured_image_url: form.featured_image_url || null,
        featured_image_prompt: form.featured_image_prompt || null,
        status: effectiveStatus as any,
        publishNow,
      };

      if (isEditing) {
        await updateBlogPost(payload as UpdateBlogPostPayload);
      } else {
        await createBlogPost(payload as CreateBlogPostPayload);
      }

      setSuccess(true);
      setTimeout(() => {
        onSaved();
      }, 1200);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Close handler ─────────────────────────────────────────────────────
  const handleClose = () => {
    if (!submitting) onClose();
  };

  // ── Render ─────────────────────────────────────────────────────────────
  const isSaving = submitting;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={success ? 'Thành công!' : isEditing ? 'Sửa bài viết' : 'Viết bài mới'}
      description={
        success
          ? isEditing ? 'Bài viết đã được cập nhật!' : 'Bài viết đã được đăng!'
          : isEditing
          ? `Chỉnh sửa bài: ${post?.title}`
          : 'Điền thông tin bên dưới để tạo bài viết blog mới.'
      }
      size="xl"
      closeOnOverlay={!isSaving}
      showClose={!isSaving}
    >
      {/* ── Success state ───────────────────────────────────────────────── */}
      {success ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 border border-green-100">
            <CheckCircle2 className="h-7 w-7 text-green-500" />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">
              {isEditing ? 'Bài viết đã được cập nhật!' : 'Bài viết đã được lưu!'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {form.publishNow
                ? 'Bài viết đã được đăng công khai trên website.'
                : 'Bài viết đã được lưu dưới dạng nháp.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2">

            {/* ── Featured Image ──────────────────────────────────────────── */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-gray-400" />
                Ảnh cover bài viết
              </label>

              {form.featured_image_url ? (
                /* Image preview */
                <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                  <NextImage
                    src={form.featured_image_url}
                    alt="Cover"
                    width={800}
                    height={300}
                    className="w-full object-cover"
                    style={{ height: 200 }}
                    unoptimized
                  />
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    {form.featured_image_url && (
                      <a
                        href={form.featured_image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-white/90 rounded-md hover:bg-white text-gray-600 transition-colors"
                        title="Xem ảnh gốc"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      onClick={handleRemoveImage}
                      className="p-1.5 bg-white/90 rounded-md hover:bg-white text-red-500 transition-colors"
                      title="Xóa ảnh"
                      disabled={isSaving}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Drop zone */
                <div
                  ref={dropZoneRef}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-brand-400', 'bg-brand-50'); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove('border-brand-400', 'bg-brand-50'); }}
                  onDrop={handleDrop}
                  onClick={() => !isSaving && fileInputRef.current?.click()}
                  className={`
                    relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer
                    transition-all duration-150 min-h-[140px]
                    ${imageUploadError
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200 bg-gray-50 hover:border-brand-300 hover:bg-brand-50'}
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleFileInputChange}
                    disabled={isSaving}
                  />

                  {uploadingImage ? (
                    <>
                      <Loader className="h-8 w-8 text-brand-500 animate-spin" />
                      <p className="text-sm text-gray-500">Đang upload ảnh...</p>
                    </>
                  ) : (
                    <>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm">
                        <Upload className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700">
                          Kéo thả ảnh hoặc <span className="text-brand-600 underline">chọn file</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          JPEG, PNG, WebP, GIF · Tối đa 10MB · Khuyến nghị 800×400px
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {imageUploadError && (
                <div className="flex items-center gap-2 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  {imageUploadError}
                </div>
              )}

              {/* Image URL override */}
              <input
                type="url"
                placeholder="Hoặc dán URL ảnh từ bên ngoài..."
                value={form.featured_image_url}
                onChange={(e) => {
                  setForm((f) => ({ ...f, featured_image_url: e.target.value }));
                  setImageUploadError(null);
                }}
                disabled={isSaving}
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 disabled:opacity-50"
              />
            </div>

            {/* ── Title ──────────────────────────────────────────────────── */}
            <Input
              label="Tiêu đề bài viết *"
              placeholder="VD: Cách săn mã giảm giá Shopee hiệu quả nhất 2026"
              value={form.title}
              onChange={set('title')}
              error={errors.title}
              disabled={isSaving}
              helperText={`${form.title.length}/80 ký tự · auto-slug: ${form.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 40) || '...'}`}
            />

            {/* ── Category + Status row ──────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Danh mục"
                options={CATEGORY_OPTIONS}
                value={form.category}
                onChange={set('category')}
                disabled={isSaving}
              />
              <Select
                label="Trạng thái"
                options={STATUS_OPTIONS}
                value={form.status}
                onChange={(e) => setStatus((e.target as HTMLSelectElement).value)}
                disabled={isSaving}
              />
            </div>

            {/* ── Keywords ─────────────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-gray-400" />
                Từ khóa SEO
              </label>
              <input
                type="text"
                placeholder="mã giảm giá, Shopee, tiết kiệm, voucher..."
                value={form.keywords}
                onChange={set('keywords')}
                disabled={isSaving}
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 disabled:opacity-50"
              />
              <p className="text-xs text-gray-400">
                Cách nhau bằng dấu phẩy. VD: mã giảm giá, Shopee, tiết kiệm
              </p>
            </div>

            {/* ── Content ─────────────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <AlignLeft className="h-4 w-4 text-gray-400" />
                  Nội dung bài viết *
                </label>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{wordCount.toLocaleString()} từ</span>
                  <span>·</span>
                  <span>~{readTime} phút đọc</span>
                </div>
              </div>

              <textarea
                placeholder={`Viết nội dung bài viết ở đây...

Bạn có thể dùng HTML đơn giản:
<b>chữ đậm</b>
<i>chữ nghiêng</i>

<h3>Tiêu đề mục</h3>

<ul>
  <li>Mục 1</li>
  <li>Mục 2</li>
</ul>

<p>Đoạn văn...</p>`}
                value={form.content}
                onChange={set('content')}
                rows={18}
                disabled={isSaving}
                className={`
                  w-full px-3 py-2.5 text-sm border rounded-md bg-white
                  placeholder:text-gray-400 resize-y
                  focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400
                  disabled:opacity-50
                  ${errors.content ? 'border-red-300' : 'border-gray-200'}
                `}
              />
              {errors.content && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.content}
                </p>
              )}
              <p className="text-xs text-gray-400">
                Hỗ trợ HTML cơ bản. Giữ nội dung có cấu trúc: tiêu đề, danh sách, đoạn văn.
              </p>
            </div>

            {/* ── AI Content Formatting ─────────────────────────────────────── */}
            <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-brand-500" />
                Làm đẹp nội dung bằng AI
              </label>

              <textarea
                value={formatInstruction}
                onChange={(e) => setFormatInstruction(e.target.value)}
                rows={2}
                disabled={formatting || isSaving}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white resize-none focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 disabled:opacity-50"
              />

              {formatError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs text-red-700">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <span>{formatError}</span>
                </div>
              )}

              {formatSuccess && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-md px-3 py-2 text-xs text-green-700">
                  <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Nội dung đã được định dạng. Bấm <strong>Cập nhật</strong> để lưu.</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                  loading={formatting}
                  disabled={formatting || isSaving || !form.content.trim()}
                  onClick={handleFormatContent}
                >
                  Làm đẹp nội dung bằng AI
                </Button>

                <button
                  type="button"
                  onClick={() => setFormatInstruction(DEFAULT_FORMAT_INSTRUCTION)}
                  disabled={formatting || isSaving}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                  title="Khôi phục prompt mặc định"
                >
                  <RotateCcw className="h-3 w-3" />
                  Khôi phục mặc định
                </button>
              </div>

              <p className="text-xs text-gray-400">
                AI định dạng lại nội dung: tách heading hợp lý, chia đoạn ngắn, chuyển sang HTML sạch. Không dùng chung với prompt tạo ảnh cover.
              </p>
            </div>

            {/* ── Image Prompt (optional) ─────────────────────────────────── */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Prompt tạo ảnh AI (tùy chọn)
              </label>
              <textarea
                placeholder="VD: A clean, modern flat-lay photo of a smartphone showing a discount coupon on the screen, soft pastel background, professional photography style..."
                value={form.featured_image_prompt}
                onChange={set('featured_image_prompt')}
                rows={2}
                disabled={isSaving}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 disabled:opacity-50"
              />
              <p className="text-xs text-gray-400">
                Dùng để tạo ảnh cover bằng AI (nếu hệ thống có tích hợp AI image generator).
              </p>
            </div>

            {/* ── Error message ───────────────────────────────────────────── */}
            {submitError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Lỗi khi lưu bài viết</p>
                  <p className="mt-0.5 text-red-500">{submitError}</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ──────────────────────────────────────────────────────── */}
          <ModalFooter className="mt-5">
            <Button variant="secondary" onClick={handleClose} disabled={isSaving}>
              Hủy
            </Button>

            {/* Save as Draft */}
            <Button
              variant="secondary"
              icon={<Save className="h-4 w-4" />}
              loading={isSaving && form.status !== 'published'}
              disabled={isSaving}
              onClick={() => handleSubmit('draft')}
            >
              Lưu nháp
            </Button>

            {/* Publish / Save */}
            <Button
              variant="primary"
              icon={form.status === 'published' ? <CheckCircle2 className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
              loading={isSaving && form.status === 'published'}
              disabled={isSaving}
              onClick={() => handleSubmit('publish')}
            >
              {form.status === 'published' ? 'Cập nhật' : 'Đăng bài'}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

export default BlogPostEditor;
