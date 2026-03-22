/**
 * AI Enrichment Pipeline - Parser
 *
 * Safe JSON parsing for Gemini responses.
 */

import { CONTENT_QUALITY, JSON_PARSING } from './constants.js';
import type { GeminiParsedResponse, AffiliateContentOutput, AiEnrichmentLogger } from './types.js';

/**
 * Extract JSON from Gemini text response
 */
export function extractJsonFromGeminiText(
  rawText: string,
  options: {
    logger?: AiEnrichmentLogger;
  } = {}
): {
  ok: boolean;
  data?: unknown;
  error?: string;
} {
  const { logger } = options;

  if (!rawText || rawText.trim().length === 0) {
    return { ok: false, error: 'Empty response text' };
  }

  let text = rawText.trim();

  // Strategy 1: Direct parse attempt
  try {
    const parsed = JSON.parse(text);
    logger?.debug('Direct JSON parse succeeded');
    return { ok: true, data: parsed };
  } catch {
    logger?.debug('Direct parse failed, trying extraction strategies');
  }

  // Strategy 2: Extract from markdown code fences
  const extracted = extractFromMarkdownFences(text);
  if (extracted.ok) {
    return extracted;
  }

  // Strategy 3: Try to find JSON object in text
  const foundJson = findJsonInText(text);
  if (foundJson.ok) {
    return foundJson;
  }

  // Strategy 4: Try repair strategies
  const repaired = repairJsonIssues(text, logger);
  if (repaired.ok) {
    return repaired;
  }

  return { ok: false, error: 'Failed to extract valid JSON from response' };
}

/**
 * Extract JSON from markdown code fences
 */
function extractFromMarkdownFences(text: string): {
  ok: boolean;
  data?: unknown;
  error?: string;
} {
  // Pattern to match ```json ... ``` or ``` ... ```
  const jsonFencePattern = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  const match = jsonFencePattern.exec(text);

  if (match && match[1]) {
    const jsonText = match[1].trim();
    try {
      const parsed = JSON.parse(jsonText);
      return { ok: true, data: parsed };
    } catch {
      // Try parsing the extracted content
    }
  }

  // Also try to find JSON at the start or end
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      return { ok: true, data: parsed };
    } catch {
      // Continue to other strategies
    }
  }

  return { ok: false, error: 'No valid JSON in markdown fences' };
}

/**
 * Find JSON object in text
 */
function findJsonInText(text: string): {
  ok: boolean;
  data?: unknown;
  error?: string;
} {
  // Try to find the first { and last } to extract JSON object
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = text.substring(firstBrace, lastBrace + 1);

    try {
      const parsed = JSON.parse(jsonCandidate);
      return { ok: true, data: parsed };
    } catch {
      // Try to fix common JSON issues
    }
  }

  return { ok: false, error: 'No JSON object found in text' };
}

/**
 * Repair minor JSON issues
 */
function repairJsonIssues(text: string, logger?: AiEnrichmentLogger): {
  ok: boolean;
  data?: unknown;
  error?: string;
} {
  let repaired = text;

  // Remove markdown code fences
  repaired = repaired.replace(/```json\s*/gi, '');
  repaired = repaired.replace(/```\s*/gi, '');
  repaired = repaired.replace(/```$/gi, '');

  // Remove leading/trailing whitespace
  repaired = repaired.trim();

  // Try direct parse
  try {
    const parsed = JSON.parse(repaired);
    logger?.debug('JSON repair succeeded (direct)');
    return { ok: true, data: parsed };
  } catch {
    // Continue
  }

  // Try to fix common issues
  repaired = fixCommonJsonIssues(repaired);

  try {
    const parsed = JSON.parse(repaired);
    logger?.debug('JSON repair succeeded (common fixes)');
    return { ok: true, data: parsed };
  } catch {
    // Continue to fallback
  }

  return { ok: false, error: 'JSON repair failed' };
}

/**
 * Fix common JSON issues
 */
function fixCommonJsonIssues(json: string): string {
  let fixed = json;

  // Remove any text before first {
  const firstBrace = fixed.indexOf('{');
  if (firstBrace > 0) {
    fixed = fixed.substring(firstBrace);
  }

  // Remove any text after last }
  const lastBrace = fixed.lastIndexOf('}');
  if (lastBrace !== -1 && lastBrace < fixed.length - 1) {
    fixed = fixed.substring(0, lastBrace + 1);
  }

  // Fix unquoted keys (basic case)
  // This is a simple fix for { key: "value" } -> { "key": "value" }
  fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');

  // Fix trailing commas
  fixed = fixed.replace(/,\s*([}\]])/g, '$1');

  // Fix single quotes to double quotes (basic)
  fixed = fixed.replace(/'([^']*)'/g, '"$1"');

  // Remove comments
  fixed = fixed.replace(/\/\/.*$/gm, '');
  fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, '');

  return fixed;
}

/**
 * Parse Gemini affiliate response
 */
export function parseGeminiAffiliateResponse(
  rawText: string,
  options: {
    logger?: AiEnrichmentLogger;
  } = {}
): GeminiParsedResponse {
  const { logger } = options;

  // Extract JSON
  const extraction = extractJsonFromGeminiText(rawText, { logger });

  if (!extraction.ok || !extraction.data) {
    logger?.warn('Failed to extract JSON from Gemini response', {
      error: extraction.error,
      rawLength: rawText.length,
    });

    return {
      ok: false,
      parseError: extraction.error || 'Failed to parse',
      rawText,
    };
  }

  // Validate it's an object
  if (typeof extraction.data !== 'object' || extraction.data === null || Array.isArray(extraction.data)) {
    logger?.warn('Parsed JSON is not a valid object');

    return {
      ok: false,
      parseError: 'Response is not a valid object',
      rawText,
    };
  }

  // Check for required fields
  const data = extraction.data as Record<string, unknown>;

  // Map to expected structure (handle variations)
  const mapped = mapToAffiliateContent(data);

  return {
    ok: true,
    data: mapped,
    rawText,
  };
}

/**
 * Map raw data to expected content structure
 */
function mapToAffiliateContent(data: Record<string, unknown>): AffiliateContentOutput {
  // Handle variations in field names
  const rewrittenTitle = String(
    data.rewrittenTitle ||
    data.title ||
    data.reviewTitle ||
    data.productTitle ||
    data.name ||
    ''
  );

  const reviewContent = String(
    data.reviewContent ||
    data.content ||
    data.review ||
    data.text ||
    data.body ||
    ''
  );

  const socialCaption = String(
    data.socialCaption ||
    data.caption ||
    data.shortCaption ||
    data.tweet ||
    data.post ||
    ''
  );

  // Handle hashtags - could be string or array
  let hashtags: string[] = [];

  if (Array.isArray(data.hashtags)) {
    hashtags = data.hashtags.map(h => {
      if (typeof h === 'string') return h.replace(/^#/, '');
      return String(h);
    });
  } else if (typeof data.hashtags === 'string') {
    // Parse from space/comma separated string
    hashtags = data.hashtags
      .split(/[\s,]+/)
      .map(h => h.replace(/^#/, ''))
      .filter(h => h.length > 0);
  }

  return {
    rewrittenTitle,
    reviewContent,
    socialCaption,
    hashtags,
  };
}

/**
 * Safe parse with validation
 */
export function safeParseAffiliateContent(
  rawText: string,
  options: {
    logger?: AiEnrichmentLogger;
  } = {}
): {
  ok: boolean;
  data?: AffiliateContentOutput;
  error?: string;
  rawText: string;
} {
  const parsed = parseGeminiAffiliateResponse(rawText, options);

  if (!parsed.ok || !parsed.data) {
    return {
      ok: false,
      error: parsed.parseError,
      rawText,
    };
  }

  // Validate required fields are not empty
  const errors: string[] = [];

  if (!parsed.data.rewrittenTitle?.trim()) {
    errors.push('rewrittenTitle is empty');
  }

  if (!parsed.data.reviewContent?.trim()) {
    errors.push('reviewContent is empty');
  }

  if (!parsed.data.socialCaption?.trim()) {
    errors.push('socialCaption is empty');
  }

  if (!parsed.data.hashtags || parsed.data.hashtags.length === 0) {
    errors.push('hashtags is empty');
  }

  if (errors.length > 0) {
    return {
      ok: false,
      error: `Missing required fields: ${errors.join(', ')}`,
      rawText,
    };
  }

  return {
    ok: true,
    data: parsed.data,
    rawText,
  };
}
