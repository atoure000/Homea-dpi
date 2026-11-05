/** @type{import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f5f8fa',
          100: '#e5edf2',
          200: '#cbd9e2',
          300: '#9aafbd',
          400: '#6f8798',
          500: '#496276',
          600: '#315166',
          700: '#244459',
          800: '#123b55',
          900: '#0874b5',
          950: '#075787',
        },
        medical: {
          50: '#eef8fd',
          100: '#d8effb',
          200: '#b6e1f4',
          300: '#82c9e8',
          400: '#46acd8',
          500: '#168fca',
          600: '#087fbd',
          700: '#066a9f',
          800: '#075780',
          900: '#084766',
          950: '#063249',
        },
        turquoise: {
          50: '#eefafd',
          100: '#d5f1f8',
          200: '#afe1ee',
          300: '#76c9df',
          400: '#3aaecb',
          500: '#138fae',
          600: '#087d9b',
          700: '#08667e',
          800: '#0b5367',
          900: '#0d4353',
          950: '#072d3a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};
