/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#714B67', // Odoo classic plum accent
          600: '#5c3a53',
          700: '#462b3f',
          800: '#321c2d',
          900: '#1f101c',
        },
        odoo: {
          purple: '#714B67',
          teal: '#017E84',
          orange: '#F06050',
          yellow: '#F4A261',
          green: '#2A9D8F',
          dark: '#212529',
          light: '#F8F9FA',
          border: '#E9ECEF'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 10px 0 rgba(0, 0, 0, 0.05)',
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'modal': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
