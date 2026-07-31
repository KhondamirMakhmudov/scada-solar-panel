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
        ibmPlexMono: ["IBM Plex Mono", "ui-monospace", "monospace"],
        ibmPlexSans: ["IBM Plex Sans", "sans-serif"],
      },
      colors: {
        primary: "#3b82f6",
        "background-light": "#f6f8f6",
        "background-dark": "#131313",
        "surface-dark": "#1c1b1b",
        "surface-border": "#2a2a2a",
        "surface-border-hover": "#383737",
        "text-primary": "#e5e2e1",
        "text-secondary": "#bfc7d4",
        "text-muted": "#7c8290",
        "text-faint": "#5c6270",
        "text-dim": "#6b7280",
        "hover-bg": "#393939",
        "status-ok": "#22c55e",
        "status-warn": "#f59e0b",
        "status-fault": "#ef4444",
      },
    },
  },
  plugins: [],
};
