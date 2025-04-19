/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography'; // Import the plugin

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
      },
      fontFamily: {
        chomsky: ['Chomsky', 'serif'],
      },
    },
  },
  plugins: [
    typography, // Add the typography plugin here
  ],
};
