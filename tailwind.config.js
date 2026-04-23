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
        primary: "#3b82f6",
        "background-light": "#f6f8f6",
        "background-dark": "#131313",
        "surface-dark": "#1c1b1b",
        "surface-border": "#2a2a2a",
        "text-primary": "#e5e2e1",
        "text-secondary": "#bfc7d4",
        "hover-bg": "#393939",
      },
    },
  },
  plugins: [],
};
