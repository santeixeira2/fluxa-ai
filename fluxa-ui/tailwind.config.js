/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#000000',
          secondary: '#050505',
          card: 'rgba(255, 255, 255, 0.02)',
          elevated: 'rgba(255, 255, 255, 0.04)',
        },
        accent: {
          teal: '#FFFFFF', // Moving to a cleaner monochromatic look with white as accent
          gold: '#C8A96E',
        },
        status: {
          profit: '#FFFFFF', // In SafeFound, profit is often just white/bright
          loss: 'rgba(255, 255, 255, 0.4)',
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      boxShadow: {
        'card': '0 0 0 1px rgba(255, 255, 255, 0.08)',
        'glow': '0 0 80px rgba(255, 255, 255, 0.05)',
      }
    },
  },
  plugins: [],
}
