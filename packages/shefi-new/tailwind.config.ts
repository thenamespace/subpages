import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './src/contexts/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: 'var(--brand-dark)',
          accent: 'var(--brand-accent)',
          pinkBtn: 'var(--brand-pink-btn)',
          pinkBg: 'var(--brand-pink-bg)',
          roseBg: 'var(--brand-rose-bg)',
          lavender: 'var(--brand-lavender)',
          light: 'var(--brand-light)',
          pink: 'var(--brand-pink)',
          roseGold: 'var(--brand-rose-gold)',
          // Legacy aliases
          orange: 'var(--brand-accent)',
          yellowBtn: 'var(--brand-pink-btn)',
          yellowBg: 'var(--brand-pink-bg)',
          blueBg: 'var(--brand-lavender)',
          blueBtn: 'var(--brand-lavender)',
        },
      },
      fontFamily: {
        sans: ['var(--font-cy-grotesk)'],
        seasons: ['var(--font-seasons)'],
      },
      backgroundImage: {
        'gradient-radial':
          'linear-gradient(0deg, rgba(255, 248, 250, 0.15) 0%, rgba(255, 248, 250, 0.15) 100%), radial-gradient(150% 80% at 50% 30%, #E91E8D 0%, #FFB5D8 20%, #F8B4D9 40%, #E8D4F0 60%, #FFF8FA 100%)',
        'gradient-card': 'linear-gradient(135deg, #FFD6EB 0%, #E8D4F0 100%)',
        'gradient-hero': 'linear-gradient(180deg, #FFF0F5 0%, #FFE4F0 50%, #F8D4E8 100%)',
        'gradient-pink-glow': 'radial-gradient(circle at center, rgba(233, 30, 141, 0.15) 0%, transparent 70%)',
        'gradient-page': 'radial-gradient(ellipse 150% 100% at 50% 0%, rgba(233, 30, 141, 0.12) 0%, rgba(248, 180, 217, 0.15) 30%, rgba(232, 212, 240, 0.1) 60%, transparent 100%)',
      },
    },
  },
  plugins: [],
}
export default config
