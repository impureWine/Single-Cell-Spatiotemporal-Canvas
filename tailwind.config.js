// filepath: tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lab: {
          canvas: '#F8FAFC',
          panel: '#FFFFFF',
          line: '#E2E8F0',
          dot: '#CBD5E1',
          ink: '#222222',
          muted: '#64748B',
          blue: '#95BCE5',
          lavender: '#D4C5E2',
          pink: '#F39DA0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans CJK SC', 'Microsoft YaHei', 'sans-serif'],
      },
      boxShadow: {
        lab: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
      },
    },
  },
}
