/**
 * MasOffer Mapper — Unit Tests
 *
 * Covers:
 *  - Date parsing (ISO, dd/mm/yyyy, mm/dd/yyyy)
 *  - Status mapping
 *  - Discount type mapping
 *  - Discount value parsing
 *  - Confidence score calculation
 *  - Dedup hash determinism
 *  - Offer type detection
 *  - Full normaliser (mapOfferItemToOffer, mapCampaignToOffer)
 *  - Slug generation
 */

import { describe, it, expect } from 'vitest';
import {
  parseMasOfferDate,
  parseMasOfferDateTime,
  mapMasOfferStatus,
  mapDiscountType,
  detectOfferType,
  parseDiscountValue,
  computeMasOfferConfidenceScore,
  computeMasOfferOfferHash,
  computeMasOfferCampaignHash,
  mapOfferItemToOffer,
  mapCampaignToOffer,
  toSlug,
} from '../masoffer.mapper.js';
import type { MasOfferOfferItem, MasOfferCampaign } from '../masoffer.types.js';

// =============================================================================
// Date Parsing
// =============================================================================

describe('parseMasOfferDate', () => {
  it('parses ISO date YYYY-MM-DD', () => {
    expect(parseMasOfferDate('2025-01-15')).toBe('2025-01-15');
  });

  it('parses ISO datetime YYYY-MM-DDTHH:MM:SS', () => {
    expect(parseMasOfferDate('2025-01-15T00:00:00')).toBe('2025-01-15');
  });

  it('parses dd/mm/yyyy format (Vietnam)', () => {
    expect(parseMasOfferDate('15/01/2025')).toBe('2025-01-15');
  });

  it('parses single-digit day and month dd/mm/yyyy', () => {
    expect(parseMasOfferDate('5/3/2025')).toBe('2025-03-05');
  });

  it('returns null for unrecognised format', () => {
    expect(parseMasOfferDate('January 15, 2025')).toBeNull();
    expect(parseMasOfferDate('invalid')).toBeNull();
    expect(parseMasOfferDate('')).toBeNull();
    expect(parseMasOfferDate(undefined)).toBeNull();
    expect(parseMasOfferDate(null)).toBeNull();
  });

  it('trims whitespace before parsing', () => {
    expect(parseMasOfferDate('  2025-01-15  ')).toBe('2025-01-15');
  });
});

describe('parseMasOfferDateTime', () => {
  it('parses ISO datetime with Z suffix', () => {
    expect(parseMasOfferDateTime('2025-01-15T09:30:00Z')).toBe('2025-01-15T09:30:00Z');
  });

  it('parses ISO datetime without Z suffix', () => {
    const result = parseMasOfferDateTime('2025-01-15T09:30:00');
    expect(result).not.toBeNull();
    expect(result!.startsWith('2025-01-15')).toBe(true);
  });

  it('parses dd/mm/yyyy hh:mm:ss', () => {
    const result = parseMasOfferDateTime('15/01/2025 09:30:00');
    expect(result).not.toBeNull();
    expect(result!.startsWith('2025-01-15')).toBe(true);
  });

  it('falls back to parseMasOfferDate when full datetime parse fails', () => {
    expect(parseMasOfferDateTime('2025-01-15')).toBe('2025-01-15');
  });

  it('returns null for completely unrecognised input', () => {
    expect(parseMasOfferDateTime('not a date')).toBeNull();
  });
});

// =============================================================================
// Status Mapping
// =============================================================================

describe('mapMasOfferStatus', () => {
  it('maps "active" to active', () => {
    expect(mapMasOfferStatus('active')).toBe('active');
  });

  it('maps "1" and "true" to active', () => {
    expect(mapMasOfferStatus('1')).toBe('active');
    expect(mapMasOfferStatus('true')).toBe('active');
  });

  it('maps "expired" and "ended" to expired', () => {
    expect(mapMasOfferStatus('expired')).toBe('expired');
    expect(mapMasOfferStatus('ended')).toBe('expired');
  });

  it('maps unknown values to inactive', () => {
    expect(mapMasOfferStatus('pending')).toBe('inactive');
    expect(mapMasOfferStatus('unknown')).toBe('inactive');
    expect(mapMasOfferStatus('')).toBe('inactive');
    expect(mapMasOfferStatus(undefined)).toBe('inactive');
    expect(mapMasOfferStatus(null)).toBe('inactive');
  });

  it('is case-insensitive', () => {
    expect(mapMasOfferStatus('ACTIVE')).toBe('active');
    expect(mapMasOfferStatus('Expired')).toBe('expired');
  });
});

// =============================================================================
// Discount Type Mapping
// =============================================================================

describe('mapDiscountType', () => {
  it('maps percentage variants to percent', () => {
    expect(mapDiscountType('percentage')).toBe('percent');
    expect(mapDiscountType('%')).toBe('percent');
    expect(mapDiscountType('50%')).toBe('percent');
    expect(mapDiscountType('PERCENTAGE')).toBe('percent');
  });

  it('maps fixed/amount to fixed', () => {
    expect(mapDiscountType('fixed')).toBe('fixed');
    expect(mapDiscountType('amount')).toBe('fixed');
    expect(mapDiscountType('FIXED')).toBe('fixed');
  });

  it('maps free_shipping variants to free_shipping', () => {
    expect(mapDiscountType('free_shipping')).toBe('free_shipping');
    expect(mapDiscountType('freeshipping')).toBe('free_shipping');
    expect(mapDiscountType('shipping')).toBe('free_shipping');
  });

  it('maps unknown/null to other', () => {
    expect(mapDiscountType('unknown')).toBe('other');
    expect(mapDiscountType('')).toBe('other');
    expect(mapDiscountType(undefined)).toBe('other');
    expect(mapDiscountType(null)).toBe('other');
  });
});

// =============================================================================
// Discount Value Parsing
// =============================================================================

describe('parseDiscountValue', () => {
  it('parses plain number strings', () => {
    expect(parseDiscountValue('20')).toBe(20);
    expect(parseDiscountValue('200000')).toBe(200000);
    expect(parseDiscountValue('3.5')).toBe(3.5);
  });

  it('strips % sign', () => {
    expect(parseDiscountValue('20%')).toBe(20);
    expect(parseDiscountValue('3.5%')).toBe(3.5);
  });

  it('strips comma separators', () => {
    expect(parseDiscountValue('200,000')).toBe(200000);
    expect(parseDiscountValue('1,234.56')).toBe(1234.56);
  });

  it('returns null for invalid input', () => {
    expect(parseDiscountValue('')).toBeNull();
    expect(parseDiscountValue('N/A')).toBeNull();
    expect(parseDiscountValue(undefined)).toBeNull();
  });
});

// =============================================================================
// Offer Type Detection
// =============================================================================

describe('detectOfferType', () => {
  it('returns coupon when code is present', () => {
    const item: MasOfferOfferItem = { id: 1, title: 'Test', code: 'SAVE20' };
    expect(detectOfferType(item)).toBe('coupon');
  });

  it('returns voucher for free_shipping', () => {
    const item: MasOfferOfferItem = { id: 1, title: 'Free ship', discount_type: 'free_shipping' };
    expect(detectOfferType(item)).toBe('voucher');
  });

  it('returns deal by default', () => {
    const item: MasOfferOfferItem = { id: 1, title: 'Flash Sale', discount_type: 'percentage' };
    expect(detectOfferType(item)).toBe('deal');
  });
});

// =============================================================================
// Confidence Score
// =============================================================================

describe('computeMasOfferConfidenceScore', () => {
  it('returns 0.30 for item with only title', () => {
    const item: MasOfferOfferItem = { id: 1, title: 'Valid Title Here' };
    expect(computeMasOfferConfidenceScore(item)).toBe(0.30);
  });

  it('adds 0.20 for active status', () => {
    const item: MasOfferOfferItem = { id: 1, title: 'Valid Title', status: 'active' };
    expect(computeMasOfferConfidenceScore(item)).toBe(0.50);
  });

  it('adds 0.15 for code >= 3 chars', () => {
    const item: MasOfferOfferItem = { id: 1, title: 'Valid Title', code: 'ABC' };
    expect(computeMasOfferConfidenceScore(item)).toBe(0.45);
  });

  it('adds 0.10 for discount_value', () => {
    const item: MasOfferOfferItem = { id: 1, title: 'Valid Title', discount_value: '20%' };
    expect(computeMasOfferConfidenceScore(item)).toBe(0.40);
  });

  it('adds 0.10 for valid http link', () => {
    const item: MasOfferOfferItem = { id: 1, title: 'Valid Title', link: 'https://example.com' };
    expect(computeMasOfferConfidenceScore(item)).toBe(0.40);
  });

  it('adds 0.05 for verified flag', () => {
    const item: MasOfferOfferItem = { id: 1, title: 'Valid Title', verified: true };
    expect(computeMasOfferConfidenceScore(item)).toBe(0.35);
  });

  it('adds 0.05 for image or logo', () => {
    const item: MasOfferOfferItem = { id: 1, title: 'Valid Title', image_url: 'https://img.com/1.jpg' };
    expect(computeMasOfferConfidenceScore(item)).toBe(0.35);
  });

  it('returns 1.00 for a complete record (all signals present)', () => {
    const item: MasOfferOfferItem = {
      id: 1,
      title: 'Valid Title',
      status: 'active',
      code: 'SAVE20',
      discount_value: '20%',
      link: 'https://example.com',
      verified: true,
      image_url: 'https://img.com/1.jpg',
      end_date: '2030-12-31', // future date → adds 0.05
    };
    // 0.30 + 0.20 + 0.15 + 0.10 + 0.10 + 0.05 + 0.05 + 0.05 = 1.00
    expect(computeMasOfferConfidenceScore(item)).toBe(1.00);
  });

  it('does not add future end_date bonus if end_date is in the past', () => {
    const item: MasOfferOfferItem = {
      id: 1,
      title: 'Valid Title',
      status: 'active',
      end_date: '2020-01-01', // expired
    };
    expect(computeMasOfferConfidenceScore(item)).toBe(0.50); // 0.30 title + 0.20 active, no future bonus
  });

  it('returns 0.00 for an empty item', () => {
    const item: MasOfferOfferItem = { id: 1, title: '' };
    expect(computeMasOfferConfidenceScore(item)).toBe(0.00);
  });

  it('rounds to 2 decimal places', () => {
    const item: MasOfferOfferItem = {
      id: 1,
      title: 'Valid Title',
      status: 'active',
      link: 'https://example.com',
      end_date: '2030-12-31', // future → adds 0.05
    };
    // 0.30 (title) + 0.20 (active) + 0.10 (link) + 0.05 (future) = 0.65
    expect(computeMasOfferConfidenceScore(item)).toBe(0.65);
  });
});

// =============================================================================
// Dedup Hash
// =============================================================================

describe('computeMasOfferOfferHash', () => {
  it('produces a deterministic SHA-256 hash', () => {
    const item: MasOfferOfferItem = { id: 1, title: 'Test Offer', code: 'SAVE10', discount_value: '10%' };
    const hash1 = computeMasOfferOfferHash(item);
    const hash2 = computeMasOfferOfferHash(item);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces different hashes for different ids', () => {
    const item1: MasOfferOfferItem = { id: 1, title: 'Test' };
    const item2: MasOfferOfferItem = { id: 2, title: 'Test' };
    expect(computeMasOfferOfferHash(item1)).not.toBe(computeMasOfferOfferHash(item2));
  });

  it('is case-insensitive for title and code', () => {
    const item1: MasOfferOfferItem = { id: 1, title: 'Test Offer' };
    const item2: MasOfferOfferItem = { id: 1, title: 'TEST OFFER' };
    expect(computeMasOfferOfferHash(item1)).toBe(computeMasOfferOfferHash(item2));
  });

  it('treats missing code as empty string', () => {
    const item1: MasOfferOfferItem = { id: 1, title: 'Test' };
    const item2: MasOfferOfferItem = { id: 1, title: 'Test', code: '' };
    expect(computeMasOfferOfferHash(item1)).toBe(computeMasOfferOfferHash(item2));
  });
});

describe('computeMasOfferCampaignHash', () => {
  it('produces a deterministic SHA-256 hash', () => {
    const campaign: MasOfferCampaign = { id: 42, name: 'Test Campaign' };
    const hash1 = computeMasOfferCampaignHash(campaign);
    const hash2 = computeMasOfferCampaignHash(campaign);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });
});

// =============================================================================
// Full Normaliser
// =============================================================================

describe('mapOfferItemToOffer', () => {
  const NOW = '2025-01-01T00:00:00.000Z';

  it('maps a basic offer item', () => {
    const item: MasOfferOfferItem = {
      id: 123,
      title: '  Flash Sale 50% Off  ',
      description: 'Great deal',
      code: 'SAVE50',
      discount_type: 'percentage',
      discount_value: '50%',
      link: 'https://partner.com/offer/123',
      image_url: 'https://img.com/50.jpg',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      status: 'active',
      campaign_name: 'Partner Shop',
      campaign_id: 5,
      category: 'Fashion',
      terms: 'Terms and conditions apply',
    };

    const record = mapOfferItemToOffer(item, NOW);

    expect(record.source).toBe('masoffer');
    expect(record.external_id).toBe('mo_123');
    expect(record.title).toBe('Flash Sale 50% Off');
    expect(record.slug).toBe('flash-sale-50-off');
    expect(record.description).toBe('Great deal');
    expect(record.merchant_name).toBe('Partner Shop');
    expect(record.merchant_id).toBe('5');
    expect(record.category).toBe('Fashion');
    expect(record.destination_url).toBe('https://partner.com/offer/123');
    expect(record.coupon_code).toBe('SAVE50');
    expect(record.discount_type).toBe('percent');
    expect(record.discount_value).toBe(50);
    expect(record.image_url).toBe('https://img.com/50.jpg');
    expect(record.start_at).toBe('2025-01-01');
    expect(record.end_at).toBe('2025-12-31');
    expect(record.status).toBe('active');
    expect(record.terms).toBe('Terms and conditions apply');
    expect(record.currency).toBe('VND');
    expect(record.confidence_score).toBe(0.90);
    expect(record.source_type).toBe('coupon'); // has code
    expect(record.normalized_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(record.raw_payload_jsonb).toEqual(item);
    expect(record.first_seen_at).toBe(NOW);
    expect(record.last_seen_at).toBe(NOW);
    expect(record.synced_at).toBe(NOW);
  });

  it('uses title as merchant_name when campaign_name is missing', () => {
    const item: MasOfferOfferItem = { id: 1, title: 'Shop Sale' };
    const record = mapOfferItemToOffer(item, NOW);
    expect(record.merchant_name).toBe('Shop Sale');
  });

  it('returns null for fields not present in the API response', () => {
    const item: MasOfferOfferItem = { id: 1, title: 'Minimal Offer' };
    const record = mapOfferItemToOffer(item, NOW);

    expect(record.description).toBeNull();
    expect(record.coupon_code).toBeNull();
    expect(record.discount_type).toBe('other'); // null → 'other'
    expect(record.discount_value).toBeNull();
    expect(record.start_at).toBeNull();
    expect(record.end_at).toBeNull();
    expect(record.terms).toBeNull();
    expect(record.image_url).toBeNull();
    expect(record.source_type).toBe('deal'); // no code
  });

  it('detects voucher type for free_shipping', () => {
    const item: MasOfferOfferItem = { id: 1, title: 'Free Shipping', discount_type: 'free_shipping' };
    const record = mapOfferItemToOffer(item, NOW);
    expect(record.source_type).toBe('voucher');
    expect(record.discount_type).toBe('free_shipping');
  });

  it('parses dd/mm/yyyy end_date', () => {
    const item: MasOfferOfferItem = { id: 1, title: 'Test', end_date: '31/12/2025' };
    const record = mapOfferItemToOffer(item, NOW);
    expect(record.end_at).toBe('2025-12-31');
  });

  it('strips % from discount_value', () => {
    const item: MasOfferOfferItem = { id: 1, title: 'Test', discount_value: '3.5%' };
    const record = mapOfferItemToOffer(item, NOW);
    expect(record.discount_value).toBe(3.5);
  });
});

describe('mapCampaignToOffer', () => {
  const NOW = '2025-01-01T00:00:00.000Z';

  it('maps a campaign to the shared schema', () => {
    const campaign: MasOfferCampaign = {
      id: 7,
      name: 'Lazada Campaign',
      description: 'Lazada affiliate campaign',
      website_url: 'https://lazada.com',
      logo_url: 'https://lazada.com/logo.png',
      category: 'E-commerce',
      commission_rate: '5%',
      status: 'active',
      created_at: '2024-06-01',
    };

    const record = mapCampaignToOffer(campaign, NOW);

    expect(record.source).toBe('masoffer');
    expect(record.external_id).toBe('mo_camp_7');
    expect(record.source_type).toBe('campaign');
    expect(record.title).toBe('Lazada Campaign');
    expect(record.merchant_name).toBe('Lazada Campaign');
    expect(record.destination_url).toBe('https://lazada.com');
    expect(record.image_url).toBe('https://lazada.com/logo.png');
    expect(record.category).toBe('E-commerce');
    expect(record.status).toBe('active');
    expect(record.confidence_score).toBe(0.5);
    expect(record.normalized_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('maps inactive status correctly', () => {
    const campaign: MasOfferCampaign = { id: 1, name: 'Test', status: 'inactive' };
    const record = mapCampaignToOffer(campaign, NOW);
    expect(record.status).toBe('inactive');
  });
});

// =============================================================================
// Slug Generation
// =============================================================================

describe('toSlug', () => {
  it('converts basic text to kebab-case', () => {
    expect(toSlug('Flash Sale 50% Off')).toBe('flash-sale-50-off');
  });

  it('removes special characters', () => {
    expect(toSlug('Save 20%!!!')).toBe('save-20');
  });

  it('handles Vietnamese diacritics', () => {
    expect(toSlug('Khuyến Mãi Mạnh')).toBe('khuyen-mai-manh');
  });

  it('trims whitespace', () => {
    expect(toSlug('  Test  ')).toBe('test');
  });

  it('collapses multiple dashes', () => {
    expect(toSlug('Test---Offer')).toBe('test-offer');
  });

  it('limits to 80 characters', () => {
    const long = 'a'.repeat(100);
    expect(toSlug(long)).toHaveLength(80);
  });
});
