/**
 * Shopee Pipeline - Browser Manager
 *
 * Manages Playwright browser lifecycle with stealth configuration.
 */

import { chromium, type Browser, type BrowserContext, type BrowserLaunchOptions } from 'playwright';
import { PIPELINE_BROWSER } from './constants.js';
import type { PipelineLogger } from './types.js';

export interface ShopeeBrowserManagerOptions {
  /** Launch in headless mode */
  headless?: boolean;

  /** Custom launch options */
  launchOptions?: BrowserLaunchOptions;

  /** Page load timeout */
  timeout?: number;

  /** Custom logger */
  logger?: PipelineLogger;
}

/**
 * Browser manager for Shopee pipeline
 */
export class ShopeeBrowserManager {
  private options: Required<ShopeeBrowserManagerOptions>;
  private browser: Browser | null = null;
  private logger?: PipelineLogger;

  constructor(options: ShopeeBrowserManagerOptions = {}) {
    this.options = {
      headless: options.headless ?? PIPELINE_BROWSER.DEFAULT_HEADLESS,
      launchOptions: options.launchOptions ?? {},
      timeout: options.timeout ?? PIPELINE_BROWSER.TIMEOUT,
      logger: options.logger,
    };
    this.logger = options.logger;
  }

  /**
   * Launch browser with stealth configuration
   */
  async launch(): Promise<Browser> {
    if (this.browser) {
      this.logger?.debug('Reusing existing browser instance');
      return this.browser;
    }

    this.logger?.info('Launching browser', { headless: this.options.headless });

    try {
      this.browser = await chromium.launch({
        headless: this.options.headless,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-infobars',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--window-size=1920,1080',
        ],
        ...this.options.launchOptions,
      });

      this.logger?.debug('Browser launched successfully');
      return this.browser;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger?.error('Failed to launch browser', { error: errorMessage });
      throw new Error(`Browser launch failed: ${errorMessage}`);
    }
  }

  /**
   * Create new browser context
   */
  async createContext(options: {
    locale?: string;
    timezoneId?: string;
    userAgent?: string;
  } = {}): Promise<BrowserContext> {
    const browser = await this.launch();

    const context = await browser.newContext({
      locale: options.locale ?? 'vi-VN',
      timezoneId: options.timezoneId ?? 'Asia/Ho_Chi_Minh',
      userAgent: options.userAgent ?? this.getStealthUserAgent(),
      viewport: { width: 1920, height: 1080 },
    });

    // Apply stealth measures
    await this.applyStealth(context);

    this.logger?.debug('Browser context created');
    return context;
  }

  /**
   * Apply stealth measures to context
   */
  private async applyStealth(context: BrowserContext): Promise<void> {
    await context.addInitScript(() => {
      // Override navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });

      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['vi-VN', 'vi', 'en-US', 'en'],
      });
    });
  }

  /**
   * Get stealth user agent
   */
  private getStealthUserAgent(): string {
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  /**
   * Get current browser instance
   */
  getBrowser(): Browser | null {
    return this.browser;
  }

  /**
   * Check if browser is launched
   */
  isLaunched(): boolean {
    return this.browser !== null;
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.logger?.debug('Browser closed');
    }
  }
}

/**
 * Create browser manager
 */
export function createShopeeBrowserManager(
  options: ShopeeBrowserManagerOptions = {}
): ShopeeBrowserManager {
  return new ShopeeBrowserManager(options);
}
