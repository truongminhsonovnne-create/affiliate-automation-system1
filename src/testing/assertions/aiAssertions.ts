/**
 * AI Output Assertions
 *
 * Assertions for validating AI enrichment output quality.
 */

import type { AiOutputValidationResult } from '../types';
import {
  MIN_AI_HASHTAGS_COUNT,
  MAX_AI_HASHTAGS_COUNT,
  MAX_AI_DESCRIPTION_LENGTH,
  AI_QUALITY_THRESHOLD,
} from '../constants';

/**
 * Assertion result
 */
export interface AiAssertionResult {
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Validate AI output has required fields
 */
export function assertAiRequiredFields(
  output: Record<string, unknown>
): AiAssertionResult {
  const requiredFields = ['hashtags', 'description', 'title'];
  const missingFields = requiredFields.filter(
    (field) => !(field in output) || output[field] === null
  );

  if (missingFields.length > 0) {
    return {
      passed: false,
      message: `AI output missing required fields: ${missingFields.join(', ')}`,
      details: { missingFields },
    };
  }

  return {
    passed: true,
    message: 'All required fields present',
    details: { requiredFields },
  };
}

/**
 * Validate hashtags format and count
 */
export function assertHashtags(output: Record<string, unknown>): AiAssertionResult {
  const hashtags = output.hashtags;

  if (!hashtags) {
    return {
      passed: false,
      message: 'Hashtags are missing',
      details: { hashtags },
    };
  }

  if (!Array.isArray(hashtags)) {
    return {
      passed: false,
      message: 'Hashtags must be an array',
      details: { hashtagsType: typeof hashtags },
    };
  }

  // Check count
  if (hashtags.length < MIN_AI_HASHTAGS_COUNT) {
    return {
      passed: false,
      message: `Too few hashtags: ${hashtags.length} (minimum: ${MIN_AI_HASHTAGS_COUNT})`,
      details: { hashtagCount: hashtags.length, minRequired: MIN_AI_HASHTAGS_COUNT },
    };
  }

  if (hashtags.length > MAX_AI_HASHTAGS_COUNT) {
    return {
      passed: false,
      message: `Too many hashtags: ${hashtags.length} (maximum: ${MAX_AI_HASHTAGS_COUNT})`,
      details: { hashtagCount: hashtags.length, maxAllowed: MAX_AI_HASHTAGS_COUNT },
    };
  }

  // Check format (should start with # or be plain text)
  const invalidHashtags = hashtags.filter(
    (tag) => typeof tag !== 'string' || tag.trim().length === 0
  );

  if (invalidHashtags.length > 0) {
    return {
      passed: false,
      message: 'Invalid hashtag format',
      details: { invalidHashtags },
    };
  }

  return {
    passed: true,
    message: `Hashtags valid (${hashtags.length} hashtags)`,
    details: { hashtagCount: hashtags.length },
  };
}

/**
 * Validate description quality
 */
export function assertDescriptionQuality(
  output: Record<string, unknown>
): AiAssertionResult {
  const description = output.description;

  if (!description) {
    return {
      passed: false,
      message: 'Description is missing',
      details: { description },
    };
  }

  if (typeof description !== 'string') {
    return {
      passed: false,
      message: 'Description must be a string',
      details: { descriptionType: typeof description },
    };
  }

  const trimmed = description.trim();

  if (trimmed.length === 0) {
    return {
      passed: false,
      message: 'Description is empty',
      details: { descriptionLength: 0 },
    };
  }

  if (trimmed.length > MAX_AI_DESCRIPTION_LENGTH) {
    return {
      passed: false,
      message: `Description too long: ${trimmed.length} chars (max: ${MAX_AI_DESCRIPTION_LENGTH})`,
      details: { descriptionLength: trimmed.length, maxLength: MAX_AI_DESCRIPTION_LENGTH },
    };
  }

  // Check for quality indicators
  const qualityIndicators = [
    { pattern: /[a-zA-Z]/, name: 'contains letters' },
    { pattern: /\d/, name: 'contains numbers' },
    { pattern: /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i, name: 'contains Vietnamese' },
  ];

  const foundIndicators = qualityIndicators.filter((ind) => ind.pattern.test(trimmed));

  return {
    passed: true,
    message: `Description valid (${trimmed.length} chars)`,
    details: {
      descriptionLength: trimmed.length,
      qualityIndicators: foundIndicators.map((i) => i.name),
    },
  };
}

/**
 * Validate title quality
 */
export function assertTitleQuality(output: Record<string, unknown>): AiAssertionResult {
  const title = output.title;

  if (!title) {
    return {
      passed: false,
      message: 'Title is missing',
      details: { title },
    };
  }

  if (typeof title !== 'string') {
    return {
      passed: false,
      message: 'Title must be a string',
      details: { titleType: typeof title },
    };
  }

  const trimmed = title.trim();

  if (trimmed.length === 0) {
    return {
      passed: false,
      message: 'Title is empty',
      details: { titleLength: 0 },
    };
  }

  if (trimmed.length < 10) {
    return {
      passed: false,
      message: 'Title too short',
      details: { titleLength: trimmed.length },
    };
  }

  if (trimmed.length > 200) {
    return {
      passed: false,
      message: 'Title too long',
      details: { titleLength: trimmed.length },
    };
  }

  return {
    passed: true,
    message: `Title valid (${trimmed.length} chars)`,
    details: { titleLength: trimmed.length },
  };
}

/**
 * Validate tags (optional field)
 */
export function assertTags(output: Record<string, unknown>): AiAssertionResult {
  const tags = output.tags;

  if (!tags) {
    // Tags are optional
    return {
      passed: true,
      message: 'Tags not provided (optional)',
      details: { tags: null },
    };
  }

  if (!Array.isArray(tags)) {
    return {
      passed: false,
      message: 'Tags must be an array',
      details: { tagsType: typeof tags },
    };
  }

  // Check all tags are strings
  const invalidTags = tags.filter((tag) => typeof tag !== 'string');

  if (invalidTags.length > 0) {
    return {
      passed: false,
      message: 'All tags must be strings',
      details: { invalidTags },
    };
  }

  return {
    passed: true,
    message: `Tags valid (${tags.length} tags)`,
    details: { tagCount: tags.length },
  };
}

/**
 * Validate metadata (optional field)
 */
export function assertMetadata(output: Record<string, unknown>): AiAssertionResult {
  const meta = output.meta;

  if (!meta) {
    // Metadata is optional
    return {
      passed: true,
      message: 'Metadata not provided (optional)',
      details: { meta: null },
    };
  }

  if (typeof meta !== 'object') {
    return {
      passed: false,
      message: 'Metadata must be an object',
      details: { metaType: typeof meta },
    };
  }

  return {
    passed: true,
    message: 'Metadata valid',
    details: { meta },
  };
}

/**
 * Run all AI output assertions
 */
export function runAiOutputAssertions(
  output: Record<string, unknown>
): AiOutputValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required field check
  const requiredResult = assertAiRequiredFields(output);
  if (!requiredResult.passed) {
    errors.push(requiredResult.message);
  }

  // Hashtags check
  const hashtagsResult = assertHashtags(output);
  if (!hashtagsResult.passed) {
    errors.push(hashtagsResult.message);
  }

  // Description check
  const descriptionResult = assertDescriptionQuality(output);
  if (!descriptionResult.passed) {
    errors.push(descriptionResult.message);
  }

  // Title check
  const titleResult = assertTitleQuality(output);
  if (!titleResult.passed) {
    errors.push(titleResult.message);
  }

  // Optional fields
  const tagsResult = assertTags(output);
  if (!tagsResult.passed) {
    warnings.push(tagsResult.message);
  }

  const metadataResult = assertMetadata(output);
  if (!metadataResult.passed) {
    warnings.push(metadataResult.message);
  }

  const schemaValid = errors.length === 0;
  const hasRequiredFields = requiredResult.passed;
  const hasContent = descriptionResult.passed && titleResult.passed;
  const hasHashtags = hashtagsResult.passed;
  const qualityPass = errors.length === 0 && warnings.length === 0;

  return {
    schemaValid,
    hasRequiredFields,
    hasContent,
    hasHashtags,
    qualityPass,
    errors,
    warnings,
  };
}

/**
 * Validate AI response can be parsed
 */
export function assertAiResponseParseable(response: unknown): AiAssertionResult {
  try {
    if (typeof response === 'string') {
      JSON.parse(response);
    }
    return {
      passed: true,
      message: 'Response is parseable',
      details: { responseType: typeof response },
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Response is not valid JSON',
      details: { error: (error as Error).message },
    };
  }
}

/**
 * Calculate AI output quality score
 */
export function calculateAiQualityScore(
  output: Record<string, unknown>
): {
  score: number;
  breakdown: Record<string, number>;
} {
  const breakdown: Record<string, number> = {};
  let totalWeight = 0;
  let weightedScore = 0;

  // Hashtags (20%)
  const hashtagsWeight = 0.2;
  totalWeight += hashtagsWeight;
  const hashtagsResult = assertHashtags(output);
  breakdown.hashtags = hashtagsResult.passed ? 1 : 0;
  weightedScore += breakdown.hashtags * hashtagsWeight;

  // Description (40%)
  const descriptionWeight = 0.4;
  totalWeight += descriptionWeight;
  const descResult = assertDescriptionQuality(output);
  breakdown.description = descResult.passed ? 1 : 0;
  weightedScore += breakdown.description * descriptionWeight;

  // Title (30%)
  const titleWeight = 0.3;
  totalWeight += titleWeight;
  const titleResult = assertTitleQuality(output);
  breakdown.title = titleResult.passed ? 1 : 0;
  weightedScore += breakdown.title * titleWeight;

  // Tags (10%)
  const tagsWeight = 0.1;
  totalWeight += tagsWeight;
  const tagsResult = assertTags(output);
  breakdown.tags = tagsResult.passed ? 1 : 0;
  weightedScore += breakdown.tags * tagsWeight;

  const score = weightedScore;

  return {
    score,
    breakdown,
  };
}

/**
 * Check if AI output meets quality threshold
 */
export function assertAiQualityThreshold(
  output: Record<string, unknown>
): AiAssertionResult {
  const { score } = calculateAiQualityScore(output);
  const passed = score >= AI_QUALITY_THRESHOLD;

  return {
    passed,
    message: passed
      ? `AI quality score: ${(score * 100).toFixed(0)}% (threshold: ${(AI_QUALITY_THRESHOLD * 100).toFixed(0)}%)`
      : `AI quality below threshold: ${(score * 100).toFixed(0)}% < ${(AI_QUALITY_THRESHOLD * 100).toFixed(0)}%`,
    details: { score, threshold: AI_QUALITY_THRESHOLD },
  };
}
