/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#03060E',
        holo: { DEFAULT: '#35E4FF', deep: '#0AB6D6', wire: '#8FF4FF' },
        amber: '#FFB020',
        alarm: '#FF4D4D',
        gold: '#FFD98A',
      },
      fontFamily: {
        display: ['Rajdhani', 'sans-serif'],
        body: ['"Space Grotesk"', 'sans-serif'],
        hud: ['"Share Tech Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
