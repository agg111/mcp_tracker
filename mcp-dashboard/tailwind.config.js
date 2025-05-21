/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",           // if you have an index.html using Tailwind
    "./src/**/*.{js,ts,jsx,tsx}",  // scan all JS/TS/JSX/TSX files in src folder
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
