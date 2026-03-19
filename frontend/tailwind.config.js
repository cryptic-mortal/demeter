/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Syne", "sans-serif"],
        mono: ["DM Mono", "monospace"],
        serif: ["Instrument Serif", "serif"],
      },
      colors: {
        bg: "#0c1a0e",
        surface: "#1a2b1c",
        border: "#2a3f2c",
        green: "#4ade80",
        amber: "#f59e0b",
        red: "#f87171",
        blue: "#60a5fa",
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease forwards",
        "fade-in": "fadeIn 0.3s ease forwards",
        "spin-slow": "spin 20s linear infinite",
      },
    },
  },
  plugins: [],
};
