import { z } from 'zod';

// AI Analysis Request
export const AIAnalysisRequestSchema = z.object({
  products: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      price: z.number(),
      rating: z.number().optional(),
      reviewCount: z.number().optional(),
      soldCount: z.number().optional(),
      category: z.string().optional(),
      images: z.array(z.string()),
    })
  ),
  context: z
    .object({
      targetAudience: z.string().optional(),
      niche: z.string().optional(),
      minConfidence: z.number().min(0).max(1).default(0.7),
    })
    .optional(),
});

export type AIAnalysisRequest = z.infer<typeof AIAnalysisRequestSchema>;

// AI Analysis Result
export const AIAnalysisResultSchema = z.object({
  externalId: z.string(),
  summary: z.string(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  targetAudience: z.string(),
  confidenceScore: z.number().min(0).max(1),
  trendingScore: z.number().min(0).max(1),
  recommendation: z.enum([
    'highly_recommended',
    'recommended',
    'neutral',
    'not_recommended',
  ]),
  keywords: z.array(z.string()),
  reasoning: z.string(),
});

export type AIAnalysisResult = z.infer<typeof AIAnalysisResultSchema>;

// Batch AI Analysis Response
export const BatchAIAnalysisResponseSchema = z.object({
  results: z.array(AIAnalysisResultSchema),
  totalAnalyzed: z.number(),
  successCount: z.number(),
  failureCount: z.number(),
  errors: z.array(
    z.object({
      externalId: z.string(),
      error: z.string(),
    })
  ),
});

export type BatchAIAnalysisResponse = z.infer<
  typeof BatchAIAnalysisResponseSchema
>;

// AI Service Config
export interface AIConfig {
  modelName: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
}

// Gemini specific types
export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface GeminiGenerateContentRequest {
  contents: GeminiMessage[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

// AI Prompt Templates
export const AI_PROMPTS = {
  PRODUCT_ANALYSIS: `Bạn là chuyên gia phân tích sản phẩm affiliate. Hãy phân tích sản phẩm sau và đưa ra đánh giá chi tiết.

Sản phẩm:
- Tên: {title}
- Giá: {price} VND
- Đánh giá: {rating}/5 ({reviewCount} đánh giá)
- Đã bán: {soldCount} sản phẩm
- Danh mục: {category}
- Hình ảnh: {images}

Hãy phân tích và trả về JSON với các trường:
- summary: Tóm tắt ngắn về sản phẩm (50-100 từ)
- pros: Array các điểm mạnh (3-5 điểm)
- cons: Array các điểm yếu (2-3 điểm)
- targetAudience: Đối tượng khách hàng phù hợp
- confidenceScore: Điểm tin cậy (0-1)
- trendingScore: Điểm xu hướng (0-1)
- recommendation: recommend/ neutral/ not_recommended
- keywords: Array từ khóa liên quan`,

  BATCH_ANALYSIS: `Bạn là chuyên gia phân tích sản phẩm affiliate. Hãy phân tích danh sách sản phẩm sau và đưa ra đánh giá cho từng sản phẩm.

Danh sách sản phẩm:
{products}

Với mỗi sản phẩm, hãy trả về JSON array với các trường:
- externalId: ID của sản phẩm
- summary: Tóm tắt ngắn (50-100 từ)
- pros: Array các điểm mạnh (3-5 điểm)
- cons: Array các điểm yếu (2-3 điểm)
- targetAudience: Đối tượng khách hàng phù hợp
- confidenceScore: Điểm tin cậy (0-1)
- trendingScore: Điểm xu hướng (0-1)
- recommendation: highly_recommended/ recommended/ neutral/ not_recommended
- keywords: Array từ khóa liên quan`,
} as const;
