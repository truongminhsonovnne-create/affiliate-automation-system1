'use client';

/**
 * BlogClient — Client component for fetching and displaying SEO posts.
 * Fetches from Supabase, displays in card grid.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

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
// SUPABASE CLIENT (client-side safe)
// ============================================================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function getPosts(): Promise<BlogPost[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase env vars not set');
    return [];
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?status=eq.published&order=published_at.desc&limit=20&select=*`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        next: { revalidate: 3600 }, // Cache 1 hour
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch posts:', response.status);
      return [];
    }

    const posts: BlogPost[] = await response.json();

    // Fetch post_images for all posts in parallel
    if (posts.length === 0) return posts;

    const postIds = posts.map((p) => p.id);
    const imagesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/post_images?post_id=in.(${postIds.join(',')})&order=position`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        next: { revalidate: 3600 },
      }
    );

    if (imagesRes.ok) {
      const allImages: PostImage[] = await imagesRes.json();
      const imagesByPostId = new Map<string, PostImage[]>();
      for (const img of allImages) {
        if (!imagesByPostId.has(img.post_id)) imagesByPostId.set(img.post_id, []);
        imagesByPostId.get(img.post_id)!.push(img);
      }
      return posts.map((p) => ({ ...p, post_images: imagesByPostId.get(p.id) ?? null }));
    }

    return posts;
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
}

// ============================================================
// COMPONENT
// ============================================================
export function BlogPageContent() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPosts()
      .then(setPosts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <BlogLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-semibold">⚠️ Đã xảy ra lỗi khi tải bài viết</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Blog đang được cập nhật
          </h1>
          <p className="text-gray-600 mb-4">
            Hệ thống đang tự động viết bài SEO mới. Vui lòng quay lại sau!
          </p>
          <p className="text-sm text-gray-500">
            Bài viết mới sẽ xuất hiện mỗi ngày lúc 7h sáng và 7h tối.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📝 Blog Tin Tức & Hướng Dẫn
        </h1>
        <p className="text-gray-600">
          Tin tức, hướng dẫn và khuyến mãi Shopee hữu ích mỗi ngày.
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-6 text-sm">
        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
          📚 {posts.length} bài viết
        </span>
      </div>

      {/* Posts Grid */}
      <div className="grid gap-6">
        {posts.map((post) => {
          const coverImage = post.post_images?.find((i) => i.is_cover)?.url ?? post.featured_image_url;
          return (
          <article
            key={post.id}
            className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 hover:border-blue-300"
          >
            {/* Cover Image */}
            {coverImage ? (
              <Link href={`/blog/${post.slug}`}>
                <div className="relative w-full h-48 overflow-hidden">
                  <Image
                    src={coverImage}
                    alt={post.title}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, 896px"
                    unoptimized
                  />
                </div>
              </Link>
            ) : (
              <Link href={`/blog/${post.slug}`}>
                <div
                  className="w-full h-48 flex flex-col items-center justify-center text-white relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg,
                      hsl(${(post.title?.charCodeAt(0) ?? 0) * 7 % 360}, 70%, 45%) 0%,
                      hsl(${(post.title?.charCodeAt(0) ?? 0) * 13 % 360}, 80%, 55%) 50%,
                      hsl(${(post.title?.charCodeAt(0) ?? 0) * 19 % 360}, 65%, 40%) 100%)`
                  }}
                >
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-4 left-6 w-32 h-32 rounded-full bg-white blur-2xl" />
                    <div className="absolute bottom-4 right-6 w-24 h-24 rounded-full bg-white blur-xl" />
                  </div>
                  <span className="relative z-10 text-5xl mb-1">🎉</span>
                  <span className="relative z-10 text-xs font-medium opacity-80">Cover image</span>
                </div>
              </Link>
            )}

            {/* Content */}
            <div className="p-6">
              {/* Category */}
              <span className="inline-block bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full mb-3">
                {post.category?.toUpperCase() || 'BLOG'}
              </span>

              {/* Title */}
              <h2 className="text-xl font-bold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>

              {/* Meta description */}
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {post.meta_description}
              </p>

              {/* Keywords */}
              {post.keywords && post.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {post.keywords.slice(0, 4).map((kw) => (
                    <span
                      key={kw}
                      className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t">
                <span>
                  📅{' '}
                  {new Date(post.published_at || post.created_at).toLocaleDateString(
                    'vi-VN',
                    { day: '2-digit', month: '2-digit', year: 'numeric' }
                  )}
                </span>
                <div className="flex items-center gap-3">
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
                    🤖 Auto
                  </span>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Đọc tiếp →
                  </Link>
                </div>
              </div>
            </div>
          </article>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// LOADING SKELETON
// ============================================================
function BlogLoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="h-10 bg-gray-200 rounded w-1/2 mb-2 animate-pulse" />
        <div className="h-5 bg-gray-200 rounded w-1/3 animate-pulse" />
      </div>

      <div className="grid gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-200 h-48 animate-pulse" />
            <div className="p-6 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse" />
              <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
