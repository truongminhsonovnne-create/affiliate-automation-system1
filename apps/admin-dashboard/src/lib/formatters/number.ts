/**
 * Number Formatters
 *
 * Utilities for formatting numbers and counts.
 */

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return '-';
  return new Intl.NumberFormat('vi-VN').format(num);
}

/**
 * Format compact number (e.g., 1.2K, 3.5M)
 */
export function formatCompactNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return '-';

  if (num < 1000) {
    return String(num);
  }

  if (num < 1000000) {
    const formatted = num / 1000;
    return `${formatted % 1 === 0 ? formatted.toFixed(0) : formatted.toFixed(1)}K`;
  }

  if (num < 1000000000) {
    const formatted = num / 1000000;
    return `${formatted % 1 === 0 ? formatted.toFixed(0) : formatted.toFixed(1)}M`;
  }

  const formatted = num / 1000000000;
  return `${formatted % 1 === 0 ? formatted.toFixed(0) : formatted.toFixed(1)}B`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number | undefined | null, decimals: number = 1): string {
  if (value === undefined || value === null) return '-';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format ratio (e.g., 3/5)
 */
export function formatRatio(numerator: number | undefined | null, denominator: number | undefined | null): string {
  if (numerator === undefined || numerator === null || denominator === undefined || denominator === null) return '-';
  if (denominator === 0) return '-';
  return `${numerator}/${denominator}`;
}

/**
 * Format currency (VND) - alias for formatCurrencyVND
 */
export function formatCurrency(amount: number | undefined | null): string {
  return formatCurrencyVND(amount);
}

/**
 * Format currency (VND)
 */
export function formatCurrencyVND(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number | undefined | null): string {
  if (bytes === undefined || bytes === null) return '-';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
