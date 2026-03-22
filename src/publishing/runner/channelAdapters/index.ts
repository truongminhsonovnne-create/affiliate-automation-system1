/**
 * Channel Adapters Index
 *
 * Re-exports all channel adapters and factory functions
 */

// Adapter types
export type {
  PublisherAdapter,
  AdapterFactoryOptions,
  GetPublisherAdapter,
  GetAllPublisherAdapters,
} from './types.js';

// Base adapter
export { BasePublisherAdapter } from './basePublisherAdapter.js';

// TikTok adapter
export { TikTokPublisherAdapter, createTikTokAdapter } from './tiktokAdapter.js';

// Facebook adapter
export { FacebookPublisherAdapter, createFacebookAdapter } from './facebookAdapter.js';

// Website adapter
export { WebsitePublisherAdapter, createWebsiteAdapter } from './websiteAdapter.js';
export type { WebsiteAdapterOptions } from './websiteAdapter.js';

// Factory functions
import type { PublisherChannel } from '../types.js';
import type { PublisherAdapter, AdapterFactoryOptions } from './types.js';
import { TikTokPublisherAdapter } from './tiktokAdapter.js';
import { FacebookPublisherAdapter } from './facebookAdapter.js';
import { WebsitePublisherAdapter } from './websiteAdapter.js';

/**
 * Get publisher adapter for a channel
 */
export function getPublisherAdapter(
  channel: PublisherChannel,
  options?: AdapterFactoryOptions
): PublisherAdapter {
  switch (channel) {
    case 'tiktok':
      return new TikTokPublisherAdapter({
        mockMode: options?.useMock ?? true,
        credentials: options?.credentials,
      });

    case 'facebook':
      return new FacebookPublisherAdapter({
        mockMode: options?.useMock ?? true,
        credentials: options?.credentials,
      });

    case 'website':
      return new WebsitePublisherAdapter({
        mode: options?.useMock ? 'mock' : 'persistence',
        baseUrl: options?.credentials?.baseUrl,
      });

    default:
      throw new Error(`Unsupported publisher channel: ${channel}`);
  }
}

/**
 * Get all publisher adapters
 */
export function getAllPublisherAdapters(
  options?: AdapterFactoryOptions
): Map<PublisherChannel, PublisherAdapter> {
  const adapters = new Map<PublisherChannel, PublisherAdapter>();

  adapters.set('tiktok', getPublisherAdapter('tiktok', options));
  adapters.set('facebook', getPublisherAdapter('facebook', options));
  adapters.set('website', getPublisherAdapter('website', options));

  return adapters;
}

// Default export
export default {
  getPublisherAdapter,
  getAllPublisherAdapters,
};
