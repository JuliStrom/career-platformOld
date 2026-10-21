/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Приглушённая холодная палитра. Дубль значений — src/shared/config/theme/colors.ts
        canvas: { DEFAULT: '#f4f6fb', dark: '#0f1729' },
        header: { DEFAULT: '#dfe7f5', dark: '#182242' },
        hairline: { DEFAULT: '#c8d5ec', dark: '#283454' },
      },
      borderRadius: {
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
};
