import colors from 'tailwindcss/colors'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          50: '#f0f7fc',
          100: '#e0f0fa',
          200: '#bce0ff',
          300: '#7cbdf4',
          400: '#389ae9',
          500: '#157bce',
          600: '#085f9e',
          700: '#074b7c',
          800: '#05375c',
          900: '#03233a',
          950: '#021626',
        },
        'primary': '#085f9e',
        'primary-light': '#157bce',
        'success': '#28a745',
      },
      fontFamily: {
        sans: ['Poppins', 'Noto Sans Devanagari', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
