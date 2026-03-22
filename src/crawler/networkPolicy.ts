/**
 * Crawler Foundation Layer - Network Policy
 *
 * Request/resource policy management for browser automation.
 */

import type { Page } from 'playwright';
import type {
  NetworkPolicyOptions,
  NetworkPolicyMode,
  ApplyNetworkPolicyResult,
  CrawlerLogger,
} from './types.js';
import { RESOURCE_POLICY, EVENTS } from './constants.js';

/**
 * Apply network policy to a page
 *
 * This function sets up request handling based on the specified policy mode.
 * It does NOT block critical resources (scripts, xhr) to ensure site functionality.
 *
 * @param page - Playwright Page instance
 * @param options - Policy configuration options
 * @returns Result of policy application
 *
 * @example
 * // Apply default safe policy
 * await applyShopeeNetworkPolicy(page);
 *
 * // Apply relaxed policy for faster loading
 * await applyShopeeNetworkPolicy(page, { mode: 'relaxed' });
 *
 * // Disable policy for debugging
 * await applyShopeeNetworkPolicy(page, { mode: 'disabled' });
 */
export async function applyShopeeNetworkPolicy(
  page: Page,
  options: NetworkPolicyOptions = {}
): Promise<ApplyNetworkPolicyResult> {
  const mode = options.mode ?? RESOURCE_POLICY.DEFAULT_MODE;
  const logger = options.logger;

  // Handle disabled mode
  if (mode === 'disabled') {
    if (logger) {
      logger.debug('Network policy disabled');
    }
    return {
      ok: true,
      appliedMode: 'disabled',
      handlersRegistered: 0,
    };
  }

  let handlersRegistered = 0;

  try {
    // Apply request interception
    await page.route('**/*', async (route) => {
      const request = route.request();
      const requestType = request.resourceType();
      const url = new URL(request.url());
      const hostname = url.hostname;

      // Check if request should be allowed
      const shouldAllow = shouldAllowRequest(
        requestType,
        hostname,
        options
      );

      if (shouldAllow) {
        await route.continue();
      } else {
        if (options.logAbortedRequests && logger) {
          logger.debug(`Blocked request: ${requestType} ${hostname}${url.pathname}`);
        }
        await route.abort();
      }
    });

    handlersRegistered++;

    // Log successful setup
    if (logger) {
      logger.info(`Network policy applied: ${mode}`, {
        mode,
        blockedTypes: getBlockedTypesForMode(mode),
        blockedHosts: RESOURCE_POLICY.BLOCKED_HOSTS.length,
      });
    }

    return {
      ok: true,
      appliedMode: mode,
      handlersRegistered,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (logger) {
      logger.error('Failed to apply network policy', { error: errorMessage });
    }

    return {
      ok: false,
      appliedMode: mode,
      handlersRegistered: 0,
      error: errorMessage,
    };
  }
}

/**
 * Determine if a request should be allowed
 */
function shouldAllowRequest(
  requestType: string,
  hostname: string,
  options: NetworkPolicyOptions
): boolean {
  const mode = options.mode ?? 'default';

  // Always allow critical resource types regardless of policy
  const criticalTypes = ['script', 'xhr', 'fetch', 'document', 'stylesheet'];
  if (criticalTypes.includes(requestType)) {
    return true;
  }

  // Check allowed hosts whitelist first
  if (isAllowedHost(hostname, options.allowedHostnames)) {
    return true;
  }

  // Check blocked hosts blacklist
  if (isBlockedHost(hostname, options.blockedHostnames)) {
    return false;
  }

  // Apply mode-specific blocking
  const blockedTypes = getBlockedTypesForMode(mode);

  if (blockedTypes.includes(requestType)) {
    return false;
  }

  // Check generic blocked hosts
  if (RESOURCE_POLICY.BLOCKED_HOSTS.some(blocked =>
    hostname.includes(blocked)
  )) {
    return false;
  }

  return true;
}

/**
 * Check if hostname is in allowed list
 */
function isAllowedHost(
  hostname: string,
  customAllowed?: string[]
): boolean {
  const allowedHosts = [
    ...RESOURCE_POLICY.ALLOWED_HOSTS,
    ...(customAllowed || []),
  ];

  return allowedHosts.some(allowed => hostname.includes(allowed));
}

/**
 * Check if hostname is in blocked list
 */
function isBlockedHost(
  hostname: string,
  customBlocked?: string[]
): boolean {
  const blockedHosts = [
    ...RESOURCE_POLICY.BLOCKED_HOSTS,
    ...(customBlocked || []),
  ];

  return blockedHosts.some(blocked => hostname.includes(blocked));
}

/**
 * Get blocked resource types for a given mode
 */
function getBlockedTypesForMode(mode: NetworkPolicyMode): string[] {
  switch (mode) {
    case 'strict':
      return [...RESOURCE_POLICY.STRICT_BLOCKED_TYPES];
    case 'relaxed':
      return [...RESOURCE_POLICY.RELAXED_BLOCKED_TYPES];
    case 'default':
    default:
      // Default mode blocks only media
      return ['media'];
  }
}

/**
 * Remove network policy from a page
 *
 * @param page - Playwright Page instance
 */
export async function removeNetworkPolicy(page: Page): Promise<void> {
  // Unroute all routes to remove interception
  await page.unrouteAll();
}

/**
 * Create network policy options from mode name
 *
 * @param mode - Policy mode name
 * @param logger - Optional logger
 * @returns NetworkPolicyOptions
 */
export function createNetworkPolicyOptions(
  mode: NetworkPolicyMode,
  logger?: CrawlerLogger
): NetworkPolicyOptions {
  return {
    mode,
    logAbortedRequests: mode !== 'disabled',
    logger,
  };
}

/**
 * Get policy mode description
 */
export function getPolicyModeDescription(mode: NetworkPolicyMode): string {
  const descriptions: Record<NetworkPolicyMode, string> = {
    default: 'Blocks media resources, known tracking/ad hosts',
    relaxed: 'Blocks only media resources, faster loading',
    strict: 'Blocks media and fonts, maximum resource savings',
    disabled: 'No blocking, logs all requests',
  };
  return descriptions[mode];
}

/**
 * Apply basic resource handling (non-blocking)
 * This is a lighter version that just logs/aborts without full interception
 *
 * @param page - Playwright Page instance
 * @param options - Options
 */
export async function applyBasicResourceHandling(
  page: Page,
  options: {
    logger?: CrawlerLogger;
    blockMedia?: boolean;
  } = {}
): Promise<void> {
  const { logger, blockMedia = false } = options;

  if (!blockMedia) {
    return;
  }

  // Simple media blocking without full interception
  await page.route(/\.(mp4|webm|mp3|wav|ogg)$/, (route) => {
    if (logger) {
      logger.debug(`Blocked media: ${route.request().url()}`);
    }
    route.abort();
  });
}
