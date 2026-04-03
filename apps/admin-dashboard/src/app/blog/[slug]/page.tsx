/**
 * Blog Post Detail Page — /blog/[slug]
 *
 * Hiển thị chi tiết bài viết SEO từ Supabase.
 */

import { SafeHtmlContent } from '@/components/public/SafeHtmlContent';

// ============================================================
// TYPES
// ============================================================
interface PostImage {
  id: string;
  post_id: string;
  url: string;
  prompt: string | null;
  position: number;
  is_cover: boolean;
  alt_text: string | null;
  created_at: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  meta_description: string;
  keywords: string[];
  category: string;
  featured_image_url: string | null;
  featured_image_prompt: string | null;
  status: string;
  source: string;
  published_at: string;
  created_at: string;
  post_images?: PostImage[] | null;
}

// ============================================================
// FETCH DATA (SERVER COMPONENT)
// ============================================================
// force-dynamic: blog posts are edited by admin, must always show fresh content
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function getPost(slug: string): Promise<BlogPost | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=*&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) return null;

    const data: BlogPost[] = await response.json();
    const post = data[0] || null;
    if (!post) return null;

    // Fetch post_images
    const imagesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/post_images?post_id=eq.${post.id}&order=position`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        cache: 'no-store',
      }
    );

    if (imagesRes.ok) {
      const images: PostImage[] = await imagesRes.json();
      return { ...post, post_images: images.length > 0 ? images : null };
    }

    return post;
  } catch {
    return null;
  }
}

async function getRecentPosts(limit = 5): Promise<BlogPost[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return [];
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?status=eq.published&order=published_at.desc&limit=${limit}&select=id,title,slug,meta_description,featured_image_url,category,published_at,post_images(*)`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

// ============================================================
// METADATA
// ============================================================
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);

  if (!post) {
    return {
      title: 'Không tìm thấy bài viết',
    };
  }

  return {
    title: post.title,
    description: post.meta_description,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.meta_description,
      type: 'article',
      publishedTime: post.published_at,
      images: (post.post_images?.find((i) => i.is_cover)?.url ?? post.featured_image_url)
        ? [{ url: post.post_images?.find((i) => i.is_cover)?.url ?? post.featured_image_url!, alt: post.title }]
        : [],
    },
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
  };
}

// ============================================================
// PAGE COMPONENT
// ============================================================
export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const [post, recentPosts] = await Promise.all([
    getPost(params.slug),
    getRecentPosts(5),
  ]);

  if (!post) {
    return <NotFound />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <a href="/blog" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            ← Quay lại Blog
          </a>
        </div>
      </nav>

      {/* Article */}
      <article className="max-w-3xl mx-auto px-4 py-8">
        {/* Cover Image — prefer post_images cover, fallback featured_image_url */}
        {(() => {
          const coverImage = post.post_images?.find((i) => i.is_cover)?.url ?? post.featured_image_url;
          const galleryImages = post.post_images?.filter((i) => !i.is_cover) ?? [];
          return (
          <>
          {coverImage ? (
          <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImage}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className="w-full h-64 md:h-96 rounded-lg overflow-hidden mb-8 flex flex-col items-center justify-center text-white relative"
            style={{
              background: `linear-gradient(135deg,
                hsl(${(post.title?.charCodeAt(0) ?? 0) * 7 % 360}, 70%, 45%) 0%,
                hsl(${(post.title?.charCodeAt(0) ?? 0) * 13 % 360}, 80%, 55%) 50%,
                hsl(${(post.title?.charCodeAt(0) ?? 0) * 19 % 360}, 65%, 40%) 100%)`
            }}
          >
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-8 left-10 w-40 h-40 rounded-full bg-white blur-3xl" />
              <div className="absolute bottom-8 right-10 w-32 h-32 rounded-full bg-white blur-2xl" />
            </div>
            <span className="relative z-10 text-7xl mb-2">🎉</span>
            <span className="relative z-10 text-sm font-medium opacity-80">AI-generated cover</span>
          </div>
        )}
        </>
          );
        })()}

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1 rounded-full">
              {post.category?.toUpperCase() || 'BLOG'}
            </span>
            <span className="text-gray-400 text-sm">
              {new Date(post.published_at || post.created_at).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
            {post.title}
          </h1>

          <p className="text-lg text-gray-600 leading-relaxed">{post.meta_description}</p>

          {/* Keywords */}
          {post.keywords && post.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {post.keywords.map((kw) => (
                <span
                  key={kw}
                  className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full"
                >
                  #{kw}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Content */}
        <div
          className="article-content"
          style={{
            fontSize: '17px',
            lineHeight: '1.8',
            color: '#374151',
          }}
        >
          <style>{`
            .article-content p {
              margin: 0 0 16px;
              line-height: 1.8;
              font-size: 17px;
              color: #374151;
            }
            .article-content h2 {
              margin: 32px 0 12px;
              line-height: 1.3;
              font-size: 1.5rem;
              font-weight: 700;
              color: #111827;
            }
            .article-content h3 {
              margin: 24px 0 10px;
              line-height: 1.4;
              font-size: 1.2rem;
              font-weight: 600;
              color: #1f2937;
            }
            .article-content ul,
            .article-content ol {
              margin: 12px 0 16px 0;
              padding-left: 24px;
            }
            .article-content li {
              margin-bottom: 8px;
              line-height: 1.7;
              font-size: 17px;
              color: #374151;
            }
            .article-content strong {
              font-weight: 600;
              color: #111827;
            }
            .article-content em {
              font-style: italic;
            }
            .article-content blockquote {
              margin: 16px 0;
              padding: 12px 16px;
              border-left: 4px solid #f97316;
              background: #fff7ed;
              border-radius: 0 6px 6px 0;
              color: #4b5563;
              font-style: italic;
            }
            .article-content blockquote p {
              margin: 0;
            }
            .article-content a {
              color: #f97316;
              text-decoration: underline;
            }
            .article-content img {
              max-width: 100%;
              height: auto;
              border-radius: 8px;
              margin: 16px 0;
            }
            .article-content hr {
              margin: 24px 0;
              border: none;
              border-top: 1px solid #e5e7eb;
            }
          `}</style>
          <SafeHtmlContent html={post.content} />
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              📅 Đăng ngày{' '}
              {new Date(post.published_at || post.created_at).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">
              🤖 Auto-generated by AI
            </span>
          </div>
        </footer>

        {/* Image Gallery (additional images beyond cover) */}
        {galleryImages.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">📸 Hình ảnh</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {galleryImages.map((img) => (
                <a
                  key={img.id}
                  href={img.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.alt_text ?? post.title}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 p-6 bg-blue-50 rounded-lg text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            🎉 Tìm mã giảm giá Shopee ngay!
          </h3>
          <p className="text-gray-600 mb-4">
            Dán link sản phẩm để tìm mã giảm giá tốt nhất, nhanh và miễn phí.
          </p>
          <a
            href="/home"
            className="inline-block bg-blue-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tìm mã giảm giá ngay →
          </a>
        </div>
      </article>

      {/* Recent Posts Sidebar */}
      {recentPosts.length > 1 && (
        <div className="max-w-4xl mx-auto px-4 pb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">📚 Bài viết khác</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentPosts
              .filter((p) => p.id !== post.id)
              .slice(0, 3)
              .map((p) => (
                <a
                  key={p.id}
                  href={`/blog/${p.slug}`}
                  className="border rounded-lg p-4 hover:shadow-md transition-all hover:border-blue-300"
                >
                  {(() => {
                    const coverUrl = p.post_images?.find((i: PostImage) => i.is_cover)?.url ?? p.featured_image_url;
                    if (coverUrl) {
                      return (
                        <img
                          src={coverUrl}
                          alt={p.title}
                          className="w-full h-32 object-cover rounded mb-3"
                        />
                      );
                    }
                    return (
                      <div
                        className="w-full h-32 rounded mb-3 flex items-center justify-center text-white text-3xl relative overflow-hidden"
                        style={{
                          background: `linear-gradient(135deg, hsl(${(p.title?.charCodeAt(0) ?? 0) * 7 % 360}, 70%, 45%), hsl(${(p.title?.charCodeAt(0) ?? 0) * 13 % 360}, 80%, 55%))`
                        }}
                      >
                        🎉
                      </div>
                    );
                  })()}
                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{p.title}</h3>
                  <p className="text-gray-500 text-xs mt-1 line-clamp-2">{p.meta_description}</p>
                </a>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// NOT FOUND
// ============================================================
function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="text-8xl mb-4">🔍</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Không tìm thấy bài viết</h1>
        <p className="text-gray-600 mb-6">
          Bài viết bạn đang tìm có thể đã bị xóa hoặc không tồn tại.
        </p>
        <a
          href="/blog"
          className="inline-block bg-blue-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          ← Quay lại Blog
        </a>
      </div>
    </div>
  );
}
