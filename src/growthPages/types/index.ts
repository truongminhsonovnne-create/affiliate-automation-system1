/**
 * Growth Pages Type Definitions
 *
 * Core type contracts for Consumer Growth Surfaces
 * - Shop landing pages
 * - Category landing pages
 * - Tool explainer pages
 * - SEO-safe metadata models
 * - Navigation and CTA models
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export enum GrowthSurfaceType {
  SHOP = 'shop',
  CATEGORY = 'category',
  TOOL_EXPLAINER = 'tool_explainer',
  DISCOVERY = 'discovery',
}

export enum GrowthSurfaceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  COMING_SOON = 'coming_soon',
}

export enum ToolPageType {
  PASTE_LINK = 'paste_link',
  HOW_IT_WORKS = 'how_it_works',
  VOUCHER_CHECKER = 'voucher_checker',
}

export enum SurfaceCtaType {
  PASTE_LINK = 'paste_link',
  RESOLVE_VOUCHER = 'resolve_voucher',
  COPY_VOUCHER = 'copy_voucher',
  OPEN_SHOPEE = 'open_shopee',
  BROWSE_CATEGORY = 'browse_category',
  VIEW_SHOP = 'view_shop',
}

// ============================================================================
// Base Interfaces
// ============================================================================

export interface GrowthSurfaceRoute {
  type: GrowthSurfaceType;
  slug: string;
  path: string;
  primaryCta: SurfaceCtaType;
  isIndexable: boolean;
}

export interface GrowthSurfaceContext {
  surfaceType: GrowthSurfaceType;
  surfaceSlug: string;
  referrer?: string;
  utmParams?: UTMParams;
  entryTimestamp: number;
}

export interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

export interface GrowthSurfacePageData {
  route: GrowthSurfaceRoute;
  seo: GrowthSurfaceSeoModel;
  summary: GrowthSurfaceSummary;
  cta: GrowthSurfaceCtaModel;
  related: GrowthSurfaceRelatedContent;
  navigation: GrowthSurfaceNavigationModel;
  metadata: GrowthSurfaceMetadata;
}

export interface GrowthSurfaceMetadata {
  status: GrowthSurfaceStatus;
  lastUpdated: number;
  staleAfter: number;
  cacheVersion: string;
}

// ============================================================================
// SEO Models
// ============================================================================

export interface GrowthSurfaceSeoModel {
  title: string;
  description: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage?: string;
  noIndex: boolean;
  noFollow: boolean;
  structuredData?: Record<string, unknown>[];
  keywords?: string[];
}

export interface ShopLandingSeoModel extends GrowthSurfaceSeoModel {
  shopName: string;
  shopCategory?: string;
  voucherHint?: string;
}

export interface CategoryLandingSeoModel extends GrowthSurfaceSeoModel {
  categoryName: string;
  typicalSavings?: string;
  voucherPatterns?: string[];
}

export interface ToolExplainerSeoModel extends GrowthSurfaceSeoModel {
  toolName: string;
  toolDescription: string;
  toolBenefits: string[];
}

// ============================================================================
// Page Data Models
// ============================================================================

export interface ShopLandingPageData extends GrowthSurfacePageData {
  type: 'shop';
  shopData: ShopData;
  voucherHints: VoucherHint[];
}

export interface ShopData {
  id: string;
  slug: string;
  name: string;
  logo?: string;
  description?: string;
  category?: string;
  productCount?: number;
  url?: string;
}

export interface VoucherHint {
  code?: string;
  description: string;
  discount?: string;
  applicability?: string;
}

export interface CategoryLandingPageData extends GrowthSurfacePageData {
  type: 'category';
  categoryData: CategoryData;
  voucherPatterns: VoucherPattern[];
}

export interface CategoryData {
  id: string;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  shopCount?: number;
}

export interface VoucherPattern {
  pattern: string;
  typicalDiscount: string;
  frequency: 'common' | 'occasional' | 'rare';
}

export interface ToolExplainerPageData extends GrowthSurfacePageData {
  type: 'tool_explainer';
  toolPageType: ToolPageType;
  toolData: ToolData;
}

export interface ToolData {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  steps: ToolStep[];
  benefits: string[];
  faqs?: FaqItem[];
}

export interface ToolStep {
  number: number;
  title: string;
  description: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

// ============================================================================
// Summary & Content Models
// ============================================================================

export interface GrowthSurfaceSummary {
  title: string;
  subtitle?: string;
  description: string;
  highlights: string[];
  icon?: string;
}

export interface GrowthSurfaceSummaryCard {
  title: string;
  value: string;
  icon?: string;
  description?: string;
}

export interface GrowthSurfaceRelatedContent {
  shops: RelatedShop[];
  categories: RelatedCategory[];
  tools: RelatedTool[];
}

export interface RelatedShop {
  slug: string;
  name: string;
  voucherCount?: number;
}

export interface RelatedCategory {
  slug: string;
  name: string;
  shopCount?: number;
}

export interface RelatedTool {
  slug: string;
  name: string;
  description?: string;
}

// ============================================================================
// Navigation Models
// ============================================================================

export interface GrowthSurfaceNavigationModel {
  breadcrumbs: BreadcrumbItem[];
  primaryNav: NavItem[];
  footerNav: NavItem[];
  backToTool: NavItem;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  isPrimary?: boolean;
}

// ============================================================================
// CTA Models
// ============================================================================

export interface GrowthSurfaceCtaModel {
  primary: CtaButton;
  secondary: CtaButton[];
}

export interface CtaButton {
  type: SurfaceCtaType;
  label: string;
  href: string;
  icon?: string;
  trackingId: string;
}

export interface GrowthSurfaceEmptyState {
  title: string;
  message: string;
  action?: CtaButton;
}

export interface GrowthSurfaceWarning {
  type: 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

export interface GrowthSurfaceError {
  code: string;
  message: string;
  recovery?: CtaButton;
}

// ============================================================================
// Analytics & Attribution Models
// ============================================================================

export interface GrowthSurfaceEvent {
  eventType: string;
  surfaceType: GrowthSurfaceType;
  surfaceSlug: string;
  timestamp: number;
  sessionId: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface GrowthSurfaceViewEvent extends GrowthSurfaceEvent {
  eventType: 'surface_viewed';
  referrer?: string;
  utmParams?: UTMParams;
}

export interface GrowthSurfaceCtaClickEvent extends GrowthSurfaceEvent {
  eventType: 'surface_cta_clicked';
  ctaType: SurfaceCtaType;
  ctaUrl: string;
}

export interface GrowthAttributionContext {
  entrySurface: GrowthSurfaceType;
  entrySlug: string;
  entryTimestamp: number;
  clickTimestamp?: number;
  conversionTimestamp?: number;
  hasConverted: boolean;
}

export interface SurfaceToToolConversion {
  surfaceType: GrowthSurfaceType;
  surfaceSlug: string;
  entryTime: number;
  ctaClickTime?: number;
  toolUseTime?: number;
  isAttributed: boolean;
}

// ============================================================================
// Validation Schemas (Zod)
// ============================================================================

export const GrowthSurfaceContextSchema = z.object({
  surfaceType: z.nativeEnum(GrowthSurfaceType),
  surfaceSlug: z.string().min(1).max(100),
  referrer: z.string().optional(),
  utmParams: z.object({
    source: z.string().optional(),
    medium: z.string().optional(),
    campaign: z.string().optional(),
    content: z.string().optional(),
    term: z.string().optional(),
  }).optional(),
  entryTimestamp: z.number(),
});

export const GrowthSurfaceSeoModelSchema = z.object({
  title: z.string().min(10).max(70),
  description: z.string().min(50).max(320),
  canonicalUrl: z.string().url(),
  ogTitle: z.string().min(10).max(95),
  ogDescription: z.string().min(50).max(200),
  ogImage: z.string().url().optional(),
  noIndex: z.boolean(),
  noFollow: z.boolean(),
  structuredData: z.array(z.record(z.unknown())).optional(),
  keywords: z.array(z.string()).optional(),
});

export const GrowthSurfacePageDataSchema = z.object({
  route: z.object({
    type: z.nativeEnum(GrowthSurfaceType),
    slug: z.string().min(1).max(100),
    path: z.string().min(1),
    primaryCta: z.nativeEnum(SurfaceCtaType),
    isIndexable: z.boolean(),
  }),
  seo: GrowthSurfaceSeoModelSchema,
  summary: z.object({
    title: z.string().min(1).max(100),
    subtitle: z.string().max(200).optional(),
    description: z.string().min(50).max(500),
    highlights: z.array(z.string()).max(5),
    icon: z.string().optional(),
  }),
  cta: z.object({
    primary: z.object({
      type: z.nativeEnum(SurfaceCtaType),
      label: z.string().min(1).max(50),
      href: z.string().min(1),
      icon: z.string().optional(),
      trackingId: z.string().min(1),
    }),
    secondary: z.array(z.object({
      type: z.nativeEnum(SurfaceCtaType),
      label: z.string().min(1).max(50),
      href: z.string().min(1),
      icon: z.string().optional(),
      trackingId: z.string().min(1),
    })),
  }),
  related: z.object({
    shops: z.array(z.object({
      slug: z.string(),
      name: z.string(),
      voucherCount: z.number().optional(),
    })),
    categories: z.array(z.object({
      slug: z.string(),
      name: z.string(),
      shopCount: z.number().optional(),
    })),
    tools: z.array(z.object({
      slug: z.string(),
      name: z.string(),
      description: z.string().optional(),
    })),
  }),
  navigation: z.object({
    breadcrumbs: z.array(z.object({
      label: z.string(),
      href: z.string().optional(),
      isCurrent: z.boolean().optional(),
    })),
    primaryNav: z.array(z.object({
      label: z.string(),
      href: z.string(),
      icon: z.string().optional(),
      isPrimary: z.boolean().optional(),
    })),
    footerNav: z.array(z.object({
      label: z.string(),
      href: z.string(),
      icon: z.string().optional(),
      isPrimary: z.boolean().optional(),
    })),
    backToTool: z.object({
      label: z.string(),
      href: z.string(),
      icon: z.string().optional(),
      isPrimary: z.boolean().optional(),
    }),
  }),
  metadata: z.object({
    status: z.nativeEnum(GrowthSurfaceStatus),
    lastUpdated: z.number(),
    staleAfter: z.number(),
    cacheVersion: z.string(),
  }),
});

// ============================================================================
// Type Guards
// ============================================================================

export function isShopLandingPageData(
  data: GrowthSurfacePageData
): data is ShopLandingPageData {
  return data.route.type === GrowthSurfaceType.SHOP;
}

export function isCategoryLandingPageData(
  data: GrowthSurfacePageData
): data is CategoryLandingPageData {
  return data.route.type === GrowthSurfaceType.CATEGORY;
}

export function isToolExplainerPageData(
  data: GrowthSurfacePageData
): data is ToolExplainerPageData {
  return data.route.type === GrowthSurfaceType.TOOL_EXPLAINER;
}

export function isValidSurfaceCtaType(value: string): value is SurfaceCtaType {
  return Object.values(SurfaceCtaType).includes(value as SurfaceCtaType);
}

export function isValidGrowthSurfaceType(value: string): value is GrowthSurfaceType {
  return Object.values(GrowthSurfaceType).includes(value as GrowthSurfaceType);
}
