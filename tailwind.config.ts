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
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-raised': 'rgb(var(--surface-raised) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        'fg-muted': 'rgb(var(--fg-muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-strong': 'rgb(var(--accent-strong) / <alpha-value>)',
        rule: 'rgb(var(--rule) / <alpha-value>)',
        fill: 'rgb(var(--fill) / <alpha-value>)',
        'fill-fg': 'rgb(var(--fill-fg) / <alpha-value>)',
        decor: 'rgb(var(--decor) / <alpha-value>)',
        // Sticky-note palette — see the note in globals.css.
        'note-1': 'rgb(var(--note-1) / <alpha-value>)',
        'note-2': 'rgb(var(--note-2) / <alpha-value>)',
        'note-3': 'rgb(var(--note-3) / <alpha-value>)',
        'note-4': 'rgb(var(--note-4) / <alpha-value>)',
        'note-5': 'rgb(var(--note-5) / <alpha-value>)',
        'note-6': 'rgb(var(--note-6) / <alpha-value>)',
        'note-ink': 'rgb(var(--note-ink) / <alpha-value>)',
        'book-1': 'rgb(var(--book-1) / <alpha-value>)',
        'book-2': 'rgb(var(--book-2) / <alpha-value>)',
        'book-3': 'rgb(var(--book-3) / <alpha-value>)',
        'book-4': 'rgb(var(--book-4) / <alpha-value>)',
        'book-5': 'rgb(var(--book-5) / <alpha-value>)',
        'book-6': 'rgb(var(--book-6) / <alpha-value>)',
        'book-foil': 'rgb(var(--book-foil) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        'card-ink': 'rgb(var(--card-ink) / <alpha-value>)',
        'card-rule': 'rgb(var(--card-rule) / <alpha-value>)',
        'card-margin': 'rgb(var(--card-margin) / <alpha-value>)',
        'card-error': 'rgb(var(--card-error) / <alpha-value>)',
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
        focus: 'rgb(var(--accent) / <alpha-value>)',
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
