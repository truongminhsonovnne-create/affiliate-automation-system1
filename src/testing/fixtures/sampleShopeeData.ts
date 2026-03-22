/**
 * Sample Shopee Data Fixtures
 *
 * Sample data for crawler testing.
 */

/** Sample listing card data */
export const sampleListingCard = {
  itemId: '1234567890',
  name: 'Áo Thun Nam Cotton Basic - Áo Phông Nam',
  price: 129000,
  originalPrice: 199000,
  discount: 35,
  rating: 4.5,
  reviewCount: 1250,
  soldCount: 5000,
  images: [
    'https://cf.shopee.sg/file/abc123def456',
    'https://cf.shopee.sg/file/def789ghi012',
    'https://cf.shopee.sg/file/ghi345jkl678',
  ],
  shop: {
    shopId: '12345678',
    name: 'Fashion Store',
    rating: 4.9,
    location: 'TP. Hồ Chí Minh',
    followercount: 15000,
  },
  categories: [
    { id: 110001, name: 'Fashion' },
    { id: 110002, name: 'Men' },
    { id: 110003, name: 'T-Shirts' },
  ],
  tags: ['hot', 'free-shipping'],
};

/** Sample detail page data */
export const sampleDetailPayload = {
  itemId: '1234567890',
  name: 'Áo Thun Nam Cotton Basic - Áo Phông Nam',
  price: 129000,
  originalPrice: 199000,
  discount: 35,
  rating: 4.5,
  reviewCount: 1250,
  soldCount: 5000,
  description: `<p>Chất liệu: 100% Cotton</p>
<p>Áo thun nam basic form regular fit</p>
<p>Co cổ tròn, tay ngắn</p>
<p>Phù hợp mặc đi chơi, đi làm</p>`,
  images: [
    { id: 1, url: 'https://cf.shopee.sg/file/abc123def456' },
    { id: 2, url: 'https://cf.shopee.sg/file/def789ghi012' },
  ],
  videos: [
    { id: 1, url: 'https://shopee.vn/video/123456', thumbnail: 'https://cf.shopee.sg/file/thumb' },
  ],
  attributes: [
    { name: 'Chất liệu', value: '100% Cotton' },
    { name: 'Màu sắc', value: 'Đen, Trắng, Xanh Navy' },
    { name: 'Size', value: 'S, M, L, XL, XXL' },
  ],
  options: [
    {
      name: 'Màu sắc',
      values: [
        { id: 1, name: 'Đen', images: [] },
        { id: 2, name: 'Trắng', images: [] },
        { id: 3, name: 'Xanh Navy', images: [] },
      ],
    },
    {
      name: 'Size',
      values: [
        { id: 101, name: 'S' },
        { id: 102, name: 'M' },
        { id: 103, name: 'L' },
        { id: 104, name: 'XL' },
        { id: 105, name: 'XXL' },
      ],
    },
  ],
  shop: {
    shopId: '12345678',
    name: 'Fashion Store',
    rating: 4.9,
    location: 'TP. Hồ Chí Minh',
    followercount: 15000,
    productcount: 250,
    responseRate: 95,
    responseTime: 'trong vòng vài giờ',
  },
};

/** Sample canonical product */
export const sampleCanonicalProduct = {
  id: 'canonical-001',
  sourceId: '1234567890',
  source: 'shopee',
  name: 'Áo Thun Nam Cotton Basic',
  displayName: 'Áo Thun Nam Cotton Basic - Áo Phông Nam',
  description: 'Chất liệu: 100% Cotton. Áo thun nam basic form regular fit. Co cổ tròn, tay ngắn. Phù hợp mặc đi chơi, đi làm.',
  price: {
    amount: 129000,
    currency: 'VND',
    originalAmount: 199000,
    discountPercent: 35,
  },
  images: [
    { url: 'https://cf.shopee.sg/file/abc123def456', type: 'primary' },
    { url: 'https://cf.shopee.sg/file/def789ghi012', type: 'gallery' },
  ],
  rating: {
    average: 4.5,
    count: 1250,
  },
  shop: {
    id: 'shop-123',
    name: 'Fashion Store',
    rating: 4.9,
  },
  categories: ['Fashion', 'Men', 'T-Shirts'],
  attributes: {
    material: 'Cotton',
    colors: ['Đen', 'Trắng', 'Xanh Navy'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
  },
  url: 'https://shopee.vn/product/1234567890',
  scrapedAt: new Date().toISOString(),
  status: 'active',
};

/** Sample AI enriched content */
export const sampleAiEnrichedContent = {
  productId: 'canonical-001',
  hashtags: ['fashion', 'style', 'ootd', 'vietnamesefashion', 'casualwear'],
  description: 'Áo thun nam chất liệu cotton 100% mềm mại, thoáng mát. Thiết kế basic form regular fit phù hợp mọi dáng người. Màu sắc trẻ trung, dễ phối đồ.',
  title: 'Áo Thun Nam Cotton Basic - Phong cách Basic, Thoải Mái Mỗi Ngày',
  tags: ['cotton', 'basic', 'comfortable', 'vietnam'],
  meta: {
    model: 'gemini-1.5-pro',
    promptVersion: 'v1.0',
    enrichmentVersion: '1.0.0',
    processedAt: new Date().toISOString(),
  },
};

/** Sample publish job data */
export const samplePublishJob = {
  id: 'job-001',
  productId: 'canonical-001',
  channel: 'tiktok',
  status: 'pending',
  priority: 1,
  payload: {
    video: {
      url: 'https://cdn.example.com/videos/test-video.mp4',
      thumbnail: 'https://cdn.example.com/thumbnails/test-thumb.jpg',
      duration: 30,
    },
    caption: 'Check out this amazing product! #fashion #style #ootd',
    hashtags: ['fashion', 'style', 'ootd', 'shopping'],
    mentions: [],
    effects: [],
  },
  retryPolicy: {
    maxAttempts: 3,
    backoffMs: 5000,
  },
  attempts: 0,
  maxAttempts: 3,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  scheduledAt: null,
  startedAt: null,
  completedAt: null,
  failedAt: null,
  error: null,
};

/** Sample adapter response */
export const sampleAdapterResponse = {
  success: true,
  requestId: 'req-001',
  externalId: 'tiktok-post-123456',
  postUrl: 'https://tiktok.com/@fashionstore/video/123456789',
  platform: 'tiktok',
  status: 'published',
  publishedAt: new Date().toISOString(),
  metrics: {
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
  },
};

/** Edge case: Empty fields */
export const sampleListingCardPartial = {
  itemId: '9999999999',
  name: 'Product With Missing Fields',
  price: null,
  originalPrice: null,
  discount: 0,
  rating: null,
  reviewCount: 0,
  images: [],
  shop: null,
};

/** Edge case: Very long text */
export const sampleListingCardLongText = {
  itemId: '8888888888',
  name: 'A'.repeat(200),
  price: 1000000,
  originalPrice: 2000000,
  discount: 50,
  rating: 5.0,
  reviewCount: 10000,
  images: Array(20).fill(null).map((_, i) => `https://cf.shopee.sg/file/image-${i}`),
  shop: {
    shopId: '99999999',
    name: 'B'.repeat(100),
    rating: 5.0,
  },
};
