/**
 * Tool Explainer Data Service
 *
 * Builds data for tool explainer pages:
 * - /paste-link-find-voucher
 * - /how-it-works
 * - /voucher-checker
 *
 * Focus: Clean, useful, short, trust-building, clear CTA back to tool
 * Each page should be a valuable informational resource, not just a landing page
 */

import type {
  ToolExplainerPageData,
  ToolData,
  ToolStep,
  FaqItem,
  GrowthSurfaceSummary,
  GrowthSurfaceCtaModel,
  GrowthSurfaceRelatedContent,
  GrowthSurfaceNavigationModel,
  GrowthSurfaceMetadata,
  GrowthSurfaceStatus,
  ToolPageType,
} from '../types/index.js';
import {
  GrowthSurfaceType,
  SurfaceCtaType,
} from '../types/index.js';
import {
  CACHE_TTL,
  STALE_THRESHOLDS,
  GROWTH_SURFACE_LIMITS,
  CTA_DEFAULTS,
} from '../constants/index.js';
import { buildToolPagePath } from '../routing/growthSurfaceRoutes.js';
import { buildToolExplainerSeoModel } from '../seo/seoModelBuilder.js';
import { getCachedGrowthSurface, setCachedGrowthSurface, buildGrowthSurfaceCacheKey } from '../cache/growthSurfaceCache.js';
import { resolveRelatedToolPages } from './relatedSurfaceResolver.js';
import { buildGrowthBreadcrumbs } from '../navigation/growthNavigationModel.js';

import type { GetToolExplainerOptions } from './types.js';

// ============================================================================
// Tool Data Templates - Enhanced Content
// ============================================================================

const PASTE_LINK_TOOL_DATA: ToolData = {
  name: 'Dán Link Tìm Mã Giảm Giá',
  slug: 'paste-link',
  tagline: 'Dán link sản phẩm Shopee - nhận mã giảm giá tự động',
  description: 'Hướng dẫn chi tiết cách sử dụng công cụ dán link để tìm mã giảm giá Shopee. Tìm hiểu mẹo sử dụng hiệu quả, cách tối ưu kết quả, và giải đáp các thắc mắc thường gặp.',
  longDescription: `
Công cụ "Dán Link Tìm Mã" giúp bạn tìm mã giảm giá Shopee nhanh chóng chỉ bằng một bước đơn giản: dán link sản phẩm.

**Tại sao nên dùng công cụ này?**
- Thay vì tìm mã trên nhiều trang web khác nhau, bạn chỉ cần dán link sản phẩm
- Hệ thống tự động quét tất cả mã giảm giá khả dụng cho sản phẩm đó
- Tiết kiệm thời gian đáng kể so với cách tìm thủ công
- Hoàn toàn miễn phí, không cần đăng ký tài khoản

**Mẹo để tìm mã hiệu quả hơn:**
- Sử dụng link sản phẩm cụ thể, không phải link shop
- Thử vào các thời điểm sale lớn (2.2, 3.3, 4.4, 6.6, 9.9, 10.10, 11.11, 12.12) để có nhiều mã hơn
- Một số mã chỉ áp dụng cho đơn hàng trên một mức nhất định

**Cách copy link sản phẩm:**
- Trên app Shopee: Nhấn nút "Chia sẻ" > "Sao chép link"
- Trên trình duyệt: Copy URL từ thanh địa chỉ khi đang xem sản phẩm
  `,
  steps: [
    {
      number: 1,
      title: 'Sao chép link sản phẩm',
      description: 'Mở sản phẩm trên Shopee (app hoặc website), nhấn nút chia sẻ và chọn "Sao chép link". Đảm bảo bạn copy link sản phẩm cụ thể, không phải link của shop.',
    },
    {
      number: 2,
      title: 'Dán link vào ô tìm kiếm',
      description: 'Quay lại trang này, dán link sản phẩm vào ô nhập liệu. Bạn có thể dùng Ctrl+V (Windows) hoặc Cmd+V (Mac) để dán nhanh.',
    },
    {
      number: 3,
      title: 'Nhận kết quả mã giảm giá',
      description: 'Hệ thống sẽ quét và hiển thị các mã giảm giá khả dụng. Mã tốt nhất sẽ hiển thị đầu tiên kèm thông tin chi tiết về điều kiện áp dụng.',
    },
    {
      number: 4,
      title: 'Sao chép và áp dụng',
      description: 'Nhấn nút "Sao chép" bên cạnh mã bạn muốn dùng. Sau đó mở Shopee, thêm sản phẩm vào giỏ hàng và dán mã vào ô "Mã giảm giá" trước khi thanh toán.',
    },
  ],
  tips: [
    'Sử dụng link sản phẩm cụ thể, không phải link shop',
    'Kiểm tra điều kiện mã: giá trị đơn hàng tối thiểu, danh mục áp dụng',
    'Một số mã chỉ có hiệu lực trong khung giờ nhất định',
    'Kết hợp nhiều mã nếu Shopee cho phép (mã vận chuyển + mã giảm giá)',
    'Các đợt sale lớn thường có nhiều mã hơn bình thường',
    'Nên thử nhiều sản phẩm cùng shop nếu sản phẩm đầu không có mã',
  ],
  benefits: [
    'Tự động tìm mã giảm giá tốt nhất cho sản phẩm',
    'Không cần tìm kiếm thủ công trên nhiều trang',
    'Tiết kiệm thời gian đáng kể',
    'Hoàn toàn miễn phí - không phí ẩn',
    'Không cần đăng ký tài khoản',
    'Hoạt động trên cả máy tính và điện thoại',
  ],
  faqs: [
    {
      question: 'Công cụ này có miễn phí không?',
      answer: 'Có, hoàn toàn miễn phí. Không phí đăng ký, không phí sử dụng, không có phí ẩn. Bạn chỉ cần truy cập và sử dụng.',
    },
    {
      question: 'Tại sao nên dùng công cụ này thay vì tìm mã thủ công?',
      answer: 'Công cụ tự động quét tất cả mã giảm giá khả dụng cho sản phẩm cụ thể của bạn. Bạn không cần tìm kiếm trên nhiều trang web khác nhau hoặc thử nghiệm nhiều mã một cách thủ công.',
    },
    {
      question: 'Mã giảm giá có thật không?',
      answer: 'Các mã được tổng hợp từ nguồn chính thức và các chương trình khuyến mãi của Shopee. Chúng tôi kiểm tra mã trước khi hiển thị để đảm bảo tính chính xác.',
    },
    {
      question: 'Tại sao không tìm được mã cho sản phẩm?',
      answer: 'Một số sản phẩm có thể không có mã giảm giá khả dụng vào thời điểm tra cứu. Bạn nên thử lại vào các đợt sale lớn như 11.11, 12.12 để có nhiều mã hơn. Hoặc thử với sản phẩm khác cùng shop.',
    },
    {
      question: 'Mã giảm giá không hoạt động phải làm sao?',
      answer: 'Kiểm tra lại điều kiện áp dụng: giá trị đơn hàng tối thiểu, danh mục sản phẩm, và thời hạn sử dụng của mã. Một số mã chỉ áp dụng cho khách hàng mới hoặc có giới hạn số lần sử dụng.',
    },
    {
      question: 'Có thể sử dụng trên điện thoại không?',
      answer: 'Có, công cụ hoạt động trên mọi thiết bị có trình duyệt web, bao gồm cả điện thoại iPhone và Android.',
    },
  ],
};

const HOW_IT_WORKS_DATA: ToolData = {
  name: 'Cách Sử Dụng',
  slug: 'how-it-works',
  tagline: 'Hướng dẫn sử dụng công cụ tìm mã giảm giá Shopee',
  description: 'Hướng dẫn chi tiết từng bước cách sử dụng công cụ tìm mã giảm giá Shopee. Dành cho người mới bắt đầu muốn tiết kiệm chi phí mua sắm.',
  longDescription: `
Tìm hiểu cách sử dụng công cụ tìm mã giảm giá Shopee một cách hiệu quả nhất.

**Tổng quan về công cụ:**
Công cụ này giúp bạn tìm mã giảm giá Shopee bằng cách phân tích link sản phẩm và đối chiếu với cơ sở dữ liệu mã giảm giá hiện có.

**Những gì bạn cần chuẩn bị:**
- Link sản phẩm Shopee (copy từ trình duyệt hoặc app Shopee)
- Thiết bị có kết nối internet

**Ưu điểm của phương pháp dán link:**
- Chính xác hơn: Hệ thống biết chính xác sản phẩm bạn muốn mua
- Nhanh hơn: Không cần tìm kiếm thủ công
- Hiệu quả hơn: Gợi ý mã phù hợp nhất với sản phẩm
  `,
  steps: [
    {
      number: 1,
      title: 'Tìm sản phẩm trên Shopee',
      description: 'Truy cập Shopee qua app hoặc trình duyệt, tìm sản phẩm bạn muốn mua. Đảm bảo bạn đang xem trang sản phẩm cụ thể, không phải trang shop.',
    },
    {
      number: 2,
      title: 'Sao chép link sản phẩm',
      description: 'Nhấn nút "Chia sẻ" trên trang sản phẩm, sau đó chọn "Sao chép link". Hoặc copy trực tiếp từ thanh địa chỉ của trình duyệt.',
    },
    {
      number: 3,
      title: 'Dán link vào công cụ',
      description: 'Quay lại trang này, dán link vào ô tìm kiếm. Có thể dán thủ công hoặc dùng Ctrl+V (Windows) / Cmd+V (Mac).',
    },
    {
      number: 4,
      title: 'Xem kết quả và chọn mã',
      description: 'Hệ thống hiển thị các mã giảm giá khả dụng. Mã tốt nhất hiển thị đầu tiên. Đọc kỹ điều kiện áp dụng trước khi chọn.',
    },
    {
      number: 5,
      title: 'Áp dụng mã trên Shopee',
      description: 'Sao chép mã đã chọn, quay lại Shopee, thêm sản phẩm vào giỏ hàng. Trong trang thanh toán, nhập mã vào ô "Mã giảm giá" và tiếp tục thanh toán.',
    },
  ],
  tips: [
    'Sử dụng link sản phẩm cụ thể, không phải link shop',
    'Kiểm tra điều kiện mã trước khi áp dụng',
    'Thử nhiều sản phẩm khác nhau nếu không có mã cho sản phẩm đầu tiên',
    'Lưu ý thời hạn sử dụng của mã',
    'Một số mã chỉ áp dụng vào khung giờ nhất định',
    'Kết hợp mã vận chuyển với mã giảm giá để tiết kiệm thêm',
  ],
  benefits: [
    'Hướng dẫn từng bước chi tiết từ cơ bản',
    'Mẹo sử dụng hiệu quả từ kinh nghiệm thực tế',
    'Giải đáp thắc mắc thường gặp',
    'Giúp tiết kiệm thời gian và tiền bạc khi mua sắm',
  ],
  faqs: [
    {
      question: 'Cần cài đặt gì không?',
      answer: 'Không cần cài đặt gì. Chỉ cần trình duyệt web và kết nối internet. Truy cập trang web là có thể sử dụng ngay.',
    },
    {
      question: 'Có giới hạn số lần tìm kiếm không?',
      answer: 'Không có giới hạn về số lần tìm kiếm. Bạn có thể tìm bao nhiêu sản phẩm tùy thích.',
    },
    {
      question: 'Tại sao mã không áp dụng được?',
      answer: 'Có thể do: (1) mã đã hết hạn, (2) đơn hàng không đủ điều kiện về giá trị tối thiểu, (3) mã chỉ áp dụng cho danh mục nhất định. Hãy đọc kỹ điều kiện mã trước khi sử dụng.',
    },
    {
      question: 'Có thể sử dụng trên điện thoại không?',
      answer: 'Có, công cụ hoạt động trên mọi thiết bị có trình duyệt web, bao gồm cả điện thoại iPhone và Android.',
    },
  ],
};

const VOUCHER_CHECKER_DATA: ToolData = {
  name: 'Kiểm Tra Mã Giảm Giá',
  slug: 'voucher-checker',
  tagline: 'Kiểm tra mã giảm giá Shopee - xem có còn hiệu lực không',
  description: 'Công cụ kiểm tra mã giảm giá Shopee. Nhập mã để xem còn hoạt động không, điều kiện áp dụng và cách sử dụng đúng nhất.',
  longDescription: `
Công cụ kiểm tra mã giảm giá Shopee giúp bạn xác nhận xem mã có còn hoạt động không trước khi thanh toán.

**Tại sao nên kiểm tra mã trước?**
- Tránh thất vọng khi áp dụng mã không hoạt động lúc thanh toán
- Biết trước điều kiện áp dụng (giá tối thiểu, danh mục)
- Tiết kiệm thời gian thử nghiệm nhiều mã

**Các loại mã giảm giá Shopee:**
- Mã giảm giá theo đơn hàng: Giảm % hoặc số tiền cố định
- Mã giảm phí vận chuyển: Miễn phí vận chuyển cho đơn hàng đạt điều kiện
- Mã giảm giá theo danh mục: Chỉ áp dụng cho một số danh mục sản phẩm nhất định
- Mã khách hàng mới: Chỉ áp dụng cho tài khoản mới
  `,
  steps: [
    {
      number: 1,
      title: 'Nhập mã giảm giá',
      description: 'Nhập mã giảm giá Shopee vào ô tìm kiếm. Mã thường là chuỗi ký tự in hoa và số, ví dụ: SALE20, GIAM50K.',
    },
    {
      number: 2,
      title: 'Xem thông tin mã',
      description: 'Hệ thống hiển thị thông tin chi tiết về mã: giá trị giảm, điều kiện áp dụng (giá tối thiểu, danh mục), thời hạn sử dụng.',
    },
    {
      number: 3,
      title: 'Áp dụng trên Shopee',
      description: 'Sao chép mã và áp dụng khi thanh toán trên Shopee. Đảm bảo đơn hàng đáp ứng điều kiện của mã.',
    },
  ],
  tips: [
    'Mã phân biệt chữ hoa thường, nhập đúng định dạng',
    'Một số mã chỉ áp dụng cho khách hàng mới',
    'Kiểm tra điều kiện giá trị đơn hàng tối thiểu',
    'Một số mã chỉ có hiệu lực trong khung giờ nhất định',
    'Mã có thể hết hiệu lực sớm nếu đã hết quota',
  ],
  benefits: [
    'Xác nhận mã còn hiệu lực trước khi thanh toán',
    'Biết điều kiện áp dụng trước khi mua',
    'Tránh mất thời gian với mã không hoạt động',
    'Tiết kiệm công sức thử nghiệm nhiều mã',
  ],
  faqs: [
    {
      question: 'Mã không hiển thị thông tin là sao?',
      answer: 'Mã có thể không tồn tại hoặc đã hết hạn. Thử nhập mã khác hoặc tìm mã mới từ các nguồn uy tín.',
    },
    {
      question: 'Mã hiển thị nhưng không áp dụng được?',
      answer: 'Kiểm tra lại điều kiện: giá trị đơn hàng tối thiểu, danh mục sản phẩm, và thời hạn sử dụng. Một số mã cũng chỉ áp dụng cho khách hàng mới hoặc có giới hạn số lần sử dụng.',
    },
    {
      question: 'Tại sao mã đã hết hạn nhưng vẫn hiển thị?',
      answer: 'Dữ liệu mã giảm giá được cập nhật định kỳ. Nếu phát hiện mã hết hạn, vui lòng thông báo để chúng tôi cập nhật.',
    },
  ],
};

// ============================================================================
// Main Data Service
// ============================================================================

/**
 * Get paste link tool page data
 */
export async function getPasteLinkToolPageData(
  options: GetToolExplainerOptions = {}
): Promise<ToolExplainerPageData> {
  return buildToolExplainerPageData(ToolPageType.PASTE_LINK, PASTE_LINK_TOOL_DATA, options);
}

/**
 * Get how it works page data
 */
export async function getHowItWorksPageData(
  options: GetToolExplainerOptions = {}
): Promise<ToolExplainerPageData> {
  return buildToolExplainerPageData(ToolPageType.HOW_IT_WORKS, HOW_IT_WORKS_DATA, options);
}

/**
 * Get voucher checker explainer page data
 */
export async function getVoucherCheckerExplainerPageData(
  options: GetToolExplainerOptions = {}
): Promise<ToolExplainerPageData> {
  return buildToolExplainerPageData(ToolPageType.VOUCHER_CHECKER, VOUCHER_CHECKER_DATA, options);
}

/**
 * Get tool explainer page data by type
 */
export async function getToolExplainerPageData(
  toolPageType: ToolPageType,
  options: GetToolExplainerOptions = {}
): Promise<ToolExplainerPageData | null> {
  switch (toolPageType) {
    case ToolPageType.PASTE_LINK:
      return getPasteLinkToolPageData(options);
    case ToolPageType.HOW_IT_WORKS:
      return getHowItWorksPageData(options);
    case ToolPageType.VOUCHER_CHECKER:
      return getVoucherCheckerExplainerPageData(options);
    default:
      return null;
  }
}

// ============================================================================
// Private Helpers
// ============================================================================

async function buildToolExplainerPageData(
  toolPageType: ToolPageType,
  toolData: ToolData,
  options: GetToolExplainerOptions
): Promise<ToolExplainerPageData> {
  const { preview = false, includeRelated = true } = options;

  // Try cache first
  if (!preview) {
    const cacheKey = buildGrowthSurfaceCacheKey(GrowthSurfaceType.TOOL_EXPLAINER, toolData.slug);
    const cached = await getCachedGrowthSurface<ToolExplainerPageData>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Build SEO model
  const seo = buildToolExplainerSeoModel({
    toolName: toolData.name,
    toolDescription: toolData.description,
    toolBenefits: toolData.benefits,
    toolPageType,
  });

  // Build summary
  const summary = buildToolExplainerSummary(toolData);

  // Build CTA model
  const cta = buildToolExplainerCtaModel(toolPageType);

  // Build related content
  let related: GrowthSurfaceRelatedContent = {
    shops: [],
    categories: [],
    tools: [],
  };
  if (includeRelated) {
    related = await resolveRelatedToolPages(
      {
        surfaceType: GrowthSurfaceType.TOOL_EXPLAINER,
        surfaceSlug: toolData.slug,
        entryTimestamp: Date.now(),
      },
      { limit: 3 }
    );
  }

  // Build navigation
  const navigation = buildToolExplainerNavigation(toolPageType);

  // Build metadata
  const metadata = buildToolExplainerMetadata();

  return {
    type: 'tool_explainer',
    toolPageType,
    route: {
      type: GrowthSurfaceType.TOOL_EXPLAINER,
      slug: toolData.slug,
      path: buildToolPagePath(toolPageType),
      primaryCta: toolPageType === ToolPageType.VOUCHER_CHECKER
        ? SurfaceCtaType.RESOLVE_VOUCHER
        : SurfaceCtaType.PASTE_LINK,
      isIndexable: true,
    },
    seo,
    summary,
    cta,
    related,
    navigation,
    metadata,
    toolData,
  };
}

// ============================================================================
// Summary Builder
// ============================================================================

function buildToolExplainerSummary(toolData: ToolData): GrowthSurfaceSummary {
  return {
    title: toolData.name,
    subtitle: toolData.tagline,
    description: toolData.description,
    highlights: toolData.benefits.slice(0, GROWTH_SURFACE_LIMITS.MAX_HIGHLIGHTS),
  };
}

// ============================================================================
// CTA Builder
// ============================================================================

function buildToolExplainerCtaModel(toolPageType: ToolPageType): GrowthSurfaceCtaModel {
  const primaryCta = toolPageType === ToolPageType.VOUCHER_CHECKER
    ? SurfaceCtaType.RESOLVE_VOUCHER
    : SurfaceCtaType.PASTE_LINK;

  return {
    primary: {
      type: primaryCta,
      label: primaryCta === SurfaceCtaType.RESOLVE_VOUCHER
        ? 'Kiểm tra mã ngay'
        : 'Bắt đầu sử dụng',
      href: primaryCta === SurfaceCtaType.RESOLVE_VOUCHER
        ? '/voucher-checker'
        : '/',
      icon: 'arrow-right',
      trackingId: `tool_${toolPageType}_primary_cta`,
    },
    secondary: [
      {
        type: SurfaceCtaType.PASTE_LINK,
        label: 'Dán link tìm mã',
        href: '/',
        icon: 'link',
        trackingId: `tool_${toolPageType}_paste_link`,
      },
      {
        type: SurfaceCtaType.RESOLVE_VOUCHER,
        label: 'Kiểm tra mã',
        href: '/voucher-checker',
        icon: 'search',
        trackingId: `tool_${toolPageType}_check_voucher`,
      },
    ],
  };
}

// ============================================================================
// Navigation Builder
// ============================================================================

function buildToolExplainerNavigation(toolPageType: ToolPageType): GrowthSurfaceNavigationModel {
  const breadcrumbs = buildGrowthBreadcrumbs([
    { label: 'Trang chủ', href: '/' },
    { label: 'Công cụ', href: '/paste-link-find-voucher' },
    { label: getToolPageLabel(toolPageType), isCurrent: true },
  ]);

  return {
    breadcrumbs,
    primaryNav: [
      { label: 'Trang chủ', href: '/', isPrimary: true },
      { label: 'Cách dùng', href: '/how-it-works' },
      { label: 'Kiểm tra mã', href: '/voucher-checker' },
    ],
    footerNav: [
      { label: 'Trang chủ', href: '/' },
      { label: 'Dán link tìm mã', href: '/' },
      { label: 'Cách sử dụng', href: '/how-it-works' },
      { label: 'Kiểm tra mã', href: '/voucher-checker' },
    ],
    backToTool: {
      label: 'Bắt đầu ngay',
      href: '/',
      icon: 'link',
      isPrimary: true,
    },
  };
}

function getToolPageLabel(toolPageType: ToolPageType): string {
  switch (toolPageType) {
    case ToolPageType.PASTE_LINK:
      return 'Dán link tìm mã';
    case ToolPageType.HOW_IT_WORKS:
      return 'Cách sử dụng';
    case ToolPageType.VOUCHER_CHECKER:
      return 'Kiểm tra mã';
    default:
      return 'Công cụ';
  }
}

// ============================================================================
// Metadata Builder
// ============================================================================

function buildToolExplainerMetadata(): GrowthSurfaceMetadata {
  const now = Date.now();
  return {
    status: GrowthSurfaceStatus.ACTIVE,
    lastUpdated: now,
    staleAfter: now + STALE_THRESHOLDS.TOOL_CONTENT * 1000,
    cacheVersion: '1.0.0',
  };
}
