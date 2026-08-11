/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0B1020',
        'bg-secondary': '#11182D',
        'surface-1': '#151E36',
        'surface-2': '#1B2642',
        'surface-glass': 'rgba(255,255,255,.06)',
        'border-soft': 'rgba(255,255,255,.08)',
        'border-medium': 'rgba(255,255,255,.12)',
        'border-accent': 'rgba(94,225,255,.28)',
        'text-primary': '#F3F7FF',
        'text-secondary': '#B8C2D9',
        'text-muted': '#7F8CA8',
        'accent-primary': '#5EE1FF',
        'accent-secondary': '#7A5CFF',
        success: '#1FE08F',
        danger: '#FF5D73',
        warning: '#FFB84D',
        info: '#52A7FF',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-inter)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 12px 40px rgba(0,0,0,.20)',
        'card-hover': '0 22px 60px rgba(0,0,0,.32)',
        'glow-accent': '0 0 0 1px rgba(94,225,255,.18), 0 12px 40px rgba(94,225,255,.10)',
        'glow-purple': '0 0 0 1px rgba(122,92,255,.20), 0 16px 50px rgba(122,92,255,.14)',
        'glow-success': '0 0 0 1px rgba(31,224,143,.20), 0 10px 35px rgba(31,224,143,.12)',
        drawer: '-24px 0 70px rgba(0,0,0,.42)',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg,#0B1020 0%,#121D38 45%,#1D2B52 100%)',
        'accent-gradient': 'linear-gradient(135deg,#5EE1FF 0%,#7A5CFF 100%)',
        'success-gradient': 'linear-gradient(180deg,rgba(31,224,143,.35) 0%,rgba(31,224,143,.03) 100%)',
        'danger-gradient': 'linear-gradient(180deg,rgba(255,93,115,.30) 0%,rgba(255,93,115,.03) 100%)',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(.22,1,.36,1)',
      },
    },
  },
  plugins: [],
}
