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
          'radial-gradient(ellipse 120% 80% at 50% 0%, rgba(233, 30, 141, 0.08) 0%, rgba(248, 180, 217, 0.06) 30%, transparent 60%)',
        'gradient-card': 'linear-gradient(135deg, #FFD6EB 0%, #E8D4F0 100%)',
        'gradient-hero': 'linear-gradient(180deg, #FFFFFF 0%, #FFFBFC 50%, #FFF8FA 100%)',
        'gradient-pink-glow': 'radial-gradient(circle at center, rgba(233, 30, 141, 0.08) 0%, transparent 70%)',
        'gradient-page': 'radial-gradient(ellipse 150% 100% at 50% 0%, rgba(233, 30, 141, 0.06) 0%, rgba(248, 180, 217, 0.04) 40%, transparent 70%)',
      },
    },
  },
  plugins: [],
}
export default config
