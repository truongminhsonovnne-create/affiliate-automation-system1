/**
 * AI Prompt Templates for Affiliate Content Generation
 *
 * Templates for rewriting Shopee product info into engaging
 * social media content for TikTok/Facebook.
 */

// ============================================
// Main Content Generation Prompt
// ============================================

/**
 * Main prompt for generating affiliate content
 */
export const CONTENT_GENERATION_PROMPT = `Bạn là chuyên gia marketing affiliate cho thị trường Việt Nam.
Nhiệm vụ của bạn là tạo nội dung review sản phẩm hấp dẫn cho TikTok và Facebook.

THÔNG TIN SẢN PHẨM:
- Tên sản phẩm: {title}
- Giá: {price} VND
- Mô tả: {description}
- Link: {productUrl}

YÊU CẦU:
1. Viết rewrittenTitle hấp dẫn, ngắn gọn (dưới 60 ký tự), có sức hút
2. Viết reviewContent tự nhiên, thuyết phục (80-150 từ), như đang chia sẻ với bạn bè
3. Viết socialCaption ngắn gọn, có sức hút (dưới 100 ký tự)
4. Tạo 5-8 hashtags phù hợp, có thể tìm kiếm

LƯU Ý QUAN TRỌNG:
- Văn phong tự nhiên, thân thiện, không quá formal
- Không bịa đặt thông tin sản phẩm không có
- Không dùng từ quá hyperbolic như "tuyệt vời nhất", "số 1 thế giới"
- Có thể đề cập giá "siêu hời", "giá tốt" nếu giá hợp lý
- CTA nhẹ nhàng: "xem ngay", "mua ngay", "check ngay"

Output JSON format:
{
  "rewrittenTitle": "...",
  "reviewContent": "...",
  "socialCaption": "...",
  "hashtags": ["...", "..."]
}`;

// ============================================
// Alternative Prompt - More Conversational
// ============================================

export const CONTENT_PROMPT_CONVERSATIONAL = `Bạn là một người dùng thực chia sẻ trải nghiệm sản phẩm trên TikTok/Facebook.

Sản phẩm: {title}
Giá: {price} VND
Mô tả: {description}

Viết nội dung theo phong cách:
- Giọng điệu tự nhiên, thân thiện
- Như đang nói chuyện với bạn bè
- Thật thà, không phóng đại
- Có thể mention giá nếu hợp lý

Viết JSON:
{
  "rewrittenTitle": "Tiêu đề hấp dẫn dưới 60 ký tự",
  "reviewContent": "Nội dung review 80-150 từ, tự nhiên như chat",
  "socialCaption": "Caption ngắn dưới 100 ký tự",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

// ============================================
// Short Caption Prompt (for quick posts)
// ============================================

export const SHORT_CAPTION_PROMPT = `Tạo caption ngắn cho sản phẩm:

Tên: {title}
Giá: {price} VND

Viết caption:
- Dưới 100 ký tự
- Có sức hút, tò mò
- Có thể include 1-2 hashtag phổ biến
- Phong cách TikTok/Việt Nam

JSON:
{
  "rewrittenTitle": "...",
  "socialCaption": "...",
  "hashtags": ["..."]
}`;

// ============================================
// Review Prompt (longer content)
// ============================================

export const REVIEW_PROMPT = `Viết review chi tiết cho sản phẩm:

Tên: {title}
Giá: {price} VND
Mô tả: {description}

Yêu cầu:
- Review 100-200 từ
- Giọng tự nhiên, có điểm mạnh và hạn chế
- Phù hợp đăng Facebook/TikTok
- CTA nhẹ ở cuối
- Không bịa đặt tính năng

JSON:
{
  "rewrittenTitle": "...",
  "reviewContent": "...",
  "socialCaption": "...",
  "hashtags": ["..."]
}`;

// ============================================
// Helper Functions
// ============================================

/**
 * Generate prompt with variables replaced
 */
export function generatePrompt(
  template: string,
  variables: {
    title: string;
    description?: string;
    price: number;
    productUrl: string;
  }
): string {
  return template
    .replace('{title}', variables.title)
    .replace('{description}', variables.description || 'Không có mô tả')
    .replace('{price}', variables.price.toLocaleString('vi-VN'))
    .replace('{productUrl}', variables.productUrl);
}

/**
 * Get prompt by type
 */
export function getPrompt(type: 'full' | 'short' | 'review' | 'conversational'): string {
  switch (type) {
    case 'full':
      return CONTENT_GENERATION_PROMPT;
    case 'short':
      return SHORT_CAPTION_PROMPT;
    case 'review':
      return REVIEW_PROMPT;
    case 'conversational':
      return CONTENT_PROMPT_CONVERSATIONAL;
    default:
      return CONTENT_GENERATION_PROMPT;
  }
}

// ============================================
// Export
// ============================================

export default {
  CONTENT_GENERATION_PROMPT,
  CONTENT_PROMPT_CONVERSATIONAL,
  SHORT_CAPTION_PROMPT,
  REVIEW_PROMPT,
  generatePrompt,
  getPrompt,
};
