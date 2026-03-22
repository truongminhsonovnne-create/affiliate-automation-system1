/**
 * Repository Test Harness
 *
 * Provides test utilities for repository layer testing.
 */

import type { Mock } from 'vitest';
import type { Repository } from '../../core/interfaces';
import type { TestContext } from '../types';

/**
 * Repository harness options
 */
export interface RepositoryHarnessOptions<T> {
  repository: Repository<T>;
  entityName: string;
  context: TestContext;
}

/**
 * Repository operation result
 */
export interface RepositoryOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
}

/**
 * Create repository harness
 */
export function createRepositoryHarness<T extends { id: string }>(
  options: RepositoryHarnessOptions<T>
) {
  const { repository, entityName, context } = options;

  return {
    /**
     * Find by ID
     */
    async findById(id: string): Promise<RepositoryOperationResult<T>> {
      const start = Date.now();
      try {
        const result = await repository.findById(id);
        return {
          success: true,
          data: result ?? undefined,
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
     * Find many with filters
     */
    async findMany(
      filters?: Record<string, unknown>
    ): Promise<RepositoryOperationResult<T[]>> {
      const start = Date.now();
      try {
        const result = await repository.findMany(filters);
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
     * Create entity
     */
    async create(entity: Omit<T, 'id'>): Promise<RepositoryOperationResult<T>> {
      const start = Date.now();
      try {
        const result = await repository.create(entity);
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
     * Update entity
     */
    async update(
      id: string,
      data: Partial<T>
    ): Promise<RepositoryOperationResult<T>> {
      const start = Date.now();
      try {
        const result = await repository.update(id, data);
        return {
          success: true,
          data: result ?? undefined,
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
     * Delete entity
     */
    async delete(id: string): Promise<RepositoryOperationResult<void>> {
      const start = Date.now();
      try {
        await repository.delete(id);
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
     * Count entities
     */
    async count(filters?: Record<string, unknown>): Promise<RepositoryOperationResult<number>> {
      const start = Date.now();
      try {
        const result = await repository.count(filters);
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
     * Run CRUD test scenario
     */
    async runCrudScenario(
      entity: Omit<T, 'id'>
    ): Promise<{
      created: T;
      updated: T;
      deleted: boolean;
    }> {
      // Create
      const createResult = await this.create(entity);
      if (!createResult.success || !createResult.data) {
        throw new Error(`Failed to create ${entityName}: ${createResult.error}`);
      }
      const created = createResult.data;

      // Find by ID
      const findResult = await this.findById(created.id);
      if (!findResult.success || !findResult.data) {
        throw new Error(`Failed to find ${entityName} by ID`);
      }

      // Update
      const updateResult = await this.update(created.id, { ...entity, id: created.id } as Partial<T>);
      if (!updateResult.success || !updateResult.data) {
        throw new Error(`Failed to update ${entityName}: ${updateResult.error}`);
      }
      const updated = updateResult.data;

      // Delete
      const deleteResult = await this.delete(created.id);
      if (!deleteResult.success) {
        throw new Error(`Failed to delete ${entityName}: ${deleteResult.error}`);
      }

      return { created, updated, deleted: true };
    },

    /**
     * Verify empty state
     */
    async verifyEmpty(): Promise<boolean> {
      const countResult = await this.count();
      return countResult.success && countResult.data === 0;
    },

    /**
     * Clean up test data
     */
    async cleanup(): Promise<void> {
      // Implementation depends on repository methods available
      // This is a placeholder that should be customized per repository
      console.log(`Cleaning up ${entityName} test data`);
    },
  };
}

/**
 * Mock repository for testing
 */
export class MockRepository<T extends { id: string }> implements Repository<T> {
  private data: Map<string, T> = new Map();
  private idCounter = 0;

  async findById(id: string): Promise<T | null> {
    return this.data.get(id) ?? null;
  }

  async findMany(filters?: Record<string, unknown>): Promise<T[]> {
    let results = Array.from(this.data.values());

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        results = results.filter((item) => (item as Record<string, unknown>)[key] === value);
      }
    }

    return results;
  }

  async create(entity: Omit<T, 'id'>): Promise<T> {
    const id = String(++this.idCounter);
    const created = { ...entity, id } as T;
    this.data.set(id, created);
    return created;
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const existing = this.data.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...data };
    this.data.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.data.delete(id);
  }

  async count(filters?: Record<string, unknown>): Promise<number> {
    const results = await this.findMany(filters);
    return results.length;
  }

  /**
   * Seed test data
   */
  seed(items: T[]): void {
    items.forEach((item) => {
      this.data.set(item.id, item);
      const numericId = parseInt(item.id, 10);
      if (!isNaN(numericId) && numericId > this.idCounter) {
        this.idCounter = numericId;
      }
    });
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.data.clear();
    this.idCounter = 0;
  }

  /**
   * Get all data (for inspection)
   */
  getAll(): T[] {
    return Array.from(this.data.values());
  }
}

/**
 * Create mock repository with preset data
 */
export function createMockRepository<T extends { id: string }>(
  initialData: T[] = []
): MockRepository<T> {
  const repo = new MockRepository<T>();
  repo.seed(initialData);
  return repo;
}
