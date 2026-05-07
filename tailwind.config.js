/** @type {import('tailwindcss').Config} */
const primary = {
  50: "#eff8ff",
  100: "#d9efff",
  200: "#b5ddff",
  300: "#84c7ff",
  400: "#4aaee6",
  500: "#157ec3",
  600: "#0f5f96",
  700: "#0d5a8f",
  800: "#0a466f",
  900: "#06324f",
  DEFAULT: "#157ec3",
};

module.exports = {
  content: ["./src/app/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary,
        blue: primary,
        indigo: primary,
      },
    },
  },
};

