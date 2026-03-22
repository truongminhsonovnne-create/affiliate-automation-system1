/**
 * AI Enrichment Pipeline - Gemini Client
 *
 * Low-level Gemini API transport layer with retry logic.
 */

import type {
  GeminiGenerationRequest,
  GeminiGenerationResult,
  GeminiContent,
  GeminiGenerationConfig,
  AiEnrichmentLogger,
} from './types.js';
import { GEMINI_CONFIG, AI_RETRY } from './constants.js';

// ============================================
// Client Configuration
// ============================================

export interface GeminiClientConfig {
  /** API Key */
  apiKey: string;

  /** Model name */
  model?: string;

  /** Default temperature */
  temperature?: number;

  /** Default max tokens */
  maxTokens?: number;

  /** Request timeout in ms */
  timeout?: number;

  /** Custom logger */
  logger?: AiEnrichmentLogger;
}

/**
 * Gemini client
 */
export class GeminiClient {
  private apiKey: string;
  private model: string;
  private defaultConfig: {
    temperature: number;
    maxTokens: number;
    timeout: number;
  };
  private logger?: AiEnrichmentLogger;

  constructor(config: GeminiClientConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || GEMINI_CONFIG.DEFAULT_MODEL;
    this.defaultConfig = {
      temperature: config.temperature ?? GEMINI_CONFIG.DEFAULT_TEMPERATURE,
      maxTokens: config.maxTokens ?? GEMINI_CONFIG.DEFAULT_MAX_TOKENS,
      timeout: config.timeout ?? GEMINI_CONFIG.REQUEST_TIMEOUT,
    };
    this.logger = config.logger;
  }

  /**
   * Generate content using Gemini API
   */
  async generateContent(
    request: GeminiGenerationRequest,
    options: {
      temperature?: number;
      maxTokens?: number;
      retries?: number;
    } = {}
  ): Promise<GeminiGenerationResult> {
    const startTime = Date.now();
    const maxRetries = options.retries ?? AI_RETRY.DEFAULT_MAX_RETRIES;

    // Build generation config
    const generationConfig: GeminiGenerationConfig = {
      temperature: options.temperature ?? this.defaultConfig.temperature,
      maxOutputTokens: options.maxTokens ?? this.defaultConfig.maxTokens,
      responseMimeType: 'application/json',
    };

    let lastError: string | undefined;
    let attempts = 0;

    // Retry loop
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      attempts = attempt + 1;

      try {
        this.logger?.debug('Calling Gemini API', {
          attempt,
          model: this.model,
          hasSystemInstruction: !!request.systemInstruction,
        });

        const result = await this.callGeminiApi(request, generationConfig);

        const durationMs = Date.now() - startTime;

        this.logger?.debug('Gemini API response received', {
          durationMs,
          attempt,
          finishReason: result.finishReason,
        });

        return {
          ok: true,
          text: result.text,
          finishReason: result.finishReason,
          metadata: {
            model: this.model,
            durationMs,
            attempts,
            promptTokenCount: result.promptTokenCount,
            candidatesTokenCount: result.candidatesTokenCount,
            totalTokenCount: result.totalTokenCount,
          },
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);

        this.logger?.warn('Gemini API call failed', {
          attempt,
          maxRetries,
          error: lastError,
        });

        // Check if error is retryable
        if (!isRetryableError(lastError) || attempt >= maxRetries) {
          break;
        }

        // Wait before retry with exponential backoff
        const delay = calculateBackoff(attempt, AI_RETRY.BACKOFF_BASE, AI_RETRY.BACKOFF_MAX);
        await sleep(delay);
      }
    }

    // All retries exhausted
    return {
      ok: false,
      error: lastError || 'Unknown error',
      metadata: {
        model: this.model,
        durationMs: Date.now() - startTime,
        attempts,
      },
    };
  }

  /**
   * Call Gemini API
   */
  private async callGeminiApi(
    request: GeminiGenerationRequest,
    generationConfig: GeminiGenerationConfig
  ): Promise<{
    text: string;
    finishReason?: string;
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  }> {
    const url = `${GEMINI_CONFIG.BASE_URL}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body = {
      contents: request.contents,
      systemInstruction: request.systemInstruction,
      generationConfig,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.defaultConfig.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json() as GeminiApiResponse;

      // Extract text from response
      const candidate = data.candidates?.[0];
      if (!candidate) {
        throw new Error('No candidates in Gemini response');
      }

      const content = candidate.content;
      const part = content?.parts?.[0];

      if (!part?.text) {
        throw new Error('No text in Gemini response');
      }

      // Extract usage metadata if available
      const usageMetadata = data.usageMetadata;

      return {
        text: part.text,
        finishReason: candidate.finishReason,
        promptTokenCount: usageMetadata?.promptTokenCount,
        candidatesTokenCount: usageMetadata?.candidatesTokenCount,
        totalTokenCount: usageMetadata?.totalTokenCount,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Get model name
   */
  getModel(): string {
    return this.model;
  }
}

// ============================================
// API Response Types
// ============================================

interface GeminiApiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Check if error is retryable
 */
function isRetryableError(error: string): boolean {
  const retryablePatterns = [
    'timeout',
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'network',
    'fetch failed',
    'rate limit',
    '429',
    '503',
    '500',
  ];

  const lowerError = error.toLowerCase();
  return retryablePatterns.some(pattern => lowerError.includes(pattern.toLowerCase()));
}

/**
 * Calculate exponential backoff with jitter
 */
function calculateBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * AI_RETRY.JITTER_FACTOR * exponentialDelay;
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create Gemini client from environment
 */
export function createGeminiClient(config?: Partial<GeminiClientConfig>): GeminiClient {
  const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required');
  }

  return new GeminiClient({
    apiKey,
    model: config?.model || process.env.GEMINI_MODEL || GEMINI_CONFIG.DEFAULT_MODEL,
    temperature: config?.temperature,
    maxTokens: config?.maxTokens,
    timeout: config?.timeout,
    logger: config?.logger,
  });
}

/**
 * Build contents for Gemini request
 */
export function buildGeminiContents(
  systemInstruction: string,
  userPrompt: string
): GeminiGenerationRequest {
  return {
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    systemInstruction: {
      role: 'model',
      parts: [{ text: systemInstruction }],
    },
  };
}
