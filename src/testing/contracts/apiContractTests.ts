/**
 * API Contract Tests
 *
 * Contract validation for external API integrations.
 */

import type { ContractValidationResult, ContractValidationError } from '../types';

/**
 * API contract definition
 */
export interface ApiContract {
  name: string;
  baseUrl: string;
  endpoints: ApiEndpoint[];
  headers?: Record<string, string>;
}

/**
 * API endpoint contract
 */
export interface ApiEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  requestSchema?: Record<string, unknown>;
  responseSchema?: Record<string, unknown>;
  requiredHeaders?: string[];
  expectedStatusCodes?: number[];
}

/**
 * Validate API endpoint contract
 */
export function validateApiEndpoint(
  contract: ApiContract,
  endpoint: ApiEndpoint,
  actualResponse: {
    status: number;
    headers: Record<string, string>;
    body?: unknown;
  }
): ContractValidationResult {
  const errors: ContractValidationError[] = [];
  const warnings: string[] = [];

  // Check status code
  if (endpoint.expectedStatusCodes && endpoint.expectedStatusCodes.length > 0) {
    if (!endpoint.expectedStatusCodes.includes(actualResponse.status)) {
      errors.push({
        path: 'status',
        message: `Unexpected status code: ${actualResponse.status}. Expected: ${endpoint.expectedStatusCodes.join(', ')}`,
        severity: 'error',
      });
    }
  }

  // Check required headers
  if (endpoint.requiredHeaders) {
    for (const header of endpoint.requiredHeaders) {
      if (!actualResponse.headers[header.toLowerCase()] && !actualResponse.headers[header]) {
        errors.push({
          path: `headers.${header}`,
          message: `Required header missing: ${header}`,
          severity: 'error',
        });
      }
    }
  }

  // Validate response body schema (if provided)
  if (endpoint.responseSchema && actualResponse.body) {
    const schemaErrors = validateSchema(
      endpoint.responseSchema,
      actualResponse.body as Record<string, unknown>
    );
    errors.push(...schemaErrors);
  }

  return {
    contract: `${contract.name}:${endpoint.method} ${endpoint.path}`,
    passed: errors.filter((e) => e.severity === 'error').length === 0,
    errors,
    warnings,
  };
}

/**
 * Simple schema validation
 */
function validateSchema(
  schema: Record<string, unknown>,
  data: Record<string, unknown>
): ContractValidationError[] {
  const errors: ContractValidationError[] = [];

  // Check required fields
  const required = schema.required as string[] | undefined;
  if (required) {
    for (const field of required) {
      if (!(field in data) || data[field] === null || data[field] === undefined) {
        errors.push({
          path: field,
          message: `Required field missing: ${field}`,
          severity: 'error',
        });
      }
    }
  }

  // Check types
  const properties = schema.properties as Record<string, unknown> | undefined;
  if (properties) {
    for (const [field, fieldSchema] of Object.entries(properties)) {
      if (field in data && data[field] !== null) {
        const expectedType = (fieldSchema as Record<string, unknown>).type as string;
        const actualType = Array.isArray(data[field]) ? 'array' : typeof data[field];

        if (expectedType && expectedType !== actualType) {
          errors.push({
            path: field,
            message: `Type mismatch: expected ${expectedType}, got ${actualType}`,
            severity: 'error',
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Shopee API contract
 */
export const shopeeApiContract: ApiContract = {
  name: 'shopee',
  baseUrl: 'https://shopee.vn/api/v4',
  endpoints: [
    {
      path: '/search/search_items',
      method: 'GET',
      responseSchema: {
        type: 'object',
        required: ['items'],
        properties: {
          items: { type: 'array' },
          total_count: { type: 'number' },
        },
      },
      expectedStatusCodes: [200],
    },
    {
      path: '/item/get',
      method: 'GET',
      responseSchema: {
        type: 'object',
        required: ['item'],
        properties: {
          item: { type: 'object' },
          shop: { type: 'object' },
        },
      },
      expectedStatusCodes: [200],
    },
    {
      path: '/shop/get_shop_info',
      method: 'GET',
      responseSchema: {
        type: 'object',
        required: ['shopid', 'name'],
        properties: {
          shopid: { type: 'number' },
          name: { type: 'string' },
          rating: { type: 'number' },
        },
      },
      expectedStatusCodes: [200],
    },
  ],
};

/**
 * Gemini API contract
 */
export const geminiApiContract: ApiContract = {
  name: 'gemini',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  endpoints: [
    {
      path: '/models/:model:generateContent',
      method: 'POST',
      requestSchema: {
        type: 'object',
        required: ['contents'],
        properties: {
          contents: { type: 'array' },
          generationConfig: { type: 'object' },
        },
      },
      responseSchema: {
        type: 'object',
        properties: {
          candidates: { type: 'array' },
          usageMetadata: { type: 'object' },
        },
      },
      requiredHeaders: ['Content-Type'],
      expectedStatusCodes: [200],
    },
  ],
};

/**
 * TikTok API contract
 */
export const tiktokApiContract: ApiContract = {
  name: 'tiktok',
  baseUrl: 'https://open.tiktokapis.com/v2',
  endpoints: [
    {
      path: '/video/upload/',
      method: 'POST',
      requiredHeaders: ['Authorization', 'Content-Type'],
      expectedStatusCodes: [200, 201],
    },
    {
      path: '/video/list/',
      method: 'POST',
      requiredHeaders: ['Authorization'],
      expectedStatusCodes: [200],
    },
  ],
};

/**
 * Facebook API contract
 */
export const facebookApiContract: ApiContract = {
  name: 'facebook',
  baseUrl: 'https://graph.facebook.com/v18.0',
  endpoints: [
    {
      path: '/me/photos',
      method: 'POST',
      requiredHeaders: ['Authorization'],
      expectedStatusCodes: [200],
    },
    {
      path: '/{post-id}',
      method: 'GET',
      requiredHeaders: ['Authorization'],
      expectedStatusCodes: [200, 404],
    },
  ],
};

/**
 * Get contract by name
 */
export function getApiContract(name: string): ApiContract | undefined {
  const contracts: Record<string, ApiContract> = {
    shopee: shopeeApiContract,
    gemini: geminiApiContract,
    tiktok: tiktokApiContract,
    facebook: facebookApiContract,
  };
  return contracts[name];
}

/**
 * Validate response against contract
 */
export function validateAgainstContract(
  contractName: string,
  endpoint: ApiEndpoint,
  response: {
    status: number;
    headers: Record<string, string>;
    body?: unknown;
  }
): ContractValidationResult {
  const contract = getApiContract(contractName);

  if (!contract) {
    return {
      contract: contractName,
      passed: false,
      errors: [
        {
          path: 'contract',
          message: `Unknown contract: ${contractName}`,
          severity: 'error',
        },
      ],
      warnings: [],
    };
  }

  return validateApiEndpoint(contract, endpoint, response);
}
