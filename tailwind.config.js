/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* 青蓝渐变色板 - 更明亮有生机 */
        'deep-space': '#0B1E33',
        'carbon-black': '#05080C',
        'cyan-blue': {
          primary: '#00DCC8',
          light: '#3DF5E0',
          dark: '#00B5A8',
        },
        /* 背景层级 */
        'bg-primary': '#0B1E33',
        'bg-secondary': '#12283D',
        'bg-tertiary': '#1A3048',
        /* 状态色 */
        'success': '#4CAF50',
        'warning': '#EF5350',
        /* 文字色 */
        'text-primary': '#FFFFFF',
        'text-secondary': '#8FA8BC',
      },
      fontFamily: {
        'tech': ['"Courier New"', 'monospace', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon': '0 0 10px #00DCC8, 0 0 20px #00DCC8',
        'neon-sm': '0 0 5px #00DCC8, 0 0 10px #00DCC8',
        'glow': '0 0 25px rgba(0, 220, 200, 0.5), 0 0 50px rgba(0, 220, 200, 0.25)',
        'glow-lg': '0 0 40px rgba(0, 220, 200, 0.65), 0 0 80px rgba(0, 220, 200, 0.35)',
        'glow-breathe': '0 0 30px rgba(0, 220, 200, 0.45), 0 0 60px rgba(0, 220, 200, 0.25)',
      },
      animation: {
        'breathing': 'glow-breathe 3s ease-in-out infinite',
        'border-breathe': 'border-breathe 3s ease-in-out infinite',
        'flow': 'flow-gradient 3s ease infinite',
        'pulse': 'pulse-soft 3s ease-in-out infinite',
      },
      keyframes: {
        'glow-breathe': {
          '0%, 100%': { boxShadow: '0 0 25px rgba(0, 220, 200, 0.4), 0 0 50px rgba(0, 220, 200, 0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 220, 200, 0.65), 0 0 80px rgba(0, 220, 200, 0.35)' },
        },
        'border-breathe': {
          '0%, 100%': { borderColor: 'rgba(0, 220, 200, 0.25)', boxShadow: '0 0 25px rgba(0, 220, 200, 0.15)' },
          '50%': { borderColor: 'rgba(0, 220, 200, 0.55)', boxShadow: '0 0 45px rgba(0, 220, 200, 0.28)' },
        },
        'flow-gradient': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.88', transform: 'scale(0.95)' },
        },
      },
    },
  },
  plugins: [],
}