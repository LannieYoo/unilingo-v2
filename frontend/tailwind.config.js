/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  safelist: [
    'bg-background-light',
    'bg-primary',
    'text-primary',
    'border-primary',
    'hover:bg-primary',
    'hover:text-primary',
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#F94B08", // RGB(249, 75, 8) - 주 메인 강조색
        "background-light": "#f8fafc",
        "background-dark": "#0f0f11",
        "card-light": "#ffffff",
        "card-dark": "#18181b",
        "text-light": "#0f172a",
        "text-dark": "#e4e4e7",
        "text-muted-light": "#64748b",
        "text-muted-dark": "#a1a1aa",
        "border-light": "#e2e8f0",
        "border-dark": "#27272a"
      },
      fontFamily: {
        "display": ["Inter", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "0.5rem",
        "lg": "0.75rem",
        "xl": "1rem",
        "full": "9999px"
      },
      maxWidth: {
        "desktop": "1300px",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
}

