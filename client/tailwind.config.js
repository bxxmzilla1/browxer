/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0f0f13',
          card: '#18181f',
          hover: '#22222c',
          border: '#2e2e3a',
        },
        accent: {
          DEFAULT: '#7c3aed',
          light: '#a78bfa',
          hover: '#6d28d9',
        },
        status: {
          active: '#22c55e',
          connecting: '#f59e0b',
          error: '#ef4444',
          closed: '#6b7280',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
