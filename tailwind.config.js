/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        manrope: ["Manrope", "sans-serif"],
        spaceGrotesk: ["Space Grotesk", "sans-serif"],
        notoSans: ["Noto Sans", "sans-serif"],
      },
      colors: {
        primary: "#13ec5b",
        "background-light": "#f6f8f6",
        "background-dark": "#102216",
        "surface-dark": "#1a2e22",
        "surface-light": "#ffffff",
      },
    },
  },
  plugins: [],
};
