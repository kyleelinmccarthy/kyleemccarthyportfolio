import type { Config } from 'tailwindcss'

/**
 * Single source of truth for design tokens at the Tailwind layer.
 * Raw palette = the brief's locked swatches (+ one derived dark-accent).
 * Semantic colors resolve per-theme via CSS variables set in globals.css,
 * so components reference `bg-surface`/`text-fg`/`text-accent` — never a raw hex.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './content/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Raw palette (locked) — use for fills/rules where contrast rules in §4 allow.
        blackberry: '#12121C',
        cream: '#E9D5BD',
        ink: '#14131B',
        terracotta: {
          700: '#771606',
          600: '#A62E1A',
          500: '#BF4D3A',
          300: '#D87F63', // derived — dark-mode accent TEXT (6.32:1 on blackberry)
        },
        // Semantic, theme-aware (resolved in globals.css)
        surface: 'var(--surface)',
        'surface-raised': 'var(--surface-raised)',
        fg: 'var(--fg)',
        'fg-muted': 'var(--fg-muted)',
        accent: 'var(--accent)',
        'accent-strong': 'var(--accent-strong)',
        rule: 'var(--rule)',
        fill: 'var(--fill)',
        'fill-fg': 'var(--fill-fg)',
      },
      fontFamily: {
        // Wired by next/font in app/layout.tsx -> CSS variables
        serif: ['var(--font-bentham)', 'Georgia', 'serif'],
        sans: ['var(--font-bellota)', 'system-ui', 'sans-serif'],
        gyg: ['var(--font-give-you-glory)', 'cursive'],
        sac: ['var(--font-sacramento)', 'cursive'],
      },
      fontSize: {
        // Fluid scale (clamp) — display via Bentham, body via Bellota
        label: ['0.8125rem', { lineHeight: '1.2', letterSpacing: '0.12em' }],
        'fluid-hero': ['clamp(2.75rem, 7vw, 6rem)', { lineHeight: '1.02' }],
        'fluid-h2': ['clamp(2rem, 4vw, 3.25rem)', { lineHeight: '1.08' }],
        'fluid-stat': ['clamp(2.25rem, 3.5vw, 3.25rem)', { lineHeight: '1' }],
        'fluid-quote': ['clamp(1.75rem, 4vw, 3rem)', { lineHeight: '1.25' }],
      },
      maxWidth: {
        prose: '68ch',
      },
      ringColor: {
        focus: 'var(--accent)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
    },
  },
  plugins: [],
}

export default config
