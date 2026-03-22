/**
 * Gemini AI Service for Affiliate Content Generation
 *
 * Uses Google Gemini API to transform product data into
 * engaging marketing content for TikTok/Facebook.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { env } from '../config/env.js';
import { log } from '../utils/logger.js';

// ============================================
// Types & Interfaces
// ============================================

/**
 * Input for affiliate content generation
 */
export interface AffiliateContentInput {
  /** Product title */
  title: string;

  /** Product description */
  description?: string;

  /** Product price in VND */
  price: number;

  /** Product URL */
  productUrl: string;

  /** Optional: product rating (0-5) */
  rating?: number;

  /** Optional: number of reviews */
  reviewCount?: number;

  /** Optional: number of items sold */
  soldCount?: number;
}

/**
 * Generated affiliate content output
 */
export interface AffiliateContentOutput {
  /** AI-rewritten product title (engaging) */
  rewrittenTitle: string;

  /** Full review/recommendation content */
  reviewContent: string;

  /** Short caption for social media */
  socialCaption: string;

  /** Hashtags for social media */
  hashtags: string[];

  /** Optional: key selling points */
  highlights?: string[];

  /** Optional: target audience */
  targetAudience?: string;
}

/**
 * Service configuration
 */
export interface GeminiServiceConfig {
  /** Model name (from env) */
  modelName: string;

  /** Temperature for generation (0-1) */
  temperature: number;

  /** Max output tokens */
  maxTokens: number;
}

/**
 * Result of content generation
 */
export interface ContentGenerationResult {
  success: boolean;
  data?: AffiliateContentOutput;
  error?: string;
  retryCount?: number;
}

// ============================================
// Constants
// ============================================

const DEFAULT_CONFIG: GeminiServiceConfig = {
  modelName: env.GEMINI_MODEL || 'gemini-2.0-flash',
  temperature: 0.8, // Higher for more creative content
  maxTokens: 2048,
};

const MAX_RETRIES = 2;

// ============================================
// Prompt Templates
// ============================================

const CONTENT_GENERATION_PROMPT = `Bạn là chuyên gia marketing affiliate cho thị trường Việt Nam.
Nhiệm vụ của bạn là tạo nội dung review sản phẩm hấp dẫn cho TikTok và Facebook.

THÔNG TIN SẢN PHẨM:
- Tên sản phẩm: {title}
- Giá: {price} VND
- Mô tả: {description}
- Đánh giá: {rating}/5 ({reviewCount} đánh giá)
- Đã bán: {soldCount} sản phẩm

YÊU CẦU:
1. Viết title hấp dẫn, ngắn gọn (dưới 60 ký tự)
2. Viết nội dung review tự nhiên, không quá marketing (100-200 từ)
3. Viết caption ngắn cho social media (dưới 100 ký tự)
4. Tạo 5-8 hashtags phù hợp
5. Đưa ra 3-5 điểm nổi bật của sản phẩm
6. Thẹ nhêm CTA nhàng (mua ngay, xem chi tiết, etc.)

LƯU Ý:
- Văn phong tự nhiên, thân thiện
- Không bịa đặt thông tin không có
- Phù hợp với người Việt Nam
- Không spam, không quá hyperbolic

Output JSON format:
{
  "rewrittenTitle": "...",
  "reviewContent": "...",
  "socialCaption": "...",
  "hashtags": ["...", "..."],
  "highlights": ["...", "..."],
  "targetAudience": "..."
}`;

// ============================================
// Gemini Service Class
// ============================================

/**
 * Gemini AI Service
 */
export class GeminiService {
  private client: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getModel']>;
  private config: GeminiServiceConfig;

  constructor(config: Partial<GeminiServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize Gemini client
    this.client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    this.model = this.client.getGenerativeModel({
      model: this.config.modelName,
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens,
        topP: 0.95,
        topK: 40,
        responseMimeType: 'text/plain',
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });
  }

  /**
   * Generate affiliate content from product data
   */
  async generateAffiliateContent(
    input: AffiliateContentInput,
    retryCount: number = 0
  ): Promise<ContentGenerationResult> {
    const { title, description, price, productUrl, rating, reviewCount, soldCount } = input;

    // Build prompt with product info
    const prompt = CONTENT_GENERATION_PROMPT
      .replace('{title}', title)
      .replace('{price}', price.toLocaleString('vi-VN'))
      .replace('{description}', description || 'Không có mô tả')
      .replace('{rating}', rating?.toString() || 'Chưa có')
      .replace('{reviewCount}', reviewCount?.toString() || '0')
      .replace('{soldCount}', soldCount?.toLocaleString('vi-VN') || 'Chưa có');

    log.debug({ title: title.substring(0, 30), retryCount }, 'Generating affiliate content');

    try {
      // Generate content
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse JSON from response
      const parsed = this.parseContentResponse(text);

      if (!parsed) {
        // Parse failed, try retry
        if (retryCount < MAX_RETRIES) {
          log.warn({ retryCount }, 'Parse failed, retrying...');
          return this.generateAffiliateContent(input, retryCount + 1);
        }

        return {
          success: false,
          error: 'Failed to parse AI response after retries',
          retryCount,
        };
      }

      // Validate required fields
      if (!parsed.reviewContent || !parsed.socialCaption || !parsed.hashtags) {
        if (retryCount < MAX_RETRIES) {
          log.warn({ retryCount }, 'Invalid output structure, retrying...');
          return this.generateAffiliateContent(input, retryCount + 1);
        }

        return {
          success: false,
          error: 'Invalid output structure from AI',
          retryCount,
        };
      }

      return {
        success: true,
        data: parsed,
        retryCount,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Retry on error
      if (retryCount < MAX_RETRIES) {
        log.warn({ error: errorMessage, retryCount }, 'Generation error, retrying...');
        return this.generateAffiliateContent(input, retryCount + 1);
      }

      log.error({ error: errorMessage }, 'Content generation failed');
      return {
        success: false,
        error: errorMessage,
        retryCount,
      };
    }
  }

  /**
   * Generate content for multiple products (batch)
   */
  async generateBatchContent(
    inputs: AffiliateContentInput[]
  ): Promise<ContentGenerationResult[]> {
    const results: ContentGenerationResult[] = [];

    // Process sequentially to avoid rate limits
    for (const input of inputs) {
      const result = await this.generateAffiliateContent(input);
      results.push(result);

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return results;
  }

  /**
   * Parse AI response to extract JSON content
   */
  private parseContentResponse(text: string): AffiliateContentOutput | null {
    try {
      // Try to extract JSON from markdown code block
      let jsonStr = '';

      // Try markdown code block first
      const codeBlockMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1];
      } else {
        // Try raw JSON object
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
      }

      if (!jsonStr) {
        log.debug('No JSON found in response');
        return null;
      }

      // Parse JSON
      const parsed = JSON.parse(jsonStr);

      // Map and validate fields
      const output: AffiliateContentOutput = {
        rewrittenTitle: this.sanitizeString(parsed.rewrittenTitle || ''),
        reviewContent: this.sanitizeString(parsed.reviewContent || ''),
        socialCaption: this.sanitizeString(parsed.socialCaption || ''),
        hashtags: Array.isArray(parsed.hashtags)
          ? parsed.hashtags.map((h: unknown) => this.sanitizeString(String(h)))
          : [],
        highlights: Array.isArray(parsed.highlights)
          ? parsed.highlights.map((h: unknown) => this.sanitizeString(String(h)))
          : undefined,
        targetAudience: parsed.targetAudience
          ? this.sanitizeString(parsed.targetAudience)
          : undefined,
      };

      // Validate minimum content
      if (!output.reviewContent || output.reviewContent.length < 20) {
        return null;
      }

      return output;
    } catch (error) {
      log.debug({ error, text: text.substring(0, 200) }, 'Failed to parse content response');
      return null;
    }
  }

  /**
   * Sanitize string output
   */
  private sanitizeString(str: string): string {
    return str
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/\\n/g, ' ') // Replace newlines
      .replace(/\\t/g, ' ') // Replace tabs
      .trim();
  }

  /**
   * Test connection to Gemini API
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.model.generateContent('Hi');
      return result.response.text().length > 0;
    } catch (error) {
      log.error({ error }, 'Gemini connection test failed');
      return false;
    }
  }

  /**
   * Get service configuration
   */
  getConfig(): GeminiServiceConfig {
    return { ...this.config };
  }
}

// ============================================
// Singleton Instance
// ============================================

let geminiServiceInstance: GeminiService | null = null;

/**
 * Get GeminiService singleton instance
 */
export function getGeminiService(): GeminiService {
  if (!geminiServiceInstance) {
    geminiServiceInstance = new GeminiService();
  }
  return geminiServiceInstance;
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Generate affiliate content (convenience function)
 */
export async function generateAffiliateContent(
  input: AffiliateContentInput
): Promise<ContentGenerationResult> {
  const service = getGeminiService();
  return service.generateAffiliateContent(input);
}

/**
 * Generate batch affiliate content (convenience function)
 */
export async function generateBatchContent(
  inputs: AffiliateContentInput[]
): Promise<ContentGenerationResult[]> {
  const service = getGeminiService();
  return service.generateBatchContent(inputs);
}

// ============================================
// Export
// ============================================

export type {
  AffiliateContentInput,
  AffiliateContentOutput,
  GeminiServiceConfig,
  ContentGenerationResult,
};

