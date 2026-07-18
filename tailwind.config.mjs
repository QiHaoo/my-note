/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0d1117',
        'dark-surface': '#161b22',
        'dark-border': '#30363d',
        'dark-text': '#c9d1d9',
        'dark-heading': '#f0f6fc',
        'dark-accent': '#58a6ff',
        'garden-bg': '#f7f3e9',
        'garden-surface': '#fffdf7',
        'garden-border': '#e8e4d9',
        'garden-text': '#3d3d3d',
        'garden-heading': '#2f3e2f',
        'garden-accent': '#5c7c55',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
