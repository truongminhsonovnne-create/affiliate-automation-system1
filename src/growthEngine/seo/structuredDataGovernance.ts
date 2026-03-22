/**
 * Structured Data Governance
 *
 * Manages JSON-LD structured data for SEO with tool-first UX preservation.
 */

import { GrowthSurfaceType, GrowthSurfaceInventoryRecord } from '../types';

export interface StructuredDataConfig {
  enabled: boolean;
  types: string[];
  includesCta: boolean;
  includesBreadcrumb: boolean;
}

export interface StructuredDataResult {
  valid: boolean;
  schema: Record<string, unknown> | null;
  warnings: string[];
  errors: string[];
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface CtaData {
  text: string;
  url: string;
  toolName?: string;
}

/**
 * Generate structured data for a surface
 */
export function generateSurfaceStructuredData(
  surface: GrowthSurfaceInventoryRecord,
  options?: {
    includeBreadcrumb?: boolean;
    includeCta?: boolean;
    baseUrl?: string;
  }
): StructuredDataResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const includeBreadcrumb = options?.includeBreadcrumb ?? true;
  const includeCta = options?.includeCta ?? true;
  const baseUrl = options?.baseUrl ?? 'https://example.com';

  // Determine schema type based on surface type
  const schemaType = getSchemaTypeForSurfaceType(surface.surfaceType);

  if (!schemaType) {
    return {
      valid: false,
      schema: null,
      warnings: [],
      errors: [`No schema type defined for surface type: ${surface.surfaceType}`],
    };
  }

  // Build base schema
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: surface.routeKey,
    url: `${baseUrl}${surface.routePath}`,
  };

  // Add description if available
  if (surface.metadata?.description) {
    schema.description = surface.metadata.description;
  }

  // Add breadcrumbs if requested
  if (includeBreadcrumb) {
    const breadcrumb = generateBreadcrumb(surface, baseUrl);
    schema.breadcrumb = breadcrumb;
  }

  // Add CTA if requested and applicable
  if (includeCta && shouldIncludeCta(surface.surfaceType)) {
    const ctaData = extractCtaData(surface);
    if (ctaData) {
      schema.prosperateAction = {
        '@type': 'InteractAction',
        name: ctaData.text,
        target: ctaData.url,
      };
    }
  }

  // Add tool-specific structured data
  if (surface.surfaceType === GrowthSurfaceType.TOOL_ENTRY) {
    addToolStructuredData(schema, surface);
  }

  // Add ranking page specific data
  if (surface.surfaceType === GrowthSurfaceType.RANKING_PAGE) {
    addRankingPageStructuredData(schema, surface);
  }

  return {
    valid: errors.length === 0,
    schema,
    warnings,
    errors,
  };
}

/**
 * Validate structured data against Google guidelines
 */
export function validateStructuredData(
  schema: Record<string, unknown>
): { valid: boolean; warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check required fields
  if (!schema['@type']) {
    errors.push('Missing @type field');
  }

  if (!schema.name && !schema.headline) {
    warnings.push('Consider adding name or headline for better display');
  }

  if (!schema.url) {
    warnings.push('Missing URL field - recommended for rich results');
  }

  // Validate URL format if present
  if (schema.url && typeof schema.url === 'string') {
    try {
      new URL(schema.url);
    } catch {
      errors.push('Invalid URL format');
    }
  }

  // Check for common issues
  if (schema.image && !Array.isArray(schema.image) && typeof schema.image === 'object') {
    const image = schema.image as Record<string, unknown>;
    if (!image.url) {
      warnings.push('Image should include url field');
    }
  }

  // Validate for potential spam signals
  if (hasExcessiveRepeatedContent(schema)) {
    warnings.push('Detected potentially spammy repeated content patterns');
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Get recommended schema types for each surface type
 */
export function getRecommendedSchemaTypes(
  surfaceType: GrowthSurfaceType
): string[] {
  const recommendations: Record<GrowthSurfaceType, string[]> = {
    [GrowthSurfaceType.SHOP_PAGE]: ['WebPage', 'CollectionPage', 'Shop'],
    [GrowthSurfaceType.CATEGORY_PAGE]: ['CollectionPage', 'WebPage'],
    [GrowthSurfaceType.INTENT_PAGE]: ['WebPage', 'FAQPage'],
    [GrowthSurfaceType.TOOL_ENTRY]: ['WebApplication', 'SoftwareApplication', 'Tool'],
    [GrowthSurfaceType.DISCOVERY_PAGE]: ['WebPage', 'CollectionPage'],
    [GrowthSurfaceType.RANKING_PAGE]: ['WebPage', 'Table', 'Article'],
    [GrowthSurfaceType.GUIDE_PAGE]: ['Article', 'TechArticle', 'HowTo'],
  };

  return recommendations[surfaceType] ?? ['WebPage'];
}

// ============================================================================
// Helper Functions
// ============================================================================

function getSchemaTypeForSurfaceType(surfaceType: GrowthSurfaceType): string | null {
  const schemaMap: Record<GrowthSurfaceType, string> = {
    [GrowthSurfaceType.SHOP_PAGE]: 'CollectionPage',
    [GrowthSurfaceType.CATEGORY_PAGE]: 'CollectionPage',
    [GrowthSurfaceType.INTENT_PAGE]: 'FAQPage',
    [GrowthSurfaceType.TOOL_ENTRY]: 'WebApplication',
    [GrowthSurfaceType.DISCOVERY_PAGE]: 'CollectionPage',
    [GrowthSurfaceType.RANKING_PAGE]: 'Table',
    [GrowthSurfaceType.GUIDE_PAGE]: 'TechArticle',
  };

  return schemaMap[surfaceType] ?? null;
}

function generateBreadcrumb(
  surface: GrowthSurfaceInventoryRecord,
  baseUrl: string
): Record<string, unknown> {
  const items: BreadcrumbItem[] = [];

  // Add home
  items.push({ name: 'Home', url: baseUrl });

  // Parse route to build breadcrumb
  const pathParts = surface.routePath.split('/').filter(Boolean);

  let currentPath = '';
  for (let i = 0; i < pathParts.length; i++) {
    currentPath += `/${pathParts[i]}`;
    const name = formatBreadcrumbName(pathParts[i], i === pathParts.length - 1);
    items.push({
      name,
      url: `${baseUrl}${currentPath}`,
    });
  }

  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function formatBreadcrumbName(slug: string, isLast: boolean): string {
  // Convert slug to readable name
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function shouldIncludeCta(surfaceType: GrowthSurfaceType): boolean {
  // Tool entries don't need explicit CTAs as the tool itself is the CTA
  return surfaceType !== GrowthSurfaceType.TOOL_ENTRY;
}

function extractCtaData(surface: GrowthSurfaceInventoryRecord): CtaData | null {
  if (!surface.metadata?.cta) {
    return null;
  }

  const cta = surface.metadata.cta as Record<string, string>;
  return {
    text: cta.text ?? 'Use Tool',
    url: cta.url ?? surface.routePath,
    toolName: cta.toolName,
  };
}

function addToolStructuredData(
  schema: Record<string, unknown>,
  surface: GrowthSurfaceInventoryRecord
): void {
  // Tool-specific schema enhancements
  schema.applicationCategory = 'Utilities';
  schema.operatingSystem = 'Web Browser';

  if (surface.metadata?.toolName) {
    schema.name = surface.metadata.toolName;
  }

  // Add input type if available
  if (surface.metadata?.inputType) {
    schema.additionalProperty = {
      '@type': 'PropertyValue',
      name: 'inputType',
      value: surface.metadata.inputType,
    };
  }
}

function addRankingPageStructuredData(
  schema: Record<string, unknown>,
  surface: GrowthSurfaceInventoryRecord
): void {
  // Ranking page specific data
  if (surface.metadata?.items) {
    schema.about = {
      '@type': 'ItemList',
      numberOfItems: (surface.metadata.items as unknown[]).length,
    };
  }

  // Add ranking criteria if available
  if (surface.metadata?.rankingCriteria) {
    schema.description = `Ranking of ${surface.metadata.rankingCriteria}`;
  }
}

function hasExcessiveRepeatedContent(schema: Record<string, unknown>): boolean {
  // Check for suspicious repetition patterns
  const str = JSON.stringify(schema);

  // Check for repeated words (simple heuristic)
  const words = str.toLowerCase().split(/\s+/);
  const wordCount = new Map<string, number>();

  for (const word of words) {
    if (word.length > 3) {
      wordCount.set(word, (wordCount.get(word) ?? 0) + 1);
    }
  }

  // If any word appears more than 10% of total words, flag as potential spam
  const maxAllowed = words.length * 0.1;
  for (const count of wordCount.values()) {
    if (count > maxAllowed) {
      return true;
    }
  }

  return false;
}
