/**
 * Crawler Foundation Layer - Init Scripts
 *
 * Centralized management of browser/page init scripts.
 * Scripts are designed to be safe and non-invasive.
 */

import type { InitScript, InitScriptsCollection } from './types.js';

// ============================================
// Init Scripts Collection
// ============================================

/**
 * Get all Shopee init scripts
 * These scripts are applied via page.addInitScript()
 *
 * Each script has:
 * - name: identifier
 * - script: the actual JS code
 * - enabled: whether to apply
 * - description: what it does
 * - riskLevel: safety assessment
 */
export function getShopeeInitScripts(): InitScriptsCollection {
  const scripts: InitScript[] = [
    {
      name: 'remove-automation-detection',
      script: removeAutomationDetectionScript,
      enabled: true,
      description: 'Remove common automation detection properties',
      riskLevel: 'safe',
    },
    {
      name: 'patch-navigator',
      script: patchNavigatorScript,
      enabled: true,
      description: 'Patch navigator properties to appear more human',
      riskLevel: 'safe',
    },
    {
      name: 'fix-webdriver-property',
      script: fixWebdriverPropertyScript,
      enabled: true,
      description: 'Remove webdriver property from navigator',
      riskLevel: 'safe',
    },
    {
      name: 'randomize-screen-properties',
      script: randomizeScreenPropertiesScript,
      enabled: true,
      description: 'Add slight randomization to screen properties',
      riskLevel: 'safe',
    },
  ];

  return {
    scripts,
    getEnabled(): InitScript[] {
      return this.scripts.filter(s => s.enabled);
    },
    getByName(name: string): InitScript | undefined {
      return this.scripts.find(s => s.name === name);
    },
  };
}

/**
 * Get enabled scripts as executable functions
 * Returns array of { name, script } objects for addInitScript
 */
export function getEnabledInitScripts(): Array<{ name: string; script: string }> {
  const collection = getShopeeInitScripts();
  return collection.getEnabled().map(s => ({
    name: s.name,
    script: s.script,
  }));
}

/**
 * Get script content by name
 */
export function getInitScriptByName(name: string): string | undefined {
  const collection = getShopeeInitScripts();
  const script = collection.getByName(name);
  return script?.script;
}

// ============================================
// Script Implementations
// ============================================

/**
 * Remove automation detection properties from window and document
 */
const removeAutomationDetectionScript = `
// Remove automation detection
(function() {
  'use strict';

  // Remove CDP detection
  if (window.cdc_adoQpoasnfa76pfcZLmcfl_Array) {
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
  }
  if (window.cdc_adoQpoasnfa76pfcZLmcfl_Promise) {
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
  }
  if (window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol) {
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
  }

  // Override chrome runtime
  if (window.chrome) {
    window.chrome.runtime = {
      connect: function() {},
      sendMessage: function() {},
    };
  }
})();
`;

/**
 * Patch navigator properties to appear more human
 */
const patchNavigatorScript = `
// Patch navigator properties
(function() {
  'use strict';

  // Store original values
  const originalNavigator = Object.getOwnPropertyDescriptor(window, 'navigator');
  const originalNavigatorPrototype = Object.getOwnPropertyDescriptor(
    Navigator.prototype,
    'webdriver'
  );

  // Override webdriver property
  Object.defineProperty(Navigator.prototype, 'webdriver', {
    get: function() {
      return undefined;
    },
    configurable: true,
  });

  // Add plugins if missing (for plugin detection)
  if (navigator.plugins.length === 0) {
    Object.defineProperty(navigator, 'plugins', {
      get: function() {
        return [1, 2, 3, 4, 5];
      },
      configurable: true,
    });
  }

  // Add languages if missing
  if (!navigator.languages || navigator.languages.length === 0) {
    Object.defineProperty(navigator, 'languages', {
      get: function() {
        return ['vi-VN', 'vi', 'en-US', 'en'];
      },
      configurable: true,
    });
  }
})();
`;

/**
 * Fix webdriver property completely
 */
const fixWebdriverPropertyScript = `
// Fix webdriver property
(function() {
  'use strict';

  // Remove webdriver flag
  Object.defineProperty(navigator, 'webdriver', {
    get: function() {
      return false;
    },
    set: function() {},
    configurable: false,
  });

  // Ensure navigator is configurable
  try {
    Object.defineProperty(navigator, 'webdriver', {
      get: function() { return false; },
      configurable: true,
    });
  } catch (e) {
    // Ignore if already defined
  }
})();
`;

/**
 * Randomize screen properties slightly
 */
const randomizeScreenPropertiesScript = `
// Randomize screen properties
(function() {
  'use strict';

  // Add slight randomization to screen properties
  const originalScreen = window.screen;

  // Only patch if screen exists
  if (originalScreen) {
    // Add pixel ratio jitter
    try {
      const pixelRatio = window.devicePixelRatio || 1;
      const jitter = (Math.random() - 0.5) * 0.1;
      Object.defineProperty(window, 'devicePixelRatio', {
        get: function() {
          return pixelRatio + jitter;
        },
        configurable: true,
      });
    } catch (e) {
      // Ignore if cannot override
    }
  }

  // Fix permissions
  if (window.Notification) {
    window.Notification.permission = 'default';
  }

  // Fix clipboard
  if (navigator.clipboard) {
    // Already available - good
  }
})();
`;

// ============================================
// Utility Functions
// ============================================

/**
 * Validate script safety
 * Returns warnings for potentially risky scripts
 */
export function validateScriptSafety(script: InitScript): {
  safe: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check for dangerous patterns
  const dangerousPatterns = [
    { pattern: /eval\s*\(/, message: 'Contains eval()' },
    { pattern: /document\.cookie/, message: 'Accesses cookies directly' },
    { pattern: /localStorage/, message: 'Modifies localStorage' },
    { pattern: /sessionStorage/, message: 'Modifies sessionStorage' },
  ];

  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(script.script)) {
      warnings.push(message);
    }
  }

  return {
    safe: warnings.length === 0,
    warnings,
  };
}

/**
 * Get all scripts with safety report
 */
export function getScriptsWithSafetyReport(): Array<InitScript & { safetyReport: { safe: boolean; warnings: string[] } }> {
  const collection = getShopeeInitScripts();
  return collection.scripts.map(script => ({
    ...script,
    safetyReport: validateScriptSafety(script),
  }));
}
