/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fdf2f4',
          100: '#fce7eb',
          200: '#f9d0d8',
          300: '#f4a8b8',
          400: '#ec7593',
          500: '#e04a70',
          600: '#cc2d55',
          700: '#b5838d', // Rose bijou principal
          800: '#8b3a4a',
          900: '#752f3e',
        },
        rose: {
          blush: '#b5838d',
          light: '#f0e6e8',
          dark:  '#6d4c55',
        }
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
};
