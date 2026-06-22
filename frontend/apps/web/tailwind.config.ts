import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#f9f9ff',
          dim: '#cadbfc',
          bright: '#f9f9ff',
          variant: '#d6e3ff',
          tint: '#0c56d0',
          container: {
            DEFAULT: '#e7eeff',
            lowest: '#ffffff',
            low: '#f0f3ff',
            high: '#dfe8ff',
            highest: '#d6e3ff',
          },
        },
        'on-surface': {
          DEFAULT: '#091c35',
          variant: '#434654',
        },
        'inverse-surface': '#20314b',
        'inverse-on-surface': '#ecf0ff',
        outline: {
          DEFAULT: '#737685',
          variant: '#c3c6d6',
        },
        primary: {
          DEFAULT: '#003d9b',
          container: '#0052cc',
          fixed: '#dae2ff',
          'fixed-dim': '#b2c5ff',
        },
        'on-primary': {
          DEFAULT: '#ffffff',
          container: '#c4d2ff',
          fixed: '#001848',
          'fixed-variant': '#0040a2',
        },
        'inverse-primary': '#b2c5ff',
        secondary: {
          DEFAULT: '#5e4db9',
          container: '#9f8eff',
          fixed: '#e5deff',
          'fixed-dim': '#c9bfff',
        },
        'on-secondary': {
          DEFAULT: '#ffffff',
          container: '#341d8d',
          fixed: '#1a0063',
          'fixed-variant': '#4633a0',
        },
        tertiary: {
          DEFAULT: '#004e32',
          container: '#006844',
          fixed: '#82f9be',
          'fixed-dim': '#65dca4',
        },
        'on-tertiary': {
          DEFAULT: '#ffffff',
          container: '#72e9af',
          fixed: '#002113',
          'fixed-variant': '#005235',
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        'on-error': {
          DEFAULT: '#ffffff',
          container: '#93000a',
        },
        background: '#f9f9ff',
        'on-background': '#091c35',
      },
      fontFamily: {
        heading: ['Hanken Grotesk', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      fontSize: {
        'display-sm': ['30px', { lineHeight: '38px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-md': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'title-lg': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'title-md': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'label-lg': ['12px', { lineHeight: '16px', letterSpacing: '0.04em', fontWeight: '600' }],
        'label-md': ['11px', { lineHeight: '16px', fontWeight: '500' }],
      },
      borderRadius: {
        sm: '0.125rem',
        DEFAULT: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        gutter: '12px',
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,0.04)',
        'card-drag': '0 8px 24px rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [],
};

export default config;
