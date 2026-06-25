/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0b0f19',
        surface: '#111827',
        primary: '#3b82f6',
        primaryHover: '#2563eb',
        border: '#1f2937',
        textMain: '#f9fafb',
        textMuted: '#9ca3af',
      }
    },
  },
  plugins: [],
}
