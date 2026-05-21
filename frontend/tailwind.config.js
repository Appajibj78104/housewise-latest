/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: '#ff3cac',
          purple: '#784ba0',
          blue: '#2b86c5',
          orange: '#ff6b35',
          dark: '#0a0a0f',
          card: '#111118',
          border: '#1e1e2e',
        },
        surface: {
          DEFAULT: '#0f1117',
          raised: '#161922',
          overlay: '#1c1f2e',
          hover: '#242838',
          active: '#2a2f42',
          border: '#2a2f42',
          'border-light': '#353a50',
        },
        coral: {
          50: '#fff5f4', 100: '#ffe8e6', 200: '#ffd5d1', 300: '#ffb5ae',
          400: '#ff8a7a', 500: '#FF6F61', 600: '#e55a4f', 700: '#c1453c',
          800: '#a03832', 900: '#84312e',
        },
        neutral: {
          50: '#f8fafc', 100: '#eef1f5', 200: '#d5dae2', 300: '#b0b8c4',
          400: '#8892a2', 500: '#6b7385', 600: '#545c6e', 700: '#3e4456',
          800: '#2a2f42', 900: '#1c1f2e', 950: '#0f1117',
        },
        accent: {
          blue: '#3b82f6', 'blue-light': '#60a5fa',
          'blue-muted': 'rgba(59, 130, 246, 0.12)',
          purple: '#8b5cf6', 'purple-muted': 'rgba(139, 92, 246, 0.12)',
        },
        success: { DEFAULT: '#10b981', light: '#34d399', muted: 'rgba(16, 185, 129, 0.12)', text: '#6ee7b7' },
        warning: { DEFAULT: '#f59e0b', light: '#fbbf24', muted: 'rgba(245, 158, 11, 0.12)', text: '#fcd34d' },
        danger: { DEFAULT: '#ef4444', light: '#f87171', muted: 'rgba(239, 68, 68, 0.12)', text: '#fca5a5' },
        content: { primary: '#f1f3f7', secondary: '#b0b8c4', muted: '#6b7385', inverse: '#0f1117' },
        ivory: '#FFF9F2',
        charcoal: {
          50: '#f7f7f7', 100: '#e3e3e3', 200: '#c8c8c8', 300: '#a4a4a4',
          400: '#818181', 500: '#666666', 600: '#515151', 700: '#434343',
          800: '#383838', 900: '#333333',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '700', letterSpacing: '-0.02em' }],
        'title':   ['1.5rem',  { lineHeight: '2rem',   fontWeight: '600', letterSpacing: '-0.01em' }],
        'heading': ['1.125rem',{ lineHeight: '1.75rem', fontWeight: '600' }],
        'body':    ['0.875rem',{ lineHeight: '1.5rem',  fontWeight: '400' }],
        'detail':  ['0.8125rem',{ lineHeight: '1.25rem', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1rem',    fontWeight: '500' }],
        'micro':   ['0.6875rem',{ lineHeight: '1rem',   fontWeight: '500' }],
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,0.3), 0 1px 2px -1px rgba(0,0,0,0.3)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.3)',
        'elevated': '0 8px 24px 0 rgba(0,0,0,0.45)',
        'glow-blue': '0 0 20px rgba(59,130,246,0.15)',
        'glow-coral': '0 0 20px rgba(255,111,97,0.15)',
        'glow-pink': '0 0 60px rgba(255,60,172,0.15)',
        'glow-brand': '0 0 40px rgba(255,60,172,0.12), 0 0 80px rgba(120,75,160,0.08)',
        'inner-light': 'inset 0 1px 0 0 rgba(255,255,255,0.04)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.25s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'marquee': 'marquee 35s linear infinite',
        'marquee-reverse': 'marquee-reverse 35s linear infinite',
        'gradient-shift': 'gradientShift 6s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'shimmer': 'shimmer 2.5s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'dash': 'dash 2s ease-in-out forwards',
        'hue-rotate': 'hueRotate 4s linear infinite',
        'bounce-slow': 'bounceSlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-8px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255,60,172,0.15)' },
          '50%': { boxShadow: '0 0 40px rgba(255,60,172,0.3)' },
        },
        dash: {
          to: { strokeDashoffset: '0' },
        },
        hueRotate: {
          '0%': { filter: 'hue-rotate(0deg)' },
          '100%': { filter: 'hue-rotate(360deg)' },
        },
        bounceSlow: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}
