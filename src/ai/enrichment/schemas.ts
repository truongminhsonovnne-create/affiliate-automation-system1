/**
 * AI Enrichment Pipeline - Schemas
 *
 * Zod schemas for AI output validation.
 */

import { z } from 'zod';
import { CONTENT_QUALITY } from './constants.js';
import type { AffiliateContentOutput, AiContentValidationResult } from './types.js';

// ============================================
// Content Output Schema
// ============================================

/**
 * Affiliate content output schema
 */
export const affiliateContentOutputSchema = z.object({
  rewrittenTitle: z
    .string()
    .min(CONTENT_QUALITY.MIN_TITLE_LENGTH, `Title must be at least ${CONTENT_QUALITY.MIN_TITLE_LENGTH} characters`)
    .max(CONTENT_QUALITY.MAX_TITLE_LENGTH, `Title must not exceed ${CONTENT_QUALITY.MAX_TITLE_LENGTH} characters`),

  reviewContent: z
    .string()
    .min(CONTENT_QUALITY.MIN_REVIEW_LENGTH, `Review must be at least ${CONTENT_QUALITY.MIN_REVIEW_LENGTH} characters`)
    .max(CONTENT_QUALITY.MAX_REVIEW_LENGTH, `Review must not exceed ${CONTENT_QUALITY.MAX_REVIEW_LENGTH} characters`),

  socialCaption: z
    .string()
    .min(CONTENT_QUALITY.MIN_CAPTION_LENGTH, `Caption must be at least ${CONTENT_QUALITY.MIN_CAPTION_LENGTH} characters`)
    .max(CONTENT_QUALITY.MAX_CAPTION_LENGTH, `Caption must not exceed ${CONTENT_QUALITY.MAX_CAPTION_LENGTH} characters`),

  hashtags: z
    .array(z.string())
    .min(CONTENT_QUALITY.MIN_HASHTAGS, `At least ${CONTENT_QUALITY.MIN_HASHTAGS} hashtags required`)
    .max(CONTENT_QUALITY.MAX_HASHTAGS, `Maximum ${CONTENT_QUALITY.MAX_HASHTAGS} hashtags allowed`)
    .refine(
      (hashtags) => {
        // Check all start with # or contain alphanumeric
        return hashtags.every(h => h.length > 0 && /^[a-zA-Z0-9_]+$/.test(h.replace(/^#/, '')));
      },
      { message: 'All hashtags must be valid (alphanumeric and underscores only)' }
    )
    .refine(
      (hashtags) => {
        // Check for duplicates
        const normalized = hashtags.map(h => h.toLowerCase().replace(/^#/, ''));
        return new Set(normalized).size === normalized.length;
      },
      { message: 'Hashtags must not contain duplicates' }
    ),
});

/**
 * Type from schema
 */
export type AffiliateContentOutputZod = z.infer<typeof affiliateContentOutputSchema>;

// ============================================
// Validation Functions
// ============================================

/**
 * Validate affiliate content output
 */
export function validateAffiliateContentOutput(data: unknown): AiContentValidationResult {
  try {
    const result = affiliateContentOutputSchema.safeParse(data);

    if (result.success) {
      return {
        ok: true,
        data: result.data,
        errors: [],
      };
    }

    // Format errors
    const errors = result.error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));

    return {
      ok: false,
      data: undefined,
      errors,
    };
  } catch (error) {
    return {
      ok: false,
      data: undefined,
      errors: [
        {
          path: 'unknown',
          message: error instanceof Error ? error.message : 'Unknown validation error',
        },
      ],
    };
  }
}

/**
 * Safe parse affiliate content output with raw data handling
 */
export function safeParseAffiliateContentOutput(
  raw: string
): {
  ok: boolean;
  data?: AffiliateContentOutput;
  error?: string;
} {
  try {
    // First try direct parse
    const parsed = JSON.parse(raw);
    return validateAffiliateContentOutput(parsed);
  } catch {
    return {
      ok: false,
      error: 'Failed to parse JSON',
    };
  }
}

// ============================================
// Partial Validation for Quality Gate
// ============================================

/**
 * Validate just title
 */
export function validateTitle(title: string): {
  ok: boolean;
  message?: string;
} {
  if (!title || title.trim().length === 0) {
    return { ok: false, message: 'Title is empty' };
  }

  if (title.length < CONTENT_QUALITY.MIN_TITLE_LENGTH) {
    return { ok: false, message: `Title too short (min ${CONTENT_QUALITY.MIN_TITLE_LENGTH} chars)` };
  }

  if (title.length > CONTENT_QUALITY.MAX_TITLE_LENGTH) {
    return { ok: false, message: `Title too long (max ${CONTENT_QUALITY.MAX_TITLE_LENGTH} chars)` };
  }

  // Check for generic titles
  const genericPatterns = ['sản phẩm', 'product', 'item', 'hàng hóa', 'đồ'];
  const isGeneric = genericPatterns.every(p => !title.toLowerCase().includes(p));

  return { ok: true };
}

/**
 * Validate review content
 */
export function validateReviewContent(content: string): {
  ok: boolean;
  message?: string;
} {
  if (!content || content.trim().length === 0) {
    return { ok: false, message: 'Review content is empty' };
  }

  if (content.length < CONTENT_QUALITY.MIN_REVIEW_LENGTH) {
    return { ok: false, message: `Review too short (min ${CONTENT_QUALITY.MIN_REVIEW_LENGTH} chars)` };
  }

  if (content.length > CONTENT_QUALITY.MAX_REVIEW_LENGTH) {
    return { ok: false, message: `Review too long (max ${CONTENT_QUALITY.MAX_REVIEW_LENGTH} chars)` };
  }

  return { ok: true };
}

/**
 * Validate social caption
 */
export function validateSocialCaption(caption: string): {
  ok: boolean;
  message?: string;
} {
  if (!caption || caption.trim().length === 0) {
    return { ok: false, message: 'Caption is empty' };
  }

  if (caption.length < CONTENT_QUALITY.MIN_CAPTION_LENGTH) {
    return { ok: false, message: `Caption too short (min ${CONTENT_QUALITY.MIN_CAPTION_LENGTH} chars)` };
  }

  if (caption.length > CONTENT_QUALITY.MAX_CAPTION_LENGTH) {
    return { ok: false, message: `Caption too long (max ${CONTENT_QUALITY.MAX_CAPTION_LENGTH} chars)` };
  }

  return { ok: true };
}

/**
 * Validate hashtags
 */
export function validateHashtags(hashtags: unknown): {
  ok: boolean;
  message?: string;
} {
  if (!Array.isArray(hashtags)) {
    return { ok: false, message: 'Hashtags must be an array' };
  }

  if (hashtags.length < CONTENT_QUALITY.MIN_HASHTAGS) {
    return { ok: false, message: `Too few hashtags (min ${CONTENT_QUALITY.MIN_HASHTAGS})` };
  }

  if (hashtags.length > CONTENT_QUALITY.MAX_HASHTAGS) {
    return { ok: false, message: `Too many hashtags (max ${CONTENT_QUALITY.MAX_HASHTAGS})` };
  }

  // Check for empty or invalid hashtags
  for (const tag of hashtags) {
    if (typeof tag !== 'string' || tag.trim().length === 0) {
      return { ok: false, message: 'Invalid hashtag: empty or non-string' };
    }
  }

  // Check for duplicates
  const normalized = hashtags.map((h: string) => h.toLowerCase().replace(/^#/, ''));
  if (new Set(normalized).size !== normalized.length) {
    return { ok: false, message: 'Duplicate hashtags found' };
  }

  return { ok: true };
}
