/**
 * Voucher Resolution Result Repository
 *
 * Repository for voucher resolution result operations.
 */

import { VoucherResolutionResult } from '../types';

/**
 * Resolution result repository interface
 */
export interface VoucherResolutionResultRepository {
  create(result: Omit<VoucherResolutionResult, 'requestId'> & { requestId: string }): Promise<VoucherResolutionResult>;
  findByRequestId(requestId: string): Promise<VoucherResolutionResult | null>;
  findByBestVoucherId(voucherId: string): Promise<VoucherResolutionResult[]>;
  findRecent(limit: number): Promise<VoucherResolutionResult[]>;
  delete(requestId: string): Promise<boolean>;
}

/**
 * In-memory resolution result repository
 */
export class InMemoryResolutionResultRepository implements VoucherResolutionResultRepository {
  private results = new Map<string, VoucherResolutionResult>();

  async create(result: Omit<VoucherResolutionResult, 'requestId'> & { requestId: string }): Promise<VoucherResolutionResult> {
    const record = { ...result } as VoucherResolutionResult;
    this.results.set(result.requestId, record);
    return record;
  }

  async findByRequestId(requestId: string): Promise<VoucherResolutionResult | null> {
    return this.results.get(requestId) ?? null;
  }

  async findByBestVoucherId(voucherId: string): Promise<VoucherResolutionResult[]> {
    return Array.from(this.results.values()).filter((r) => r.bestVoucher?.id === voucherId);
  }

  async findRecent(limit: number): Promise<VoucherResolutionResult[]> {
    return Array.from(this.results.values())
      .sort((a, b) => b.resolvedAt.getTime() - a.resolvedAt.getTime())
      .slice(0, limit);
  }

  async delete(requestId: string): Promise<boolean> {
    return this.results.delete(requestId);
  }

  clear(): void {
    this.results.clear();
  }
}

export function createResolutionResultRepository(): VoucherResolutionResultRepository {
  return new InMemoryResolutionResultRepository();
}
