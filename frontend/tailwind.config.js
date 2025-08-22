/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        highlight: {
          1: "#e2fdff", // lightest
          2: "#c1f6fd",
          3: "#9eeffc",
          4: "#77e7fc",
          5: "#00d9ff", // darkest
        },
      },
    },
  },
  plugins: [],
};
