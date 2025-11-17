import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
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
