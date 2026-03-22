/**
 * AI Enrichment Pipeline - Prompts
 *
 * Production-grade prompt templates for Gemini API.
 */

import type {
  AffiliateAiContentType,
  AffiliateProductInput,
  PromptBuildResult,
} from './types.js';
import { PROMPT_CONFIG, CONTENT_QUALITY } from './constants.js';

/**
 * Build affiliate review prompt
 */
export function buildAffiliateReviewPrompt(
  product: AffiliateProductInput,
  options: {
    version?: string;
    locale?: string;
  } = {}
): PromptBuildResult {
  const version = options.version || PROMPT_CONFIG.CURRENT_AFFILIATE_REVIEW_VERSION;
  const locale = options.locale || 'vi';

  const systemInstruction = buildGeminiSystemInstruction({ locale, contentType: 'affiliate_review' });
  const userPrompt = buildUserPrompt(product, version, locale);

  return {
    systemInstruction,
    userPrompt,
    version: `affiliate_review_${version}`,
  };
}

/**
 * Build Gemini system instruction
 */
export function buildGeminiSystemInstruction(options: {
  locale?: string;
  contentType?: AffiliateAiContentType;
} = {}): string {
  const locale = options.locale || 'vi';
  const contentType = options.contentType || 'affiliate_review';

  if (contentType === 'affiliate_review') {
    return `Bạn là một chuyên gia viết nội dung affiliate marketing cho thương mại điện tử Việt Nam. Nhiệm vụ của bạn là viết nội dung review sản phẩm hấp dẫn, chân thực và có giá trị cho người đọc.

QUAN TRỌNG - Nghiêm ngặt về độ chính xác:
- Chỉ sử dụng THÔNG TIN ĐƯỢC CUNG CẤP từ sản phẩm
- KHÔNG được bịa đặt thông tin không có trong dữ liệu gốc
- KHÔNG được nói dối về tính năng sản phẩm
- Nếu không có thông tin về某 tính năng, hãy THỪA NHẬN điều đó

Giọng văn:
- Thân thiện, gần gũi
- Chuyên nghiệp nhưng không quá formal
- Tập trung vào lợi ích thực tế cho người dùng
- Có CTA nhẹ nhàng ở cuối

Yêu cầu output:
- Output phải là JSON hợp lệ
- Tuân thủ schema được chỉ định
- Không bọc trong markdown code block`;
  }

  if (contentType === 'affiliate_caption') {
    return `Bạn là chuyên gia viết caption marketing cho mạng xã hội Việt Nam. Nhiệm vụ: viết caption ngắn gọn, hấp dẫn, kích thích mua sắm.

Quan trọng:
- Chỉ dùng thông tin có trong dữ liệu sản phẩm
- Không bịa đặt tính năng
- Giọng văn tự nhiên, thu hút
- Có CTA rõ ràng

Output: JSON hợp lệ, không markdown`;
  }

  return `Bạn là chuyên gia nội dung affiliate. Viết nội dung chất lượng cao dựa trên thông tin sản phẩm được cung cấp.`;
}

/**
 * Build user prompt for review
 */
function buildUserPrompt(product: AffiliateProductInput, version: string, locale: string): string {
  const productInfo = formatProductInfo(product);

  if (version === 'v1') {
    return `Hãy viết nội dung review affiliate cho sản phẩm sau:

${productInfo}

Yêu cầu:
1. rewrittenTitle: Tiêu đề review hấp dẫn, kèm keyword chính, dưới 150 ký tự
2. reviewContent: Nội dung review đầy đủ (200-2000 ký tự), có cấu trúc:
   - Giới thiệu ngắn về sản phẩm
   - Điểm nổi bật/Ưu điểm
   - Nhược điểm (nếu có)
   - Đánh giá tổng kết
   - CTA nhẹ nhàng
3. socialCaption: Caption ngắn cho mạng xã hội (50-500 ký tự)
4. hashtags: 3-15 hashtags liên quan, không trùng lặp

Output JSON:
{
  "rewrittenTitle": "string",
  "reviewContent": "string",
  "socialCaption": "string",
  "hashtags": ["string"]
}

Chỉ trả về JSON, không thêm giải thích.`;
  }

  // Default to v1
  return buildUserPrompt(product, 'v1', locale);
}

/**
 * Format product information for prompt
 */
function formatProductInfo(product: AffiliateProductInput): string {
  const parts: string[] = [];

  parts.push(`Tên sản phẩm: ${product.title}`);

  if (product.description) {
    parts.push(`Mô tả: ${product.description}`);
  }

  if (product.shortDescription) {
    parts.push(`Mô tả ngắn: ${product.shortDescription}`);
  }

  if (product.priceVnd) {
    const priceStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.priceVnd);
    parts.push(`Giá: ${priceStr}`);

    if (product.originalPriceVnd && product.discountPercent) {
      const originalPriceStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.originalPriceVnd);
      parts.push(`Giá gốc: ${originalPriceStr}`);
      parts.push(`Giảm giá: ${product.discountPercent}%`);
    }
  }

  if (product.sellerName) {
    parts.push(`Người bán: ${product.sellerName}`);
  }

  if (product.rating && product.totalRatings) {
    parts.push(`Đánh giá: ${product.rating}/5 (${product.totalRatings} đánh giá)`);
  }

  if (product.soldCount) {
    parts.push(`Đã bán: ${product.soldCount}`);
  }

  if (product.categoryPath) {
    parts.push(`Danh mục: ${product.categoryPath}`);
  }

  parts.push(`Link: ${product.productUrl}`);

  return parts.join('\n');
}

/**
 * Get prompt version info
 */
export function getPromptVersion(
  contentType: AffiliateAiContentType,
  options?: {
    version?: string;
  }
): {
  version: string;
  description: string;
  contentType: AffiliateAiContentType;
} {
  const version = options?.version || getDefaultVersionForContentType(contentType);

  return {
    version,
    description: PROMPT_CONFIG.VERSION_DESCRIPTIONS[version] || 'Custom version',
    contentType,
  };
}

/**
 * Get default version for content type
 */
function getDefaultVersionForContentType(contentType: AffiliateAiContentType): string {
  switch (contentType) {
    case 'affiliate_review':
      return PROMPT_CONFIG.CURRENT_AFFILIATE_REVIEW_VERSION;
    case 'affiliate_caption':
      return PROMPT_CONFIG.CURRENT_AFFILIATE_CAPTION_VERSION;
    case 'affiliate_description':
      return PROMPT_CONFIG.DEFAULT_VERSION;
    default:
      return PROMPT_CONFIG.DEFAULT_VERSION;
  }
}

/**
 * Validate prompt version
 */
export function isValidPromptVersion(version: string): boolean {
  return PROMPT_CONFIG.SUPPORTED_VERSIONS.includes(version as typeof PROMPT_CONFIG.SUPPORTED_VERSIONS[number]);
}
