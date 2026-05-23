/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['DM Serif Display', 'Georgia', 'serif'],
      },
      colors: {
        cream: {
          50:  '#FDFCFA',
          100: '#F8F5F0',
          200: '#EDE8DF',
        },
        brand: {
          red:     '#B91C1C',
          'red-light': '#FEE2E2',
          'red-mid': '#DC2626',
        },
        success: '#15803D',
        'success-light': '#DCFCE7',
        warning: '#D97706',
        'warning-light': '#FEF3C7',
        danger:  '#B91C1C',
        'danger-light': '#FEE2E2',
        ink: {
          900: '#171717',
          700: '#374151',
          500: '#6B7280',
          300: '#D1D5DB',
          100: '#F3F4F6',
        },
        sidebar: '#111827',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.05)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.10)',
        'elevated': '0 8px 24px 0 rgba(0,0,0,0.10)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
