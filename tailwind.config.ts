import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom FD colors
        chief: "#FFFFFF",     // White
        member: "#FFFACD",    // Light Yellow
        probationary: "#ADD8E6", // Light Blue
        brand: {
          red: "#B91C1C",
          dark: "#1F2937",
        }
      },
    },
  },
  plugins: [],
};
export default config;
