/**
 * Publishing Test Harness
 *
 * Provides test utilities for publishing layer testing.
 */

import type { TestContext } from '../types';
import { samplePublishJob, sampleAdapterResponse } from '../fixtures/sampleShopeeData';

/**
 * Publishing harness options
 */
export interface PublishingHarnessOptions {
  publisher: {
    publish: (job: unknown) => Promise<unknown>;
    getStatus: (postId: string) => Promise<unknown>;
    delete: (postId: string) => Promise<void>;
  };
  context: TestContext;
}

/**
 * Publishing result
 */
export interface PublishingResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
  postId?: string;
}

/**
 * Create publishing harness
 */
export function createPublishingHarness(options: PublishingHarnessOptions) {
  const { publisher, context } = options;

  return {
    /**
     * Test publish functionality
     */
    async publish(job: unknown): Promise<PublishingResult<typeof sampleAdapterResponse>> {
      const start = Date.now();
      try {
        const result = await publisher.publish(job);
        return {
          success: true,
          data: result as typeof sampleAdapterResponse,
          duration: Date.now() - start,
          postId: (result as { externalId?: string })?.externalId,
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
     * Test get status
     */
    async getStatus(postId: string): Promise<PublishingResult<unknown>> {
      const start = Date.now();
      try {
        const result = await publisher.getStatus(postId);
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
     * Test delete post
     */
    async deletePost(postId: string): Promise<PublishingResult<void>> {
      const start = Date.now();
      try {
        await publisher.delete(postId);
        return {
          success: true,
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
     * Test with sample job
     */
    async testWithSampleJob(): Promise<PublishingResult<typeof sampleAdapterResponse>> {
      const start = Date.now();
      try {
        const result = { ...sampleAdapterResponse };
        return {
          success: true,
          data: result,
          duration: Date.now() - start,
          postId: result.externalId,
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
     * Test lifecycle transitions
     */
    async testLifecycleTransitions(
      initialState: string,
      transitions: string[]
    ): Promise<{
      valid: boolean;
      reached: string | null;
      failed: string | null;
    }> {
      let currentState = initialState;

      for (const nextState of transitions) {
        const validTransition = isValidTransition(currentState, nextState);
        if (!validTransition) {
          return {
            valid: false,
            reached: currentState,
            failed: nextState,
          };
        }
        currentState = nextState;
      }

      return {
        valid: true,
        reached: currentState,
        failed: null,
      };
    },

    /**
     * Test retry behavior
     */
    async testRetryBehavior(
      job: unknown,
      maxAttempts: number
    ): Promise<{
      attempts: number;
      succeeded: boolean;
      errors: string[];
    }> {
      const errors: string[] = [];
      let attempts = 0;

      for (attempts = 1; attempts <= maxAttempts; attempts++) {
        try {
          await publisher.publish(job);
          return { attempts, succeeded: true, errors };
        } catch (error) {
          errors.push((error as Error).message);
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      return { attempts, succeeded: false, errors };
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
     * Run full publish scenario
     */
    async runPublishScenario(
      job: unknown
    ): Promise<{
      published: boolean;
      postId?: string;
      status?: unknown;
      error?: string;
    }> {
      // Publish
      const publishResult = await this.publish(job);

      if (!publishResult.success) {
        return {
          published: false,
          error: publishResult.error,
        };
      }

      if (!publishResult.postId) {
        return {
          published: true,
          error: 'No post ID returned',
        };
      }

      // Get status
      const statusResult = await this.getStatus(publishResult.postId);

      return {
        published: true,
        postId: publishResult.postId,
        status: statusResult.data,
      };
    },
  };
}

/**
 * Valid state transitions for publishing
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['processing', 'failed'],
  processing: ['completed', 'failed'],
  completed: [],
  failed: ['pending', 'completed'],
};

/**
 * Check if transition is valid
 */
function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Mock publisher for testing
 */
export class MockPublisher {
  private posts: Map<string, unknown> = new Map();
  private shouldFail = false;
  private failError = '';
  private delayMs = 0;
  private callCount = 0;

  /**
   * Register a mock post
   */
  registerPost(postId: string, data: unknown): void {
    this.posts.set(postId, data);
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
   * Publish method
   */
  async publish(job: unknown): Promise<unknown> {
    this.callCount++;
    if (this.delayMs > 0) await this.delay(this.delayMs);

    if (this.shouldFail) {
      throw new Error(this.failError);
    }

    const postId = `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const post = {
      success: true,
      requestId: `req-${Date.now()}`,
      externalId: postId,
      postUrl: `https://platform.com/post/${postId}`,
      platform: 'tiktok',
      status: 'published',
      publishedAt: new Date().toISOString(),
    };

    this.registerPost(postId, post);
    return post;
  }

  /**
   * Get status method
   */
  async getStatus(postId: string): Promise<unknown> {
    this.callCount++;
    if (this.delayMs > 0) await this.delay(this.delayMs);

    const post = this.posts.get(postId);
    if (!post) {
      throw new Error(`Post not found: ${postId}`);
    }

    return post;
  }

  /**
   * Delete method
   */
  async delete(postId: string): Promise<void> {
    this.callCount++;
    if (this.delayMs > 0) await this.delay(this.delayMs);

    if (!this.posts.has(postId)) {
      throw new Error(`Post not found: ${postId}`);
    }

    this.posts.delete(postId);
  }

  /**
   * Get all posts
   */
  getAllPosts(): Map<string, unknown> {
    return new Map(this.posts);
  }

  /**
   * Clear all posts
   */
  clear(): void {
    this.posts.clear();
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
 * Create mock publisher with sample data
 */
export function createMockPublisher(): MockPublisher {
  const publisher = new MockPublisher();
  publisher.registerPost('test-post-123', sampleAdapterResponse);
  return publisher;
}
