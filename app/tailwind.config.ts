import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'bonk-dark': '#181A20',       // Background principale
        'bonk-card': '#1E2330',       // Cards e panels
        'bonk-border': '#2A3142',     // Borders
        'bonk-text': '#B8BFCC',       // Testo secondario
        'bonk-orange': '#FF6B35',     // Accent arancione (battle)
        'bonk-orange-bright': '#FF8A5B', // Arancione chiaro luminoso
        'bonk-orange-light': '#FFB088', // Arancione chiaro per badges
        'bonk-orange-dark': '#FF8A5B',   // Arancione chiaro per bottoni Start Battle
        'bonk-orange-brand': '#D94F1C',  // Arancione vivo-scuro per brand/border
        'bonk-green': '#4CAF50',      // Verde (qualified)
        'bonk-gold': '#FFD700',       // Oro (victory/army)
        'bonk-red': '#EF4444',        // Rosso (failed)
        'bonk-purple': '#A855F7',     // Viola (premium)
        'bonk-blue-dark': '#3B82F6',  // Azzurro visibile per "How it works?"
        'bonk-gray-orange': 'rgba(255, 107, 53, 0.15)', // Grigio-arancione trasparente per sidebar active
      },
      keyframes: {
        "shake-yellow": {
          "0%, 100%": {
            transform: "translateX(0) scale(1)",
          },
          "10%": {
            transform: "translateX(-20px) scale(1.03)",
          },
          "20%": {
            transform: "translateX(25px) scale(1.03)",
          },
          "30%": {
            transform: "translateX(-20px) scale(1.03)",
          },
          "40%": {
            transform: "translateX(25px) scale(1.03)",
          },
          "50%": {
            transform: "translateX(-15px) scale(1.03)",
          },
          "60%": {
            transform: "translateX(20px) scale(1.03)",
          },
          "70%": {
            transform: "translateX(-10px) scale(1.03)",
          },
          "80%": {
            transform: "translateX(15px) scale(1.03)",
          },
          "90%": {
            transform: "translateX(-5px) scale(1.03)",
          },
        },
      },
      animation: {
        "shake-yellow": "shake-yellow 0.8s ease-in-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
