/**
 * Unit tests for resolve-normalize.ts
 */

import { normalizeInput, validateInput } from '../resolve-normalize';

describe('normalizeInput', () => {
  describe('Shopee', () => {
    it('extracts shopId and itemId from path format', () => {
      const result = normalizeInput(
        'https://shopee.vn/-i.123456.789012345/product-name.sp?spm=xxx'
      );
      expect(result.platform).toBe('shopee');
      expect(result.shopId).toBe('123456');
      expect(result.itemId).toBe('789012345');
    });

    it('extracts from query string format', () => {
      const result = normalizeInput(
        'https://shopee.vn/product?shopid=999&itemid=12345'
      );
      expect(result.platform).toBe('shopee');
      expect(result.shopId).toBe('999');
      expect(result.itemId).toBe('12345');
    });

    it('strips tracking params from shopee URL', () => {
      const result = normalizeInput(
        'https://shopee.vn/product?spm=a&fbclid=b&itemid=123&shopid=456'
      );
      expect(result.cleanUrl).not.toContain('fbclid');
      expect(result.cleanUrl).not.toContain('spm');
      expect(result.itemId).toBe('123');
      expect(result.shopId).toBe('456');
    });
  });

  describe('Lazada', () => {
    it('extracts itemId from lazada URL', () => {
      const result = normalizeInput(
        'https://www.lazada.vn/products/test-123456.html?spm=xxx'
      );
      expect(result.platform).toBe('lazada');
      expect(result.itemId).toBe('123456');
    });

    it('extracts shopId from query param', () => {
      const result = normalizeInput(
        'https://www.lazada.vn/products/test-123456.html?shop_id=777'
      );
      expect(result.platform).toBe('lazada');
      expect(result.itemId).toBe('123456');
      expect(result.shopId).toBe('777');
    });
  });

  describe('Tiki', () => {
    it('extracts itemId from tiki URL', () => {
      const result = normalizeInput(
        'https://tiki.vn/ao-so-mi-p123456.html'
      );
      expect(result.platform).toBe('tiki');
      expect(result.itemId).toBe('123456');
    });
  });

  describe('TikTok', () => {
    it('extracts shop and item from tiktok URL', () => {
      const result = normalizeInput(
        'https://tiktok.com/@myshop/item/987654321'
      );
      expect(result.platform).toBe('tiktok');
      expect(result.shopId).toBe('myshop');
      expect(result.itemId).toBe('987654321');
    });
  });

  describe('Unknown platform', () => {
    it('marks unknown platform correctly', () => {
      const result = normalizeInput('https://random-site.vn/product/123');
      expect(result.platform).toBe('unknown');
    });
  });

  describe('queryKey', () => {
    it('builds consistent query key', () => {
      const a = normalizeInput('https://shopee.vn/-i.1.2.sp');
      const b = normalizeInput('https://shopee.vn/-i.1.2.sp?fbclid=xxx');
      expect(a.queryKey).toBe(b.queryKey);
    });

    it('queryKey includes platform and IDs', () => {
      const result = normalizeInput('https://shopee.vn/-i.100.200.sp');
      expect(result.queryKey).toBe('shopee::100::200');
    });
  });
});

describe('validateInput', () => {
  it('rejects non-string input', () => {
    const result = validateInput(123);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe('INVALID_INPUT');
    }
  });

  it('rejects empty string', () => {
    const result = validateInput('');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe('INPUT_TOO_SHORT');
    }
  });

  it('rejects string shorter than 10 chars', () => {
    const result = validateInput('https://x.co');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe('INPUT_TOO_SHORT');
    }
  });

  it('rejects unsupported platform URL', () => {
    const result = validateInput('https://amazon.com/product/123');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe('UNSUPPORTED_PLATFORM');
    }
  });

  it('accepts valid Shopee URL', () => {
    const result = validateInput('https://shopee.vn/-i.1.2.product.sp');
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.normalized.platform).toBe('shopee');
    }
  });

  it('accepts valid Tiki URL', () => {
    const result = validateInput('https://tiki.vn/ao-p123456.html');
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.normalized.platform).toBe('tiki');
    }
  });
});
