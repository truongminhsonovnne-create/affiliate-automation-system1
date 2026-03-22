/**
 * AI Test Harness
 *
 * Provides test utilities for AI layer testing.
 */

import type { TestContext } from '../types';
import { sampleAiEnrichedContent } from '../fixtures/sampleShopeeData';

/**
 * AI harness options
 */
export interface AiHarnessOptions {
  aiClient: {
    generateContent: (prompt: string, options?: Record<string, unknown>) => Promise<unknown>;
    generateEnrichment: (product: unknown) => Promise<unknown>;
  };
  context: TestContext;
}

/**
 * AI generation result
 */
export interface AiGenerationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

/**
 * Create AI harness
 */
export function createAiHarness(options: AiHarnessOptions) {
  const { aiClient, context } = options;

  return {
    /**
     * Test content generation
     */
    async generateContent(
      prompt: string,
      options?: Record<string, unknown>
    ): Promise<AiGenerationResult<unknown>> {
      const start = Date.now();
      try {
        const result = await aiClient.generateContent(prompt, options);
        return {
          success: true,
          data: result,
          duration: Date.now() - start,
        };
      } catch (error) {
        return {
          success: false,
          error: (error as Error).message,
          duration: Date.now() - start,
        };
      }
    },

    /**
     * Test product enrichment
     */
    async generateEnrichment(
      product: unknown
    ): Promise<AiGenerationResult<typeof sampleAiEnrichedContent>> {
      const start = Date.now();
      try {
        const result = await aiClient.generateEnrichment(product);
        return {
          success: true,
          data: result as typeof sampleAiEnrichedContent,
          duration: Date.now() - start,
        };
      } catch (error) {
        return {
          success: false,
          error: (error as Error).message,
          duration: Date.now() - start,
        };
      }
    },

    /**
     * Test with sample enrichment
     */
    async testWithSampleEnrichment(): Promise<AiGenerationResult<typeof sampleAiEnrichedContent>> {
      const start = Date.now();
      try {
        const result = { ...sampleAiEnrichedContent };
        return {
          success: true,
          data: result,
          duration: Date.now() - start,
        };
      } catch (error) {
        return {
          success: false,
          error: (error as Error).message,
          duration: Date.now() - start,
        };
      }
    },

    /**
     * Test rate limiting
     */
    async testRateLimit(
      requestCount: number,
      generator: () => Promise<unknown>
    ): Promise<{
      succeeded: number;
      failed: number;
      rateLimited: boolean;
    }> {
      let succeeded = 0;
      let failed = 0;

      for (let i = 0; i < requestCount; i++) {
        try {
          await generator();
          succeeded++;
        } catch (error) {
          const errorMessage = (error as Error).message.toLowerCase();
          if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
            return { succeeded, failed, rateLimited: true };
          }
          failed++;
        }
      }

      return { succeeded, failed, rateLimited: false };
    },

    /**
     * Validate response structure
     */
    validateResponseStructure(
      response: unknown,
      requiredFields: string[]
    ): {
      valid: boolean;
      missing: string[];
    } {
      const responseObj = response as Record<string, unknown>;
      const missing = requiredFields.filter(
        (field) => responseObj[field] === undefined
      );
      return {
        valid: missing.length === 0,
        missing,
      };
    },

    /**
     * Run quality test
     */
    async runQualityTest(
      product: unknown,
      qualityChecks: {
        minHashtags?: number;
        maxHashtags?: number;
        minDescriptionLength?: number;
        maxDescriptionLength?: number;
      }
    ): Promise<{
      passed: boolean;
      results: Record<string, boolean>;
      error?: string;
    }> {
      const result = await this.generateEnrichment(product);

      if (!result.success || !result.data) {
        return {
          passed: false,
          results: {},
          error: result.error,
        };
      }

      const output = result.data;
      const results: Record<string, boolean> = {};

      // Check hashtags count
      if (qualityChecks.minHashtags !== undefined) {
        const hashtags = (output.hashtags as string[]) ?? [];
        results.hashtags_min = hashtags.length >= qualityChecks.minHashtags;
      }

      if (qualityChecks.maxHashtags !== undefined) {
        const hashtags = (output.hashtags as string[]) ?? [];
        results.hashtags_max = hashtags.length <= qualityChecks.maxHashtags;
      }

      // Check description length
      if (qualityChecks.minDescriptionLength !== undefined) {
        const description = (output.description as string) ?? '';
        results.description_min =
          description.length >= qualityChecks.minDescriptionLength;
      }

      if (qualityChecks.maxDescriptionLength !== undefined) {
        const description = (output.description as string) ?? '';
        results.description_max =
          description.length <= qualityChecks.maxDescriptionLength;
      }

      const passed = Object.values(results).every((v) => v);

      return { passed, results };
    },
  };
}

/**
 * Mock AI client for testing
 */
export class MockAiClient {
  private responses: Map<string, unknown> = new Map();
  private shouldFail = false;
  private failError = '';
  private delayMs = 0;
  private callCount = 0;

  /**
   * Register a mock response
   */
  registerResponse(method: string, response: unknown): void {
    this.responses.set(method, response);
  }

  /**
   * Configure failure
   */
  configureFailure(shouldFail: boolean, errorMessage = 'Mock error'): void {
    this.shouldFail = shouldFail;
    this.failError = errorMessage;
  }

  /**
   * Configure delay
   */
  configureDelay(delayMs: number): void {
    this.delayMs = delayMs;
  }

  /**
   * Get call count
   */
  getCallCount(): number {
    return this.callCount;
  }

  /**
   * Reset call count
   */
  resetCallCount(): void {
    this.callCount = 0;
  }

  /**
   * Generate content method
   */
  async generateContent(prompt: string, options?: Record<string, unknown>): Promise<unknown> {
    this.callCount++;
    if (this.delayMs > 0) await this.delay(this.delayMs);

    if (this.shouldFail) {
      throw new Error(this.failError);
    }

    const response = this.responses.get('generateContent');
    if (response) {
      return response;
    }

    // Default response
    return {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  hashtags: ['fashion', 'style', 'ootd'],
                  description: 'Mock AI generated description',
                  title: 'Mock AI Title',
                }),
              },
            ],
          },
        },
      ],
    };
  }

  /**
   * Generate enrichment method
   */
  async generateEnrichment(product: unknown): Promise<unknown> {
    this.callCount++;
    if (this.delayMs > 0) await this.delay(this.delayMs);

    if (this.shouldFail) {
      throw new Error(this.failError);
    }

    const response = this.responses.get('generateEnrichment');
    if (response) {
      return response;
    }

    // Default response
    return {
      ...sampleAiEnrichedContent,
      productId: (product as { id?: string })?.id ?? 'unknown',
    };
  }

  /**
   * Clear all responses
   */
  clear(): void {
    this.responses.clear();
    this.shouldFail = false;
    this.failError = '';
    this.delayMs = 0;
    this.callCount = 0;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create mock AI client with sample responses
 */
export function createMockAiClient(): MockAiClient {
  const client = new MockAiClient();
  client.registerResponse('generateContent', {
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({
                hashtags: ['fashion', 'style', 'ootd', 'vietnamesefashion'],
                description: 'Áo thun nam chất liệu cotton 100% mềm mại, thoáng mát.',
                title: 'Áo Thun Nam Cotton Basic',
              }),
            },
          ],
        },
      },
    ],
  });
  client.registerResponse('generateEnrichment', sampleAiEnrichedContent);
  return client;
}
