import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: 'var(--brand-dark)',
          orange: 'var(--brand-orange)',
          yellowBtn: 'var(--brand-yellow-btn)',
          yellowBg: 'var(--brand-yellow-bg)',
          blueBg: 'var(--brand-blue-bg)',
          blueBtn: 'var(--brand-blue-btn)',
          light: 'var(--brand-light)',
          pink: 'var(--brand-pink)',
        },
      },
      fontFamily: {
        sans: ['var(--font-cy-grotesk)'],
        seasons: ['var(--font-seasons)'],
      },
      backgroundImage: {
        'gradient-radial':
          'linear-gradient(0deg, rgba(243, 244, 231, 0.10) 0%, rgba(243, 244, 231, 0.10) 100%), radial-gradient(109.9% 50% at 50% 50.09%, #FF7144 0%, #FFAFD8 33.33%, #F3F4E7 66.67%, #EDEDEB 100%)',
        'gradient-card': 'linear-gradient(353deg, #fff9a5, #f6cef8)',
      },
    },
  },
  plugins: [],
}
export default config
