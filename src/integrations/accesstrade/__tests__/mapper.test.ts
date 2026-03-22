/**
 * AccessTrade Mapper — Unit Tests
 *
 * Covers:
 *  - Status mapping (campaign & deal)
 *  - Deal type mapping
 *  - Discount type mapping
 *  - Text normalisation (trim, whitespace collapse)
 *  - URL normalisation
 *  - Confidence score calculation
 *  - Hash generation (dedupe)
 *  - Deal → Offer mapping
 *  - Campaign → Offer mapping
 */

import { describe, it, expect } from 'vitest';
import {
  mapCampaignStatus,
  mapDealStatus,
  mapDealType,
  mapDiscountType,
  computeConfidenceScore,
  computeOfferHash,
  mapDealToOffer,
  mapCampaignToOffer,
} from '../mapper.js';

// =============================================================================
// Status Mapping
// =============================================================================

describe('Status Mappers', () => {
  describe('mapCampaignStatus', () => {
    it('maps active → active', () => {
      expect(mapCampaignStatus('active')).toBe('active');
    });
    it('maps inactive → inactive', () => {
      expect(mapCampaignStatus('inactive')).toBe('inactive');
    });
    it('maps pending → pending', () => {
      expect(mapCampaignStatus('pending')).toBe('pending');
    });
    it('maps unknown → pending (fallback)', () => {
      expect(mapCampaignStatus('archived' as any)).toBe('pending');
    });
  });

  describe('mapDealStatus', () => {
    it('maps active → active', () => {
      expect(mapDealStatus('active')).toBe('active');
    });
    it('maps inactive → inactive', () => {
      expect(mapDealStatus('inactive')).toBe('inactive');
    });
    it('maps expired → expired', () => {
      expect(mapDealStatus('expired')).toBe('expired');
    });
    it('maps unknown → pending (fallback)', () => {
      expect(mapDealStatus('unknown' as any)).toBe('pending');
    });
  });

  describe('mapDealType', () => {
    it('maps voucher → voucher', () => {
      expect(mapDealType('voucher')).toBe('voucher');
    });
    it('maps promotion → promotion', () => {
      expect(mapDealType('promotion')).toBe('promotion');
    });
    it('maps cashback → coupon', () => {
      expect(mapDealType('cashback')).toBe('coupon');
    });
    it('maps flash_sale → deal', () => {
      expect(mapDealType('flash_sale')).toBe('deal');
    });
    it('maps unknown → deal (fallback)', () => {
      expect(mapDealType('unknown' as any)).toBe('deal');
    });
  });

  describe('mapDiscountType', () => {
    it('maps percent → percent', () => {
      expect(mapDiscountType('percent')).toBe('percent');
    });
    it('maps fixed → fixed', () => {
      expect(mapDiscountType('fixed')).toBe('fixed');
    });
  });
});

// =============================================================================
// Confidence Score
// =============================================================================

describe('computeConfidenceScore', () => {
  const makeDeal = (overrides: Partial<Parameters<typeof computeConfidenceScore>[0]> = {}) => ({
    id: 1,
    campaign_id: 10,
    campaign_name: 'Shopee Vietnam',
    title: 'Giảm 50% mã ABC',
    description: 'Áp dụng cho đơn từ 500k',
    type: 'voucher' as const,
    discount_value: 50,
    discount_type: 'percent' as const,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    status: 'active' as const,
    is_exclusive: true,
    tracking_url: 'https://click.accesstrade.vn/abc',
    ...overrides,
  });

  it('base score starts at 0.3', () => {
    const deal = makeDeal({
      title: '', description: undefined, code: undefined,
      discount_value: 0, end_date: undefined, min_order_value: undefined,
      campaign_name: '', tracking_url: undefined, is_exclusive: false,
    });
    expect(computeConfidenceScore(deal)).toBeGreaterThanOrEqual(0.3);
  });

  it('adds score for coupon code', () => {
    const withCode = makeDeal({ code: 'SAVE50', tracking_url: undefined, is_exclusive: false });
    const withoutCode = makeDeal({ code: undefined, tracking_url: undefined, is_exclusive: false });
    expect(computeConfidenceScore(withCode)).toBeGreaterThan(computeConfidenceScore(withoutCode));
  });

  it('caps expired deals at 0.5', () => {
    const expired = makeDeal({
      status: 'expired',
      end_date: new Date(Date.now() - 86400000).toISOString(),
      code: 'ANYCODE',
    });
    expect(computeConfidenceScore(expired)).toBeLessThanOrEqual(0.5);
  });

  it('never exceeds 1.0', () => {
    const full = makeDeal({ code: 'MAXCODE', min_order_value: 100, is_exclusive: true });
    expect(computeConfidenceScore(full)).toBeLessThanOrEqual(1.0);
  });
});

// =============================================================================
// Dedupe Hash
// =============================================================================

describe('computeOfferHash', () => {
  it('produces deterministic SHA-256 hash', () => {
    const hash1 = computeOfferHash({
      source: 'accesstrade',
      sourceType: 'voucher',
      title: 'Giảm 20%',
      merchantName: 'Shopee',
      couponCode: 'SALE20',
    });
    const hash2 = computeOfferHash({
      source: 'accesstrade',
      sourceType: 'voucher',
      title: 'Giảm 20%',
      merchantName: 'Shopee',
      couponCode: 'SALE20',
    });
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different coupon codes', () => {
    const hash1 = computeOfferHash({
      source: 'accesstrade', sourceType: 'voucher',
      title: 'Giảm 20%', merchantName: 'Shopee', couponCode: 'A',
    });
    const hash2 = computeOfferHash({
      source: 'accesstrade', sourceType: 'voucher',
      title: 'Giảm 20%', merchantName: 'Shopee', couponCode: 'B',
    });
    expect(hash1).not.toBe(hash2);
  });

  it('treats null coupon code consistently', () => {
    const hash1 = computeOfferHash({
      source: 'accesstrade', sourceType: 'voucher',
      title: 'Giảm 20%', merchantName: 'Shopee', couponCode: null,
    });
    const hash2 = computeOfferHash({
      source: 'accesstrade', sourceType: 'voucher',
      title: 'Giảm 20%', merchantName: 'Shopee', couponCode: null,
    });
    expect(hash1).toBe(hash2);
  });

  it('is case-insensitive for merchantName and couponCode', () => {
    const hash1 = computeOfferHash({
      source: 'accesstrade', sourceType: 'voucher',
      title: 'Shopee Sale', merchantName: 'SHOPEE', couponCode: 'CODE',
    });
    const hash2 = computeOfferHash({
      source: 'accesstrade', sourceType: 'voucher',
      title: 'Shopee Sale', merchantName: 'shopee', couponCode: 'code',
    });
    expect(hash1).toBe(hash2);
  });

  it('hashes are 64-char hex (SHA-256)', () => {
    const hash = computeOfferHash({
      source: 'accesstrade', sourceType: 'voucher',
      title: 'Test', merchantName: 'Merchant', couponCode: null,
    });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

// =============================================================================
// Deal → Offer Mapping
// =============================================================================

describe('mapDealToOffer', () => {
  const deal = {
    id: 123,
    campaign_id: 456,
    campaign_name: '  Shopee Vietnam  ',
    title: '  Giảm 20% Mã ABC  ',
    description: '  Áp dụng cho đơn từ 200k.  Nhanh tay!  ',
    type: 'voucher' as const,
    discount_value: 20,
    discount_type: 'percent' as const,
    code: '  ABC123  ',
    min_order_value: 200000,
    max_discount: 100000,
    start_date: '2026-03-01T00:00:00Z',
    end_date: '2026-04-01T23:59:59Z',
    status: 'active' as const,
    tracking_url: 'https://click.accesstrade.vn/abc',
    is_exclusive: true,
  };

  it('sets source to accesstrade', () => {
    const offer = mapDealToOffer(deal, {});
    expect(offer.source).toBe('accesstrade');
  });

  it('maps source_type correctly', () => {
    expect(mapDealToOffer({ ...deal, type: 'voucher' }, {}).source_type).toBe('voucher');
    expect(mapDealToOffer({ ...deal, type: 'promotion' }, {}).source_type).toBe('promotion');
    expect(mapDealToOffer({ ...deal, type: 'cashback' }, {}).source_type).toBe('coupon');
  });

  it('generates correct external_id', () => {
    const offer = mapDealToOffer(deal, {});
    expect(offer.external_id).toBe('at_deal_123');
  });

  it('trims and collapses whitespace in title', () => {
    const offer = mapDealToOffer(deal, {});
    expect(offer.title).toBe('Giảm 20% Mã ABC');
    expect(offer.title).not.toContain('  ');
  });

  it('trims description', () => {
    const offer = mapDealToOffer(deal, {});
    expect(offer.description).toBe('Áp dụng cho đơn từ 200k. Nhanh tay!');
  });

  it('stores raw_payload_jsonb intact', () => {
    const raw = { original: 'data', nested: { value: 42 } };
    const offer = mapDealToOffer(deal, raw);
    expect(offer.raw_payload_jsonb).toEqual(raw);
  });

  it('sets currency to VND', () => {
    const offer = mapDealToOffer(deal, {});
    expect(offer.currency).toBe('VND');
  });

  it('maps discount fields correctly', () => {
    const offer = mapDealToOffer(deal, {});
    expect(offer.discount_type).toBe('percent');
    expect(offer.discount_value).toBe(20);
    expect(offer.coupon_code).toBe('ABC123');
    expect(offer.min_order_value).toBe(200000);
    expect(offer.max_discount).toBe(100000);
  });

  it('sets timestamps', () => {
    const offer = mapDealToOffer(deal, {});
    expect(offer.start_at).toBeTruthy();
    expect(offer.end_at).toBeTruthy();
    expect(offer.last_seen_at).toBeTruthy();
    expect(offer.first_seen_at).toBeTruthy();
    expect(offer.synced_at).toBeTruthy();
  });

  it('includes a valid normalized_hash', () => {
    const offer = mapDealToOffer(deal, {});
    expect(offer.normalized_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('infers platform from campaign_name', () => {
    const shopeeOffer = mapDealToOffer({ ...deal, campaign_name: 'Shopee Vietnam' }, {});
    expect(shopeeOffer.category).toBe('shopee');

    const lazadaOffer = mapDealToOffer({ ...deal, campaign_name: 'Lazada Mall' }, {});
    expect(lazadaOffer.category).toBe('lazada');

    const tikiOffer = mapDealToOffer({ ...deal, campaign_name: 'Tiki.vn Flash Sale' }, {});
    expect(tikiOffer.category).toBe('tiki');
  });

  it('handles deal without coupon code', () => {
    const noCode = { ...deal, code: undefined };
    const offer = mapDealToOffer(noCode, {});
    expect(offer.coupon_code).toBeNull();
  });

  it('maps expired status correctly', () => {
    const expired = { ...deal, status: 'expired' as const };
    const offer = mapDealToOffer(expired, {});
    expect(offer.status).toBe('expired');
  });
});

// =============================================================================
// Campaign → Offer Mapping
// =============================================================================

describe('mapCampaignToOffer', () => {
  const campaign = {
    id: 789,
    name: 'Shopee Vietnam',
    description: 'CPS campaign for Shopee',
    commission_type: 'cps' as const,
    commission_value: 15,
    commission_percent: 15,
    cookie_duration: 7,
    status: 'active' as const,
    url: 'https://shopee.vn',
    categories: ['E-commerce', 'Shopping'],
  };

  it('sets source to accesstrade', () => {
    const offer = mapCampaignToOffer(campaign, {});
    expect(offer.source).toBe('accesstrade');
  });

  it('sets source_type to campaign', () => {
    const offer = mapCampaignToOffer(campaign, {});
    expect(offer.source_type).toBe('campaign');
  });

  it('generates correct external_id', () => {
    const offer = mapCampaignToOffer(campaign, {});
    expect(offer.external_id).toBe('at_campaign_789');
  });

  it('stores categories as comma-separated string', () => {
    const offer = mapCampaignToOffer(campaign, {});
    expect(offer.category).toBe('E-commerce, Shopping');
  });

  it('stores raw_payload_jsonb intact', () => {
    const raw = { campaignId: 789 };
    const offer = mapCampaignToOffer(campaign, raw);
    expect(offer.raw_payload_jsonb).toEqual(raw);
  });

  it('maps destination_url correctly', () => {
    const offer = mapCampaignToOffer(campaign, {});
    expect(offer.destination_url).toBe('https://shopee.vn/');
  });

  it('has no coupon_code', () => {
    const offer = mapCampaignToOffer(campaign, {});
    expect(offer.coupon_code).toBeNull();
  });
});
