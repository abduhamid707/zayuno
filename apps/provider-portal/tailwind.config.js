/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#16a34a',
          600: '#15803d',
          700: '#166534'
        }
      }
    },
  },
  plugins: [],
}
