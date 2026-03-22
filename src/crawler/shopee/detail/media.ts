/**
 * Shopee Detail Extraction - Media
 *
 * Handles image URL normalization and deduplication.
 */

import type { DetailLogger } from './types.js';
import { MEDIA, DETAIL_LIMITS } from './constants.js';

/**
 * Normalize Shopee image URLs
 *
 * @param rawUrls - Raw image URLs
 * @param options - Normalization options
 * @returns Normalized images
 */
export function normalizeShopeeImageUrls(
  rawUrls: string[],
  options: {
    /** Maximum images */
    maxImages?: number;
    /** Custom logger */
    logger?: DetailLogger;
  } = {}
): {
  images: string[];
  deduplicated: boolean;
  filtered: number;
} {
  const { maxImages = DETAIL_LIMITS.MAX_IMAGES, logger } = options;

  if (!rawUrls || rawUrls.length === 0) {
    return { images: [], deduplicated: false, filtered: 0 };
  }

  const filtered: string[] = [];
  let filteredCount = 0;

  for (const url of rawUrls) {
    // Skip empty or invalid
    if (!url || url.length < MEDIA.MIN_IMAGE_URL_LENGTH) {
      filteredCount++;
      continue;
    }

    // Skip data URLs
    if (url.startsWith('data:')) {
      filteredCount++;
      continue;
    }

    // Skip placeholder/loading images
    const isPlaceholder = MEDIA.FILTER_PATTERNS.some(pattern =>
      url.toLowerCase().includes(pattern.toLowerCase())
    );
    if (isPlaceholder) {
      filteredCount++;
      continue;
    }

    // Normalize URL
    let normalized = url.trim();

    // Add protocol if missing
    if (normalized.startsWith('//')) {
      normalized = 'https:' + normalized;
    }

    // Remove tracking parameters
    try {
      const urlObj = new URL(normalized);
      // Keep only essential path
      normalized = urlObj.origin + urlObj.pathname;
    } catch {
      // Keep as-is if parsing fails
    }

    filtered.push(normalized);
  }

  // Deduplicate
  const { uniqueImages, duplicatesRemoved } = dedupeImages(filtered);

  // Limit
  const limited = uniqueImages.slice(0, maxImages);
  const totalRemoved = filteredCount + duplicatesRemoved - (uniqueImages.length - limited.length);

  logger?.debug('Image normalization complete', {
    input: rawUrls.length,
    output: limited.length,
    filtered: filteredCount,
    duplicates: duplicatesRemoved,
  });

  return {
    images: limited,
    deduplicated: duplicatesRemoved > 0,
    filtered: totalRemoved,
  };
}

/**
 * Deduplicate images
 */
function dedupeImages(images: string[]): {
  uniqueImages: string[];
  duplicatesRemoved: number;
} {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const image of images) {
    // Create a normalized key for comparison
    const key = getImageKey(image);

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(image);
    }
  }

  return {
    uniqueImages: unique,
    duplicatesRemoved: images.length - unique.length,
  };
}

/**
 * Get image key for deduplication
 */
function getImageKey(url: string): string {
  // Extract the core identifier from Shopee image URLs
  // Shopee URLs typically: https://cf.shopee.vn/file/...
  // We want to normalize variations

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Get the file ID part
    const parts = pathname.split('/');
    const fileName = parts[parts.length - 1];

    // Remove common variations
    return fileName
      .replace(/_\d+x\d+/, '') // Remove size specifiers
      .replace(/_[a-z]+/, '') // Remove format specifiers like _tn
      .replace(/\.[a-z]+$/, ''); // Remove extension
  } catch {
    // Fallback: use the full URL
    return url.toLowerCase();
  }
}

/**
 * Select primary image from list
 *
 * @param images - List of images
 * @param options - Selection options
 * @returns Primary image URL
 */
export function selectPrimaryMedia(
  images: string[],
  options: {
    /** Prefer square images */
    preferSquare?: boolean;
    /** Custom logger */
    logger?: DetailLogger;
  } = {}
): string {
  const { preferSquare = true, logger } = options;

  if (!images || images.length === 0) {
    return '';
  }

  // First image is usually the primary product image
  const firstImage = images[0];

  if (!preferSquare) {
    return firstImage;
  }

  // Try to find a square image (typically the main product shot)
  for (const image of images) {
    // Check URL patterns that suggest square images
    // Shopee uses patterns like: /file/{id}_612x612.jpg
    if (image.includes('612x612') || image.includes('500x500')) {
      logger?.debug('Selected square primary image');
      return image;
    }
  }

  // Fall back to first image
  return firstImage;
}

/**
 * Validate image URL
 */
export function isValidImageUrl(url: string): boolean {
  if (!url || url.length < MEDIA.MIN_IMAGE_URL_LENGTH) {
    return false;
  }

  if (url.startsWith('data:')) {
    return false;
  }

  // Check for valid protocols
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Get image dimensions from URL
 */
export function getImageDimensionsFromUrl(url: string): {
  width?: number;
  height?: number;
} | undefined {
  try {
    // Shopee URL pattern: .../filename_123x456.jpg
    const match = url.match(/_(\d+)x(\d+)/);
    if (match) {
      return {
        width: parseInt(match[1], 10),
        height: parseInt(match[2], 10),
      };
    }
  } catch {
    // Ignore
  }
  return undefined;
}

/**
 * Sort images by quality (largest first)
 */
export function sortImagesByQuality(
  images: string[],
  options: {
    /** Custom logger */
    logger?: DetailLogger;
  } = {}
): string[] {
  const { logger } = options;

  const withDimensions = images.map(url => ({
    url,
    dimensions: getImageDimensionsFromUrl(url),
  }));

  // Sort by total pixels (width * height)
  withDimensions.sort((a, b) => {
    const aPixels = (a.dimensions?.width || 0) * (a.dimensions?.height || 0);
    const bPixels = (b.dimensions?.width || 0) * (b.dimensions?.height || 0);

    // If dimensions unknown, put at end
    if (aPixels === 0) return 1;
    if (bPixels === 0) return -1;

    return bPixels - aPixels;
  });

  const sorted = withDimensions.map(item => item.url);

  logger?.debug('Images sorted by quality', {
    input: images.length,
    output: sorted.length,
  });

  return sorted;
}
