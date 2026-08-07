import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1280px' },
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: '#638c3a',
          foreground: '#FFFFFF',
          50: '#F2F4EC',
          100: '#E1E6D2',
          200: '#C5CFA8',
          300: '#A4B57D',
          400: '#7FA255',
          500: '#638c3a',
          600: '#4F7330',
          700: '#3D5926',
          800: '#2E421D',
          900: '#1F2D14',
        },
        secondary: {
          DEFAULT: '#1e3a6b',
          foreground: '#FFFFFF',
          50: '#E6EAF0',
          100: '#BCC5D8',
          200: '#8FA3C1',
          300: '#5C7AA1',
          400: '#385C8C',
          500: '#1e3a6b',
          600: '#182E55',
          700: '#132441',
          800: '#0D1A2D',
          900: '#08111E',
        },
        accent: {
          DEFAULT: '#E8DCC4',
          foreground: '#1e3a6b',
        },
        background: '#FAF8F2',
        foreground: '#1e3a6b',
        muted: {
          DEFAULT: '#F1EFE6',
          foreground: '#5C5751',
        },
        success: '#3F8F4F',
        warning: '#C98A2B',
        destructive: {
          DEFAULT: '#B23A3A',
          foreground: '#FFFFFF',
        },
        border: '#D9D5C7',
        input: '#D9D5C7',
        ring: '#638c3a',
      },
      fontFamily: {
        sans: ['Georama', 'system-ui', 'sans-serif'],
        serif: ['Georama', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
