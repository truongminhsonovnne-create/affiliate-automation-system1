/**
 * Voucher Catalog Repository
 *
 * Repository for voucher catalog operations.
 */

import { VoucherCatalogRecord, SupportedVoucherPlatform } from '../types';

/**
 * Voucher catalog repository interface
 */
export interface VoucherCatalogRepository {
  findById(id: string): Promise<VoucherCatalogRecord | null>;
  findByPlatform(platform: SupportedVoucherPlatform): Promise<VoucherCatalogRecord[]>;
  findByShopId(shopId: string): Promise<VoucherCatalogRecord[]>;
  findByCategoryPath(categoryPath: string[]): Promise<VoucherCatalogRecord[]>;
  findActive(platform: SupportedVoucherPlatform): Promise<VoucherCatalogRecord[]>;
  create(voucher: Omit<VoucherCatalogRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<VoucherCatalogRecord>;
  update(id: string, data: Partial<VoucherCatalogRecord>): Promise<VoucherCatalogRecord | null>;
  delete(id: string): Promise<boolean>;
  count(platform?: SupportedVoucherPlatform): Promise<number>;
}

/**
 * In-memory voucher catalog repository (for demo)
 */
export class InMemoryVoucherCatalogRepository implements VoucherCatalogRepository {
  private vouchers = new Map<string, VoucherCatalogRecord>();

  async findById(id: string): Promise<VoucherCatalogRecord | null> {
    return this.vouchers.get(id) ?? null;
  }

  async findByPlatform(platform: SupportedVoucherPlatform): Promise<VoucherCatalogRecord[]> {
    return Array.from(this.vouchers.values()).filter((v) => v.platform === platform);
  }

  async findByShopId(shopId: string): Promise<VoucherCatalogRecord[]> {
    return Array.from(this.vouchers.values()).filter((v) => v.shopId === shopId);
  }

  async findByCategoryPath(categoryPath: string[]): Promise<VoucherCatalogRecord[]> {
    return Array.from(this.vouchers.values()).filter((v) =>
      v.categoryPath?.some((cat) => categoryPath.includes(cat))
    );
  }

  async findActive(platform: SupportedVoucherPlatform): Promise<VoucherCatalogRecord[]> {
    const now = new Date();
    return Array.from(this.vouchers.values()).filter((v) =>
      v.platform === platform &&
      v.isActive &&
      (!v.startsAt || v.startsAt <= now) &&
      (!v.endsAt || v.endsAt >= now)
    );
  }

  async create(voucher: Omit<VoucherCatalogRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<VoucherCatalogRecord> {
    const id = `voucher_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const now = new Date();
    const record: VoucherCatalogRecord = {
      ...voucher,
      id,
      createdAt: now,
      updatedAt: now,
    } as VoucherCatalogRecord;
    this.vouchers.set(id, record);
    return record;
  }

  async update(id: string, data: Partial<VoucherCatalogRecord>): Promise<VoucherCatalogRecord | null> {
    const existing = this.vouchers.get(id);
    if (!existing) return null;

    const updated: VoucherCatalogRecord = {
      ...existing,
      ...data,
      id,
      updatedAt: new Date(),
    };
    this.vouchers.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.vouchers.delete(id);
  }

  async count(platform?: SupportedVoucherPlatform): Promise<number> {
    let vouchers = Array.from(this.vouchers.values());
    if (platform) {
      vouchers = vouchers.filter((v) => v.platform === platform);
    }
    return vouchers.length;
  }

  /**
   * Seed sample vouchers
   */
  seed(vouchers: VoucherCatalogRecord[]): void {
    vouchers.forEach((v) => this.vouchers.set(v.id, v));
  }

  /**
   * Clear all vouchers
   */
  clear(): void {
    this.vouchers.clear();
  }
}

/**
 * Create voucher catalog repository instance
 */
export function createVoucherCatalogRepository(): VoucherCatalogRepository {
  return new InMemoryVoucherCatalogRepository();
}
