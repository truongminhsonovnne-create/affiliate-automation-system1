/**
 * Crawler Foundation Layer - Browser Profile
 *
 * Mobile browser profile configuration for Shopee.
 */

import type { ShopeeMobileProfile } from './types.js';
import { MOBILE_PROFILE } from './constants.js';

/**
 * Get mobile browser profile for Shopee
 *
 * @param envOrOptions - Environment name or partial profile override
 * @returns Complete mobile profile configuration
 *
 * @example
 * const profile = getShopeeMobileProfile();
 * const profile = getShopeeMobileProfile('production');
 * const profile = getShopeeMobileProfile({ viewport: { width: 390, height: 844 } });
 */
export function getShopeeMobileProfile(
  envOrOptions?: string | Partial<ShopeeMobileProfile>
): ShopeeMobileProfile {
  // Default Shopee mobile user agent (iPhone 14 Pro simulation)
  const defaultUserAgent = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1',
  ].join(' ');

  const baseProfile: ShopeeMobileProfile = {
    userAgent: defaultUserAgent,
    viewport: {
      width: MOBILE_PROFILE.VIEWPORT_WIDTH,
      height: MOBILE_PROFILE.VIEWPORT_HEIGHT,
      deviceScaleFactor: MOBILE_PROFILE.DEVICE_SCALE_FACTOR,
      isMobile: true,
      hasTouch: true,
    },
    locale: {
      locale: MOBILE_PROFILE.LOCALE,
      timezoneId: MOBILE_PROFILE.TIMEZONE,
      acceptLanguage: MOBILE_PROFILE.ACCEPT_LANGUAGE,
    },
    permissions: ['geolocation'],
    geolocation: MOBILE_PROFILE.GEOLOCATION,
    colorScheme: 'light',
    profileName: 'shopee-mobile-default',
  };

  // Handle string input (environment)
  if (typeof envOrOptions === 'string') {
    return applyEnvironmentProfile(baseProfile, envOrOptions);
  }

  // Handle partial override
  if (envOrOptions && typeof envOrOptions === 'object') {
    return applyProfileOverride(baseProfile, envOrOptions);
  }

  return baseProfile;
}

/**
 * Apply environment-specific profile overrides
 */
function applyEnvironmentProfile(
  base: ShopeeMobileProfile,
  env: string
): ShopeeMobileProfile {
  const envLower = env.toLowerCase();

  const envProfile: Partial<ShopeeMobileProfile> = {};

  switch (envLower) {
    case 'production':
      envProfile.profileName = 'shopee-mobile-production';
      break;
    case 'staging':
      envProfile.profileName = 'shopee-mobile-staging';
      break;
    case 'development':
      envProfile.profileName = 'shopee-mobile-dev';
      break;
    case 'test':
      envProfile.profileName = 'shopee-mobile-test';
      break;
  }

  return applyProfileOverride(base, envProfile);
}

/**
 * Apply partial profile overrides
 */
function applyProfileOverride(
  base: ShopeeMobileProfile,
  override: Partial<ShopeeMobileProfile>
): ShopeeMobileProfile {
  const result: ShopeeMobileProfile = { ...base };

  // Apply simple properties
  if (override.userAgent !== undefined) {
    result.userAgent = override.userAgent;
  }
  if (override.profileName !== undefined) {
    result.profileName = override.profileName;
  }
  if (override.colorScheme !== undefined) {
    result.colorScheme = override.colorScheme;
  }
  if (override.permissions !== undefined) {
    result.permissions = override.permissions;
  }
  if (override.geolocation !== undefined) {
    result.geolocation = override.geolocation;
  }

  // Apply viewport override
  if (override.viewport !== undefined) {
    result.viewport = {
      ...base.viewport,
      ...override.viewport,
    };
  }

  // Apply locale override
  if (override.locale !== undefined) {
    result.locale = {
      ...base.locale,
      ...override.locale,
    };
  }

  return result;
}

/**
 * Get browser context options from profile
 *
 * @param profile - Mobile profile
 * @returns Playwright BrowserContextOptions
 */
export function getContextOptionsFromProfile(
  profile: ShopeeMobileProfile
): {
  viewport: { width: number; height: number; deviceScaleFactor?: number };
  userAgent?: string;
  locale?: string;
  timezoneId?: string;
  permissions?: string[];
  geolocation?: { latitude: number; longitude: number };
  colorScheme?: 'light' | 'dark' | 'no-preference';
  extraHTTPHeaders?: Record<string, string>;
} {
  return {
    viewport: {
      width: profile.viewport.width,
      height: profile.viewport.height,
      deviceScaleFactor: profile.viewport.deviceScaleFactor,
    },
    userAgent: profile.userAgent,
    locale: profile.locale.locale,
    timezoneId: profile.locale.timezoneId,
    permissions: profile.permissions,
    geolocation: profile.geolocation,
    colorScheme: profile.colorScheme,
    extraHTTPHeaders: {
      'Accept-Language': profile.locale.acceptLanguage,
    },
  };
}

/**
 * Validate profile completeness
 *
 * @param profile - Profile to validate
 * @returns Validation result
 */
export function validateProfile(
  profile: ShopeeMobileProfile
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!profile.userAgent) {
    errors.push('Missing userAgent');
  }

  if (!profile.viewport?.width || !profile.viewport?.height) {
    errors.push('Missing or invalid viewport dimensions');
  }

  if (!profile.locale?.locale || !profile.locale?.timezoneId) {
    errors.push('Missing locale configuration');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
