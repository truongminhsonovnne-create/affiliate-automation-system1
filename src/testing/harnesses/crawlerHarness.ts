/**
 * Crawler Test Harness
 *
 * Provides test utilities for crawler layer testing.
 */

import type { TestContext, TestScenario } from '../types';
import { sampleListingCard, sampleDetailPayload } from '../fixtures/sampleShopeeData';

/**
 * Crawler harness options
 */
export interface CrawlerHarnessOptions {
  crawler: {
    search: (query: string, options?: Record<string, unknown>) => Promise<unknown>;
    getItemDetail: (itemId: string) => Promise<unknown>;
    getShopInfo: (shopId: string) => Promise<unknown>;
  };
  context: TestContext;
}

/**
 * Crawler extraction result
 */
export interface CrawlerExtractionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
  coverage?: number;
}

/**
 * Create crawler harness
 */
export function createCrawlerHarness(options: CrawlerHarnessOptions) {
  const { crawler, context } = options;

  return {
    /**
     * Test search functionality
     */
    async search(
      query: string,
      options?: Record<string, unknown>
    ): Promise<CrawlerExtractionResult<unknown>> {
      const start = Date.now();
      try {
        const result = await crawler.search(query, options);
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
     * Test item detail extraction
     */
    async getItemDetail(
      itemId: string
    ): Promise<CrawlerExtractionResult<unknown>> {
      const start = Date.now();
      try {
        const result = await crawler.getItemDetail(itemId);
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
     * Test shop info extraction
     */
    async getShopInfo(
      shopId: string
    ): Promise<CrawlerExtractionResult<unknown>> {
      const start = Date.now();
      try {
        const result = await crawler.getShopInfo(shopId);
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
     * Verify extraction coverage
     */
    async verifyExtractionCoverage(
      extracted: Record<string, unknown>,
      expectedFields: string[]
    ): Promise<number> {
      const extractedFields = Object.keys(extracted);
      const coveredFields = expectedFields.filter((field) =>
        extractedFields.includes(field)
      );
      return (coveredFields.length / expectedFields.length) * 100;
    },

    /**
     * Test with sample data
     */
    async testWithSampleListing(): Promise<CrawlerExtractionResult<typeof sampleListingCard>> {
      const start = Date.now();
      try {
        // Simulate extraction with sample data
        const result = { ...sampleListingCard };
        const coverage = await this.verifyExtractionCoverage(
          result as unknown as Record<string, unknown>,
          ['itemId', 'name', 'price', 'originalPrice', 'discount', 'rating', 'shop']
        );
        return {
          success: true,
          data: result,
          duration: Date.now() - start,
          coverage,
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
     * Test with sample detail payload
     */
    async testWithSampleDetail(): Promise<CrawlerExtractionResult<typeof sampleDetailPayload>> {
      const start = Date.now();
      try {
        const result = { ...sampleDetailPayload };
        const coverage = await this.verifyExtractionCoverage(
          result as unknown as Record<string, unknown>,
          [
            'itemId',
            'name',
            'price',
            'description',
            'images',
            'attributes',
            'options',
            'shop',
          ]
        );
        return {
          success: true,
          data: result,
          duration: Date.now() - start,
          coverage,
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
     * Run extraction quality test
     */
    async runExtractionQualityTest(
      testCase: {
        name: string;
        input: string;
        expectedFields: string[];
      }
    ): Promise<{
      passed: boolean;
      coverage: number;
      duration: number;
      error?: string;
    }> {
      const result = await this.getItemDetail(testCase.input);

      if (!result.success) {
        return {
          passed: false,
          coverage: 0,
          duration: result.duration,
          error: result.error,
        };
      }

      const coverage = await this.verifyExtractionCoverage(
        result.data as Record<string, unknown>,
        testCase.expectedFields
      );

      return {
        passed: coverage >= 80,
        coverage,
        duration: result.duration,
      };
    },
  };
}

/**
 * Mock crawler for testing
 */
export class MockCrawler {
  private responses: Map<string, unknown> = new Map();
  private delays: Map<string, number> = new Map();

  /**
   * Register a mock response
   */
  registerResponse(method: string, response: unknown, delay = 0): void {
    this.responses.set(method, response);
    if (delay > 0) {
      this.delays.set(method, delay);
    }
  }

  /**
   * Register search response
   */
  registerSearchResponse(response: unknown, delay = 0): void {
    this.registerResponse('search', response, delay);
  }

  /**
   * Register item detail response
   */
  registerItemDetailResponse(response: unknown, delay = 0): void {
    this.registerResponse('getItemDetail', response, delay);
  }

  /**
   * Register shop info response
   */
  registerShopInfoResponse(response: unknown, delay = 0): void {
    this.registerResponse('getShopInfo', response, delay);
  }

  /**
   * Search method
   */
  async search(query: string, options?: Record<string, unknown>): Promise<unknown> {
    const delay = this.delays.get('search') ?? 0;
    if (delay > 0) await this.delay(delay);

    const response = this.responses.get('search');
    if (!response) {
      throw new Error('No mock search response registered');
    }
    return response;
  }

  /**
   * Get item detail method
   */
  async getItemDetail(itemId: string): Promise<unknown> {
    const delay = this.delays.get('getItemDetail') ?? 0;
    if (delay > 0) await this.delay(delay);

    const response = this.responses.get('getItemDetail');
    if (!response) {
      throw new Error('No mock item detail response registered');
    }
    return response;
  }

  /**
   * Get shop info method
   */
  async getShopInfo(shopId: string): Promise<unknown> {
    const delay = this.delays.get('getShopInfo') ?? 0;
    if (delay > 0) await this.delay(delay);

    const response = this.responses.get('getShopInfo');
    if (!response) {
      throw new Error('No mock shop info response registered');
    }
    return response;
  }

  /**
   * Clear all registered responses
   */
  clear(): void {
    this.responses.clear();
    this.delays.clear();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create mock crawler with sample responses
 */
export function createMockCrawler(): MockCrawler {
  const crawler = new MockCrawler();
  crawler.registerSearchResponse({ items: [sampleListingCard], total_count: 1 });
  crawler.registerItemDetailResponse(sampleDetailPayload);
  crawler.registerShopInfoResponse({
    shopId: '12345678',
    name: 'Fashion Store',
    rating: 4.9,
    location: 'TP. Hồ Chí Minh',
  });
  return crawler;
}
