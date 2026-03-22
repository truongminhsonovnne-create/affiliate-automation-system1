/**
 * Voucher Resolution Request Repository
 *
 * Repository for voucher resolution request operations.
 */

import { VoucherResolutionRequest, VoucherResolutionStatus } from '../types';

/**
 * Resolution request repository interface
 */
export interface VoucherResolutionRequestRepository {
  create(request: Omit<VoucherResolutionRequest, 'id' | 'createdAt'>): Promise<VoucherResolutionRequest>;
  findById(id: string): Promise<VoucherResolutionRequest | null>;
  findByCacheKey(cacheKey: string): Promise<VoucherResolutionRequest | null>;
  update(id: string, data: Partial<VoucherResolutionRequest>): Promise<VoucherResolutionRequest | null>;
  delete(id: string): Promise<boolean>;
  findRecent(limit: number): Promise<VoucherResolutionRequest[]>;
  findByStatus(status: VoucherResolutionStatus): Promise<VoucherResolutionRequest[]>;
}

/**
 * In-memory resolution request repository
 *
 * NOTE: This is a local in-process fallback only.
 * Production uses voucherResolutionPersistence.ts which writes to
 * Supabase + Redis. This class exists for unit testing and
 * for graceful degradation when the persistence layer is unavailable.
 */
export class InMemoryResolutionRequestRepository implements VoucherResolutionRequestRepository {
  private requests = new Map<string, VoucherResolutionRequest>();

  async create(request: Omit<VoucherResolutionRequest, 'id' | 'createdAt'>): Promise<VoucherResolutionRequest> {
    const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const record: VoucherResolutionRequest = {
      ...request,
      id,
      requestedAt: request.requestedAt ?? new Date(),
    } as VoucherResolutionRequest;
    this.requests.set(id, record);
    return record;
  }

  async findById(id: string): Promise<VoucherResolutionRequest | null> {
    return this.requests.get(id) ?? null;
  }

  async findByCacheKey(cacheKey: string): Promise<VoucherResolutionRequest | null> {
    for (const request of this.requests.values()) {
      if (request.cacheKey === cacheKey) {
        return request;
      }
    }
    return null;
  }

  async update(id: string, data: Partial<VoucherResolutionRequest>): Promise<VoucherResolutionRequest | null> {
    const existing = this.requests.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...data, id };
    this.requests.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.requests.delete(id);
  }

  async findRecent(limit: number): Promise<VoucherResolutionRequest[]> {
    return Array.from(this.requests.values())
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())
      .slice(0, limit);
  }

  async findByStatus(status: VoucherResolutionStatus): Promise<VoucherResolutionRequest[]> {
    return Array.from(this.requests.values()).filter((r) => r.status === status);
  }

  clear(): void {
    this.requests.clear();
  }
}

export function createResolutionRequestRepository(): VoucherResolutionRequestRepository {
  return new InMemoryResolutionRequestRepository();
}
