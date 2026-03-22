/**
 * Extraction Quality Assertions
 *
 * Assertions for validating crawler extraction quality.
 */

import type { ExtractionQualityAssertion } from '../types';
import {
  MIN_EXTRACTION_COVERAGE,
  MAX_AI_DESCRIPTION_LENGTH,
} from '../constants';

/**
 * Assertion result
 */
export interface AssertionResult {
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Validate field extraction
 */
export function assertExtractedField(
  field: string,
  expected: unknown,
  actual: unknown
): ExtractionQualityAssertion {
  const passed = actual === expected;
  return {
    field,
    expected: String(expected),
    actual: String(actual),
    passed,
  };
}

/**
 * Validate field exists
 */
export function assertFieldExists(
  data: Record<string, unknown>,
  field: string
): AssertionResult {
  const exists = field in data && data[field] !== null && data[field] !== undefined;

  return {
    passed: exists,
    message: exists
      ? `Field '${field}' exists`
      : `Field '${field}' is missing or null`,
    details: { field, value: data[field] },
  };
}

/**
 * Validate extraction coverage
 */
export function assertExtractionCoverage(
  extracted: Record<string, unknown>,
  expectedFields: string[],
  threshold = MIN_EXTRACTION_COVERAGE
): AssertionResult {
  const extractedFields = Object.keys(extracted);
  const coveredFields = expectedFields.filter((field) =>
    extractedFields.includes(field) && extracted[field] !== null
  );

  const coverage = (coveredFields.length / expectedFields.length) * 100;
  const passed = coverage >= threshold;

  return {
    passed,
    message: passed
      ? `Extraction coverage: ${coverage.toFixed(1)}% (threshold: ${threshold}%)`
      : `Extraction coverage too low: ${coverage.toFixed(1)}% (threshold: ${threshold}%)`,
    details: {
      coverage,
      threshold,
      coveredFields,
      missingFields: expectedFields.filter((f) => !coveredFields.includes(f)),
    },
  };
}

/**
 * Validate price extraction
 */
export function assertPriceExtraction(
  data: Record<string, unknown>
): AssertionResult {
  const price = data.price;
  const originalPrice = data.originalPrice;

  if (price === undefined || price === null) {
    return {
      passed: false,
      message: 'Price is missing',
      details: { price },
    };
  }

  if (typeof price !== 'number' || price <= 0) {
    return {
      passed: false,
      message: 'Price must be a positive number',
      details: { price, type: typeof price },
    };
  }

  if (originalPrice !== undefined && originalPrice !== null) {
    if (typeof originalPrice !== 'number' || originalPrice <= 0) {
      return {
        passed: false,
        message: 'Original price must be a positive number',
        details: { originalPrice },
      };
    }

    if (price > originalPrice) {
      return {
        passed: false,
        message: 'Price cannot exceed original price',
        details: { price, originalPrice },
      };
    }
  }

  return {
    passed: true,
    message: 'Price extraction is valid',
    details: { price, originalPrice },
  };
}

/**
 * Validate image extraction
 */
export function assertImageExtraction(
  data: Record<string, unknown>
): AssertionResult {
  const images = data.images;

  if (!images) {
    return {
      passed: false,
      message: 'Images field is missing',
      details: { images },
    };
  }

  if (!Array.isArray(images)) {
    return {
      passed: false,
      message: 'Images must be an array',
      details: { imagesType: typeof images },
    };
  }

  if (images.length === 0) {
    return {
      passed: false,
      message: 'At least one image is required',
      details: { imageCount: 0 },
    };
  }

  // Check if images have valid URLs
  const invalidImages = images.filter(
    (img) => typeof img !== 'string' && !img?.url
  );

  if (invalidImages.length > 0) {
    return {
      passed: false,
      message: 'Some images have invalid format',
      details: { invalidImageCount: invalidImages.length },
    };
  }

  return {
    passed: true,
    message: `Image extraction valid (${images.length} images)`,
    details: { imageCount: images.length },
  };
}

/**
 * Validate shop extraction
 */
export function assertShopExtraction(
  data: Record<string, unknown>
): AssertionResult {
  const shop = data.shop;

  if (!shop) {
    return {
      passed: false,
      message: 'Shop information is missing',
      details: { shop },
    };
  }

  const requiredFields = ['shopId', 'name'];
  const missingFields = requiredFields.filter((field) => !(shop as Record<string, unknown>)[field]);

  if (missingFields.length > 0) {
    return {
      passed: false,
      message: `Shop missing required fields: ${missingFields.join(', ')}`,
      details: { missingFields, shop },
    };
  }

  // Validate rating if present
  const rating = (shop as Record<string, unknown>).rating;
  if (rating !== undefined && rating !== null) {
    if (typeof rating !== 'number' || rating < 0 || rating > 5) {
      return {
        passed: false,
        message: 'Shop rating must be between 0 and 5',
        details: { rating },
      };
    }
  }

  return {
    passed: true,
    message: 'Shop extraction is valid',
    details: { shop },
  };
}

/**
 * Validate categories extraction
 */
export function assertCategoriesExtraction(
  data: Record<string, unknown>
): AssertionResult {
  const categories = data.categories;

  if (!categories) {
    return {
      passed: false,
      message: 'Categories are missing',
      details: { categories },
    };
  }

  if (!Array.isArray(categories)) {
    return {
      passed: false,
      message: 'Categories must be an array',
      details: { categoriesType: typeof categories },
    };
  }

  // Check if categories have valid structure
  const invalidCategories = categories.filter(
    (cat) => !cat?.id || !cat?.name
  );

  if (invalidCategories.length > 0) {
    return {
      passed: false,
      message: 'Some categories have invalid structure',
      details: { invalidCategoryCount: invalidCategories.length },
    };
  }

  return {
    passed: true,
    message: `Categories extraction valid (${categories.length} categories)`,
    details: { categoryCount: categories.length },
  };
}

/**
 * Validate product options extraction
 */
export function assertOptionsExtraction(
  data: Record<string, unknown>
): AssertionResult {
  const options = data.options;

  if (!options) {
    // Options are optional
    return {
      passed: true,
      message: 'No product options (optional)',
      details: { options: null },
    };
  }

  if (!Array.isArray(options)) {
    return {
      passed: false,
      message: 'Options must be an array',
      details: { optionsType: typeof options },
    };
  }

  // Validate each option
  for (const option of options) {
    if (!option?.name) {
      return {
        passed: false,
        message: 'Option missing name field',
        details: { option },
      };
    }

    if (!Array.isArray(option?.values) || option.values.length === 0) {
      return {
        passed: false,
        message: `Option '${option.name}' has no values`,
        details: { option },
      };
    }
  }

  return {
    passed: true,
    message: `Options extraction valid (${options.length} options)`,
    details: { optionCount: options.length },
  };
}

/**
 * Run all extraction assertions
 */
export function runExtractionAssertions(
  data: Record<string, unknown>
): {
  passed: boolean;
  results: AssertionResult[];
} {
  const results: AssertionResult[] = [
    assertFieldExists(data, 'itemId'),
    assertFieldExists(data, 'name'),
    assertPriceExtraction(data),
    assertImageExtraction(data),
    assertShopExtraction(data),
  ];

  // Optional fields
  if (data.categories) {
    results.push(assertCategoriesExtraction(data));
  }

  if (data.options) {
    results.push(assertOptionsExtraction(data));
  }

  const passed = results.every((r) => r.passed);

  return { passed, results };
}

/**
 * Validate extraction summary
 */
export function getExtractionSummary(
  data: Record<string, unknown>,
  expectedFields: string[]
): {
  coverage: number;
  fieldsFound: string[];
  fieldsMissing: string[];
  isValid: boolean;
} {
  const actualFields = Object.keys(data);
  const fieldsFound = expectedFields.filter((f) => actualFields.includes(f));
  const fieldsMissing = expectedFields.filter((f) => !actualFields.includes(f));
  const coverage = (fieldsFound.length / expectedFields.length) * 100;

  return {
    coverage,
    fieldsFound,
    fieldsMissing,
    isValid: coverage >= MIN_EXTRACTION_COVERAGE,
  };
}
