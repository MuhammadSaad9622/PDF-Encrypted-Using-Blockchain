/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: 'var(--dark-bg)',
          card: 'var(--dark-card)',
          hover: 'var(--dark-hover)',
        },
        purple: {
          light: '#a855f7',
          DEFAULT: '#9333ea',
          dark: '#7e22ce',
        },
        pink: {
          neon: '#ec4899',
          DEFAULT: '#f472b6',
          light: '#fce7f3',
        },
        blue: {
          neon: '#3b82f6',
          DEFAULT: '#2563eb',
          light: '#60a5fa',
        },
      },
      backgroundImage: {
        'gradient-purple-pink': 'linear-gradient(to right, #9333ea, #ec4899)',
        'gradient-purple-blue': 'linear-gradient(to right, #9333ea, #3b82f6)',
        'gradient-pink-blue': 'linear-gradient(to right, #ec4899, #3b82f6)',
      },
    },
  },
  plugins: [],
};
