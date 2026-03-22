import { MetadataRoute } from 'next';
import { getSitemapCandidates } from '../growthPages/data/seoCandidateGenerator.js';

/**
 * Sitemap for the application
 *
 * Lists all public crawlable pages for search engines
 * Only includes:
 * - Static pages (homepage, tool pages)
 * - Priority wave entities that passed scoring thresholds
 *
 * Uses SEO candidate generator to determine eligible entities.
 * This ensures only quality-verified entities are indexed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://voucherfinder.app';

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/paste-link-find-voucher`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/voucher-checker`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  // Get priority wave candidates for sitemap
  try {
    const candidates = await getSitemapCandidates(1);

    const dynamicPages: MetadataRoute.Sitemap = candidates.map(candidate => ({
      url: `${baseUrl}/${candidate.type}/${candidate.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    return [...staticPages, ...dynamicPages];
  } catch (error) {
    // If candidate generation fails, fall back to static pages only
    console.error('Failed to generate sitemap candidates:', error);
    return staticPages;
  }
}
