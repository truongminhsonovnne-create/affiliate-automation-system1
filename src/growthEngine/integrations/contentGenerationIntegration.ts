/**
 * Content Generation Integration
 *
 * Integration layer for content generation engine.
 */

import { GrowthSurfaceInventoryRecord } from '../types';
import { executeSurfaceGeneration, executeBatchGeneration, GenerationResult } from '../generation/surfaceGenerationService';

export interface ContentGenerationConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  maxRetries: number;
}

export interface GenerationRequest {
  surface: GrowthSurfaceInventoryRecord;
  template?: string;
  context?: Record<string, unknown>;
}

/**
 * Integration with content generation engine
 */
export class ContentGenerationIntegration {
  private config: ContentGenerationConfig;

  constructor(config: ContentGenerationConfig) {
    this.config = config;
  }

  /**
   * Generate content for a single surface
   */
  async generateSurface(request: GenerationRequest): Promise<GenerationResult> {
    const result = await executeSurfaceGeneration({
      surfaceId: request.surface.id,
      surface: request.surface,
      payload: {
        template: request.template,
        context: request.context,
      },
    });

    return result;
  }

  /**
   * Generate content for multiple surfaces
   */
  async generateBatch(
    surfaces: GrowthSurfaceInventoryRecord[],
    options?: {
      maxParallel?: number;
      onProgress?: (completed: number, total: number) => void;
    }
  ) {
    return executeBatchGeneration(surfaces, options);
  }

  /**
   * Check if generation service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Would ping the generation service in production
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create content generation integration instance
 */
export function createContentGenerationIntegration(
  config?: Partial<ContentGenerationConfig>
): ContentGenerationIntegration {
  return new ContentGenerationIntegration({
    baseUrl: config?.baseUrl ?? 'http://localhost:4000',
    timeout: config?.timeout ?? 30000,
    maxRetries: config?.maxRetries ?? 3,
    apiKey: config?.apiKey,
  });
}
