/**
 * Schema Contract Tests
 *
 * Contract validation for data schemas and types.
 */

import type { ContractValidationResult, ContractValidationError } from '../types';

/**
 * Schema type definitions
 */
export type JsonSchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';

/**
 * JSON Schema definition
 */
export interface JsonSchema {
  type?: JsonSchema | JsonSchemaType;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: unknown[];
  format?: string;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  additionalProperties?: boolean | JsonSchema;
}

/**
 * Schema validation context
 */
export interface SchemaValidationContext {
  path: string;
  errors: ContractValidationError[];
  warnings: string[];
}

/**
 * Validate data against JSON Schema
 */
export function validateJsonSchema(
  schema: JsonSchema,
  data: unknown,
  context: SchemaValidationContext = { path: '', errors: [], warnings: [] }
): ContractValidationResult {
  validateValue(schema, data, context);

  return {
    contract: context.path || 'schema',
    passed: context.errors.filter((e) => e.severity === 'error').length === 0,
    errors: context.errors,
    warnings: context.warnings,
  };
}

/**
 * Validate a value against schema
 */
function validateValue(
  schema: JsonSchema,
  value: unknown,
  context: SchemaValidationContext
): void {
  const path = context.path || 'root';

  // Type check
  if (schema.type) {
    const expectedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actualType = getType(value);

    if (!expectedTypes.includes(actualType as JsonSchemaType)) {
      context.errors.push({
        path,
        message: `Expected type ${expectedTypes.join(' | ')}, got ${actualType}`,
        severity: 'error',
      });
      return; // Cannot validate further if type is wrong
    }
  }

  // Null check
  if (value === null || value === undefined) {
    if (schema.type && !schema.type.includes('null')) {
      context.errors.push({
        path,
        message: 'Value is null but schema does not allow null',
        severity: 'error',
      });
    }
    return;
  }

  // Object validation
  if (schema.type === 'object' || typeof value === 'object') {
    validateObject(schema, value as Record<string, unknown>, context);
  }

  // Array validation
  if (schema.type === 'array' || Array.isArray(value)) {
    validateArray(schema, value as unknown[], context);
  }

  // String validation
  if (schema.type === 'string' && typeof value === 'string') {
    validateString(schema, value, context);
  }

  // Number validation
  if ((schema.type === 'number' || schema.type === 'integer') && typeof value === 'number') {
    validateNumber(schema, value, context);
  }

  // Boolean validation
  if (schema.type === 'boolean' && typeof value === 'boolean') {
    // No additional validation needed
  }

  // Enum validation
  if (schema.enum && !schema.enum.includes(value)) {
    context.errors.push({
      path,
      message: `Value not in enum: ${JSON.stringify(schema.enum)}`,
      severity: 'error',
    });
  }

  // oneOf validation
  if (schema.oneOf) {
    const matched = schema.oneOf.some((s) => {
      const tempContext: SchemaValidationContext = { path, errors: [], warnings: [] };
      validateValue(s, value, tempContext);
      return tempContext.errors.length === 0;
    });

    if (!matched) {
      context.errors.push({
        path,
        message: 'Value did not match any schema in oneOf',
        severity: 'error',
      });
    }
  }
}

/**
 * Validate object against schema
 */
function validateObject(
  schema: JsonSchema,
  obj: Record<string, unknown>,
  context: SchemaValidationContext
): void {
  const path = context.path || 'root';

  // Required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in obj)) {
        context.errors.push({
          path: `${path}.${field}`,
          message: `Required field missing: ${field}`,
          severity: 'error',
        });
      }
    }
  }

  // Properties
  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (key in obj) {
        validateValue(propSchema, obj[key], {
          ...context,
          path: `${path}.${key}`,
        });
      }
    }
  }

  // Additional properties
  if (schema.additionalProperties === false && schema.properties) {
    const definedProps = new Set(Object.keys(schema.properties));
    const extraProps = Object.keys(obj).filter((k) => !definedProps.has(k));

    if (extraProps.length > 0) {
      context.errors.push({
        path,
        message: `Additional properties not allowed: ${extraProps.join(', ')}`,
        severity: 'error',
      });
    }
  } else if (typeof schema.additionalProperties === 'object') {
    // Validate additional properties against schema
    for (const [key, val] of Object.entries(obj)) {
      if (!schema.properties || !(key in schema.properties)) {
        validateValue(schema.additionalProperties, val, {
          ...context,
          path: `${path}.${key}`,
        });
      }
    }
  }
}

/**
 * Validate array against schema
 */
function validateArray(
  schema: JsonSchema,
  arr: unknown[],
  context: SchemaValidationContext
): void {
  const path = context.path || 'root';

  if (!schema.items) return;

  arr.forEach((item, index) => {
    validateValue(schema.items!, item, {
      ...context,
      path: `${path}[${index}]`,
    });
  });
}

/**
 * Validate string against schema
 */
function validateString(
  schema: JsonSchema,
  str: string,
  context: SchemaValidationContext
): void {
  const path = context.path || 'root';

  if (schema.minLength !== undefined && str.length < schema.minLength) {
    context.errors.push({
      path,
      message: `String too short: ${str.length} < ${schema.minLength}`,
      severity: 'error',
    });
  }

  if (schema.maxLength !== undefined && str.length > schema.maxLength) {
    context.errors.push({
      path,
      message: `String too long: ${str.length} > ${schema.maxLength}`,
      severity: 'error',
    });
  }

  if (schema.pattern) {
    const regex = new RegExp(schema.pattern);
    if (!regex.test(str)) {
      context.errors.push({
        path,
        message: `String does not match pattern: ${schema.pattern}`,
        severity: 'error',
      });
    }
  }

  if (schema.format) {
    if (!validateFormat(str, schema.format)) {
      context.warnings.push(`${path}: String format '${schema.format}' may be invalid`);
    }
  }
}

/**
 * Validate number against schema
 */
function validateNumber(
  schema: JsonSchema,
  num: number,
  context: SchemaValidationContext
): void {
  const path = context.path || 'root';

  if (schema.minimum !== undefined && num < schema.minimum) {
    context.errors.push({
      path,
      message: `Number too small: ${num} < ${schema.minimum}`,
      severity: 'error',
    });
  }

  if (schema.maximum !== undefined && num > schema.maximum) {
    context.errors.push({
      path,
      message: `Number too large: ${num} > ${schema.maximum}`,
      severity: 'error',
    });
  }
}

/**
 * Get type of value
 */
function getType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * Validate string format
 */
function validateFormat(str: string, format: string): boolean {
  const formats: Record<string, RegExp> = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    uri: /^https?:\/\/.+/,
    date: /^\d{4}-\d{2}-\d{2}$/,
    'date-time': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  };

  const regex = formats[format];
  return regex ? regex.test(str) : true;
}

// =============================================================================
// Common Schemas
// =============================================================================

/** Product schema */
export const productSchema: JsonSchema = {
  type: 'object',
  required: ['id', 'source', 'name', 'price'],
  properties: {
    id: { type: 'string' },
    source: { type: 'string', enum: ['shopee', 'lazada', 'tiki'] },
    name: { type: 'string', minLength: 1 },
    price: { type: 'number', minimum: 0 },
    originalPrice: { type: 'number', minimum: 0 },
    discount: { type: 'number', minimum: 0, maximum: 100 },
    images: { type: 'array', items: { type: 'string' } },
    url: { type: 'string', format: 'uri' },
    rating: { type: 'number', minimum: 0, maximum: 5 },
    reviewCount: { type: 'number', minimum: 0 },
  },
};

/** Publish job schema */
export const publishJobSchema: JsonSchema = {
  type: 'object',
  required: ['id', 'productId', 'channel', 'status', 'payload'],
  properties: {
    id: { type: 'string' },
    productId: { type: 'string' },
    channel: { type: 'string', enum: ['tiktok', 'facebook', 'instagram', 'youtube'] },
    status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'] },
    priority: { type: 'number', minimum: 0 },
    payload: { type: 'object' },
    attempts: { type: 'number', minimum: 0 },
    maxAttempts: { type: 'number', minimum: 1 },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    startedAt: { type: 'string', format: 'date-time' },
    completedAt: { type: 'string', format: 'date-time' },
  },
};

/** AI enrichment schema */
export const aiEnrichmentSchema: JsonSchema = {
  type: 'object',
  required: ['hashtags', 'description', 'title'],
  properties: {
    hashtags: {
      type: 'array',
      items: { type: 'string' },
      minLength: 3,
      maxLength: 10,
    },
    description: { type: 'string', minLength: 10, maxLength: 500 },
    title: { type: 'string', minLength: 10, maxLength: 200 },
    tags: { type: 'array', items: { type: 'string' } },
    meta: { type: 'object' },
  },
};

/** Shop schema */
export const shopSchema: JsonSchema = {
  type: 'object',
  required: ['shopId', 'name'],
  properties: {
    shopId: { type: 'string' },
    name: { type: 'string', minLength: 1 },
    rating: { type: 'number', minimum: 0, maximum: 5 },
    location: { type: 'string' },
    followerCount: { type: 'number', minimum: 0 },
    productCount: { type: 'number', minimum: 0 },
    responseRate: { type: 'number', minimum: 0, maximum: 100 },
  },
};

/**
 * Validate against common schema
 */
export function validateAgainstSchema(
  schemaName: string,
  data: unknown
): ContractValidationResult {
  const schemas: Record<string, JsonSchema> = {
    product: productSchema,
    'publish-job': publishJobSchema,
    'ai-enrichment': aiEnrichmentSchema,
    shop: shopSchema,
  };

  const schema = schemas[schemaName];

  if (!schema) {
    return {
      contract: schemaName,
      passed: false,
      errors: [
        {
          path: 'schema',
          message: `Unknown schema: ${schemaName}`,
          severity: 'error',
        },
      ],
      warnings: [],
    };
  }

  return validateJsonSchema(schema, data);
}
