/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    // ============================================================
    // Design System — Foundation Tokens
    // ============================================================

    // Brand color scale (orange, primary accent)
    colors: {
      brand: {
        50:  '#fff7ed',
        100: '#ffedd5',
        200: '#fed7aa',
        300: '#fdba74',
        400: '#fb923c',
        500: '#f97316',
        600: '#ea580c',
        700: '#c2410c',
        800: '#9a3412',
        900: '#7c2d12',
        950: '#431407',
      },
      // Gray scale — used by design system components
      gray: {
        50:  '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827',
        950: '#030712',
      },
      // Utility
      white: '#ffffff',
      black: '#000000',
    },

    // ============================================================
    // Typography
    // ============================================================
    fontFamily: {
      sans: [
        'Inter',
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'sans-serif',
      ],
      mono: [
        'JetBrains Mono',
        'Fira Code',
        'ui-monospace',
        'SFMono-Regular',
        'Menlo',
        'Monaco',
        'Consolas',
        'Liberation Mono',
        'Courier New',
        'monospace',
      ],
    },

    // ============================================================
    // Border Radius — 4-tier system
    // sm: small tags/chips | md: cards | lg: modals | xl: hero panels
    // ============================================================
    borderRadius: {
      none:  '0px',
      sm:    '0.25rem',   // 4px  — chips, tiny tags
      DEFAULT: '0.5rem',   // 8px  — buttons, inputs (matches --radius)
      md:    '0.75rem',   // 12px — cards
      lg:    '1rem',      // 16px — large cards, panels
      xl:    '1.5rem',    // 24px — hero sections
      '2xl': '2rem',      // 32px — containers
      full:  '9999px',
    },

    // ============================================================
    // Shadows — 4-tier system
    // ============================================================
    boxShadow: {
      'subtle':   '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      'card':     '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
      'md':       '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
      'lg':       '0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
      'xl':       '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
      'brand':    '0 4px 14px 0 rgb(249 115 22 / 0.30)',
      'brand-sm': '0 2px 8px 0 rgb(249 115 22 / 0.20)',
      'focus':    '0 0 0 3px rgb(249 115 22 / 0.25)',
      'focus-sm': '0 0 0 2px rgb(249 115 22 / 0.20)',
    },

    // ============================================================
    // Animation
    // ============================================================
    animation: {
      'spin-slow':  'spin 2s linear infinite',
      'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      'bounce-sm':  'bounce 1s ease-in-out 2',
      'fade-in':    'fadeIn 200ms ease-out',
      'slide-up':   'slideUp 200ms ease-out',
      'slide-down': 'slideDown 200ms ease-out',
    },
    keyframes: {
      fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
      slideUp:    { '0%': { transform: 'translateY(10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      slideDown:  { '0%': { transform: 'translateY(-8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
    },

    // ============================================================
    // Transitions
    // ============================================================
    transitionDuration: {
      DEFAULT: '150ms',
      fast:    '100ms',
      slow:    '250ms',
    },
    transitionTimingFunction: {
      DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring:  'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },

    // ============================================================
    // Z-index scale
    // ============================================================
    zIndex: {
      dropdown: '10',
      sticky:   '20',
      overlay:  '30',
      modal:    '40',
      toast:    '50',
      tooltip:  '60',
    },
  },
  plugins: [],
};
