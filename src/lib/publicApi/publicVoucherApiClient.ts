// =============================================================================
// Public Voucher API Client
// Production-grade API client for consumer web
// =============================================================================

import { PublicVoucherResolveRequest, PublicVoucherResolveResponse } from '../../publicApi/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/public';

/**
 * Resolve voucher from public input
 */
export async function resolveVoucherFromPublicInput(
  input: string,
  options?: {
    limit?: number;
    requestId?: string;
  }
): Promise<PublicVoucherResolveResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/resolve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input,
      limit: options?.limit || 3,
      requestId: options?.requestId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Resolution failed');
  }

  return response.json();
}

/**
 * Get resolved voucher result by request ID (if supported)
 */
export async function getResolvedVoucherResult(
  requestId: string
): Promise<PublicVoucherResolveResponse | null> {
  const response = await fetch(`${API_BASE_URL}/v1/resolve/${requestId}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to get result');
  }

  return response.json();
}

/**
 * Health check for resolution API
 */
export async function checkResolutionApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/resolve/health`);
    return response.ok;
  } catch {
    return false;
  }
}
